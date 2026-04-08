use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use crate::models::{FlashKeyMapping, FlashGameConfig, LeftStickMode};

/// Handle to a running gamepad→keyboard relay. Drop or call `stop()` to end it.
pub struct FlashInputRelay {
    running: Arc<AtomicBool>,
}

impl FlashInputRelay {
    pub fn stop(&self) {
        self.running.store(false, Ordering::Relaxed);
    }
}

impl Drop for FlashInputRelay {
    fn drop(&mut self) {
        self.stop();
    }
}

/// Start a background thread that polls XInput gamepads and sends virtual
/// keyboard events (buttons + sticks) and mouse input according to config.
pub fn start_relay(mappings: Vec<FlashKeyMapping>, config: FlashGameConfig) -> FlashInputRelay {
    let running = Arc::new(AtomicBool::new(true));
    let running_clone = running.clone();

    // Build a lookup: gamepad_button → virtual key code
    let button_to_vk: HashMap<u16, u16> = mappings
        .iter()
        .filter_map(|m| {
            let vk = key_name_to_vk(&m.keyboard_key)?;
            Some((m.gamepad_button as u16, vk))
        })
        .collect();

    std::thread::spawn(move || {
        relay_loop(running_clone, button_to_vk, config);
    });

    FlashInputRelay { running }
}

// ── Platform-specific implementation ──────────────────────────────────

