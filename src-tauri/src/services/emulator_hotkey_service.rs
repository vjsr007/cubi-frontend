use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// Monitors the gamepad for Select+Start combo and kills the emulator process.
/// Works for ALL emulators, not just Flash.
pub struct EmulatorHotkeyMonitor {
    running: Arc<AtomicBool>,
}

impl EmulatorHotkeyMonitor {
    pub fn stop(&self) {
        self.running.store(false, Ordering::Relaxed);
    }
}

impl Drop for EmulatorHotkeyMonitor {
    fn drop(&mut self) {
        self.stop();
    }
}

/// Start monitoring gamepad for Select+Start held simultaneously.
/// When detected (~0.5s hold), kills all processes matching `process_name`.
pub fn start_monitor(process_name: String) -> EmulatorHotkeyMonitor {
    let running = Arc::new(AtomicBool::new(true));
    let running_clone = running.clone();

    std::thread::spawn(move || {
        hotkey_loop(running_clone, &process_name);
    });

    EmulatorHotkeyMonitor { running }
}

#[cfg(windows)]
fn hotkey_loop(running: Arc<AtomicBool>, process_name: &str) {
    use winapi::um::xinput::{XInputGetState, XINPUT_STATE, XINPUT_GAMEPAD_START, XINPUT_GAMEPAD_BACK};

    const HOLD_FRAMES: u32 = 60; // ~0.5s at 120Hz polling

    let mut combo_held = 0u32;

    log::info!("Emulator hotkey monitor started for '{}'  (Select+Start to close)", process_name);

    while running.load(Ordering::Relaxed) {
        let mut state: XINPUT_STATE = unsafe { std::mem::zeroed() };
        let result = unsafe { XInputGetState(0, &mut state) };

        if result == 0 {
            let buttons = state.Gamepad.wButtons;
            let select_held = (buttons & XINPUT_GAMEPAD_BACK) != 0;
            let start_held = (buttons & XINPUT_GAMEPAD_START) != 0;

            if select_held && start_held {
                combo_held += 1;
                if combo_held >= HOLD_FRAMES {
                    log::info!("Select+Start detected — killing '{}'", process_name);
                    kill_process(process_name);
                    break;
                }
            } else {
                combo_held = 0;
            }
        }

        std::thread::sleep(std::time::Duration::from_millis(8));
    }

    log::info!("Emulator hotkey monitor stopped");
}

#[cfg(windows)]
fn kill_process(name: &str) {
    // Try taskkill with the exact name and common variations
    let variants = [
        name.to_string(),
        format!("{}.exe", name),
    ];

    for variant in &variants {
        let result = std::process::Command::new("taskkill")
            .args(["/IM", variant, "/F"])
            .output();

        match result {
            Ok(output) if output.status.success() => {
                log::info!("Successfully killed process '{}'", variant);
                return;
            }
            _ => continue,
        }
    }

    // Fallback: taskkill with wildcard via WMIC
    let _ = std::process::Command::new("cmd")
        .args(["/C", &format!("taskkill /F /FI \"IMAGENAME eq {}*\"", name)])
        .output();
}

#[cfg(not(windows))]
fn hotkey_loop(running: Arc<AtomicBool>, _process_name: &str) {
    log::warn!("Emulator hotkey monitor is only supported on Windows");
    while running.load(Ordering::Relaxed) {
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
}