#[cfg(windows)]
fn relay_loop(running: Arc<AtomicBool>, button_to_vk: HashMap<u16, u16>, config: FlashGameConfig) {
    use winapi::um::xinput::{XInputGetState, XINPUT_STATE, XINPUT_GAMEPAD_DPAD_UP,
        XINPUT_GAMEPAD_DPAD_DOWN, XINPUT_GAMEPAD_DPAD_LEFT, XINPUT_GAMEPAD_DPAD_RIGHT,
        XINPUT_GAMEPAD_START, XINPUT_GAMEPAD_BACK, XINPUT_GAMEPAD_LEFT_THUMB,
        XINPUT_GAMEPAD_RIGHT_THUMB, XINPUT_GAMEPAD_LEFT_SHOULDER, XINPUT_GAMEPAD_RIGHT_SHOULDER,
        XINPUT_GAMEPAD_A, XINPUT_GAMEPAD_B, XINPUT_GAMEPAD_X, XINPUT_GAMEPAD_Y};

    const STICK_DEADZONE: i16 = 7849;

    // Map standard gamepad button index → XInput bitmask
    let idx_to_mask: [(u16, u16); 16] = [
        (0,  XINPUT_GAMEPAD_A),
        (1,  XINPUT_GAMEPAD_B),
        (2,  XINPUT_GAMEPAD_X),
        (3,  XINPUT_GAMEPAD_Y),
        (4,  XINPUT_GAMEPAD_LEFT_SHOULDER),
        (5,  XINPUT_GAMEPAD_RIGHT_SHOULDER),
        (6,  0x0400), // LT as digital
        (7,  0x0800), // RT as digital
        (8,  XINPUT_GAMEPAD_BACK),
        (9,  XINPUT_GAMEPAD_START),
        (10, XINPUT_GAMEPAD_LEFT_THUMB),
        (11, XINPUT_GAMEPAD_RIGHT_THUMB),
        (12, XINPUT_GAMEPAD_DPAD_UP),
        (13, XINPUT_GAMEPAD_DPAD_DOWN),
        (14, XINPUT_GAMEPAD_DPAD_LEFT),
        (15, XINPUT_GAMEPAD_DPAD_RIGHT),
    ];

    // Left stick VK codes depending on mode
    let left_stick_vks: Option<[u16; 4]> = match config.left_stick_mode {
        LeftStickMode::Wasd   => Some([0x57, 0x53, 0x41, 0x44]), // W, S, A, D
        LeftStickMode::Arrows => Some([0x26, 0x28, 0x25, 0x27]), // Up, Down, Left, Right
        LeftStickMode::Disabled => None,
    };

    // Mouse sensitivity: map 1-100 → pixels per tick (1-20)
    let mouse_speed = ((config.mouse_sensitivity as f32 / 100.0) * 20.0).max(1.0) as i32;

    let mut prev_buttons: u16 = 0;
    let mut prev_lt_pressed = false;
    let mut prev_rt_pressed = false;

    // Left stick previous directional states: [up, down, left, right]
    let mut prev_lstick = [false; 4];
    // Right stick mouse: previous R3 state (for right-click)
    let mut prev_r3 = false;

    log::info!(
        "Flash input relay started ({} btn mappings, left_stick={}, right_mouse={}, sensitivity={})",
        button_to_vk.len(),
        config.left_stick_mode.as_str(),
        config.right_stick_mouse,
        config.mouse_sensitivity,
    );

    while running.load(Ordering::Relaxed) {
        let mut state: XINPUT_STATE = unsafe { std::mem::zeroed() };
        let result = unsafe { XInputGetState(0, &mut state) };
        if result != 0 {
            std::thread::sleep(std::time::Duration::from_millis(100));
            continue;
        }

        let buttons = state.Gamepad.wButtons;
        let lt_pressed = state.Gamepad.bLeftTrigger > 128;
        let rt_pressed = state.Gamepad.bRightTrigger > 128;

        // ── 1. Digital buttons ───────────────────────────────────────
        for &(idx, mask) in &idx_to_mask {
            // Skip R3 (11) if right stick mouse is on — it's used for right-click
            if idx == 11 && config.right_stick_mouse {
                continue;
            }

            let vk = match button_to_vk.get(&idx) {
                Some(&vk) => vk,
                None => continue,
            };

            if idx == 6 {
                if lt_pressed && !prev_lt_pressed { send_key(vk, false); }
                else if !lt_pressed && prev_lt_pressed { send_key(vk, true); }
                continue;
            }
            if idx == 7 {
                if rt_pressed && !prev_rt_pressed { send_key(vk, false); }
                else if !rt_pressed && prev_rt_pressed { send_key(vk, true); }
                continue;
            }

            let now_pressed = (buttons & mask) != 0;
            let was_pressed = (prev_buttons & mask) != 0;

            if now_pressed && !was_pressed { send_key(vk, false); }
            else if !now_pressed && was_pressed { send_key(vk, true); }
        }

        // ── 2. Left stick → keyboard ────────────────────────────────
        if let Some(vks) = left_stick_vks {
            let lx = state.Gamepad.sThumbLX;
            let ly = state.Gamepad.sThumbLY;

            let dirs = [
                ly > STICK_DEADZONE,     // up
                ly < -STICK_DEADZONE,    // down
                lx < -STICK_DEADZONE,    // left
                lx > STICK_DEADZONE,     // right
            ];

            for i in 0..4 {
                if dirs[i] && !prev_lstick[i] { send_key(vks[i], false); }
                else if !dirs[i] && prev_lstick[i] { send_key(vks[i], true); }
            }
            prev_lstick = dirs;
        }

        // ── 3. Right stick → mouse cursor ───────────────────────────
        if config.right_stick_mouse {
            let rx = state.Gamepad.sThumbRX;
            let ry = state.Gamepad.sThumbRY;

            let dx = apply_deadzone(rx, STICK_DEADZONE, mouse_speed);
            let dy = -apply_deadzone(ry, STICK_DEADZONE, mouse_speed); // invert Y

            if dx != 0 || dy != 0 {
                send_mouse_move(dx, dy);
            }

            // R3 → left-click
            let r3_now = (buttons & XINPUT_GAMEPAD_RIGHT_THUMB) != 0;
            if r3_now && !prev_r3 { send_mouse_click(false, false); }
            else if !r3_now && prev_r3 { send_mouse_click(false, true); }
            prev_r3 = r3_now;
        }

        prev_buttons = buttons;
        prev_lt_pressed = lt_pressed;
        prev_rt_pressed = rt_pressed;

        std::thread::sleep(std::time::Duration::from_millis(8)); // ~120 Hz
    }

    // Release any held keys
    for &vk in button_to_vk.values() {
        send_key(vk, true);
    }
    if let Some(vks) = left_stick_vks {
        for &vk in &vks {
            send_key(vk, true);
        }
    }

    log::info!("Flash input relay stopped");
}

/// Map analog axis value to pixel delta, applying deadzone and scaling.
fn apply_deadzone(value: i16, deadzone: i16, max_speed: i32) -> i32 {
    let v = value as i32;
    let dz = deadzone as i32;
    if v.abs() < dz {
        return 0;
    }
    let range = 32767 - dz;
    let magnitude = (v.abs() - dz) as f32 / range as f32;
    let sign = if v > 0 { 1 } else { -1 };
    // Quadratic curve for fine/coarse control
    (sign as f32 * magnitude * magnitude * max_speed as f32) as i32
}

#[cfg(windows)]
fn send_key(vk: u16, key_up: bool) {
    use winapi::um::winuser::{SendInput, INPUT, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, MapVirtualKeyW, MAPVK_VK_TO_VSC};

    let scan = unsafe { MapVirtualKeyW(vk as u32, MAPVK_VK_TO_VSC) } as u16;
    let mut input: INPUT = unsafe { std::mem::zeroed() };
    input.type_ = INPUT_KEYBOARD;
    unsafe {
        let ki = input.u.ki_mut();
        *ki = KEYBDINPUT {
            wVk: vk,
            wScan: scan,
            dwFlags: if key_up { KEYEVENTF_KEYUP } else { 0 },
            time: 0,
            dwExtraInfo: 0,
        };
        SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
    }
}

#[cfg(windows)]
fn send_mouse_move(dx: i32, dy: i32) {
    use winapi::um::winuser::{SendInput, INPUT, INPUT_MOUSE, MOUSEINPUT, MOUSEEVENTF_MOVE};

    let mut input: INPUT = unsafe { std::mem::zeroed() };
    input.type_ = INPUT_MOUSE;
    unsafe {
        let mi = input.u.mi_mut();
        *mi = MOUSEINPUT {
            dx,
            dy,
            mouseData: 0,
            dwFlags: MOUSEEVENTF_MOVE,
            time: 0,
            dwExtraInfo: 0,
        };
        SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
    }
}

#[cfg(windows)]
fn send_mouse_click(right_button: bool, up: bool) {
    use winapi::um::winuser::{SendInput, INPUT, INPUT_MOUSE, MOUSEINPUT,
        MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP,
        MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP};

    let flags = if right_button {
        if up { MOUSEEVENTF_RIGHTUP } else { MOUSEEVENTF_RIGHTDOWN }
    } else {
        if up { MOUSEEVENTF_LEFTUP } else { MOUSEEVENTF_LEFTDOWN }
    };

    let mut input: INPUT = unsafe { std::mem::zeroed() };
    input.type_ = INPUT_MOUSE;
    unsafe {
        let mi = input.u.mi_mut();
        *mi = MOUSEINPUT {
            dx: 0,
            dy: 0,
            mouseData: 0,
            dwFlags: flags,
            time: 0,
            dwExtraInfo: 0,
        };
        SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
    }
}

#[cfg(not(windows))]
fn relay_loop(running: Arc<AtomicBool>, _button_to_vk: HashMap<u16, u16>, _config: FlashGameConfig) {
    log::warn!("Flash gamepad→keyboard relay is only supported on Windows");
    while running.load(Ordering::Relaxed) {
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
}

#[cfg(not(windows))]
fn send_key(_vk: u16, _key_up: bool) {}

#[cfg(not(windows))]
fn send_mouse_move(_dx: i32, _dy: i32) {}

#[cfg(not(windows))]
fn send_mouse_click(_right_button: bool, _up: bool) {}

// ── Key name → VK code mapping ───────────────────────────────────────

fn key_name_to_vk(name: &str) -> Option<u16> {
    Some(match name {
        "ArrowUp"    => 0x26,
        "ArrowDown"  => 0x28,
        "ArrowLeft"  => 0x25,
        "ArrowRight" => 0x27,
        "Enter"      => 0x0D,
        "Escape"     => 0x1B,
        "Space"      => 0x20,
        "Tab"        => 0x09,
        "Backspace"  => 0x08,
        "Shift"      => 0xA0,
        "Control"    => 0xA2,
        "Alt"        => 0xA4,

        s if s.len() == 1 && s.as_bytes()[0].is_ascii_lowercase() => {
            (s.as_bytes()[0] - b'a' + 0x41) as u16
        }
        s if s.len() == 1 && s.as_bytes()[0].is_ascii_digit() => {
            s.as_bytes()[0] as u16
        }

        _ => {
            log::warn!("Unknown key name for VK mapping: '{}'", name);
            return None;
        }
    })
}
