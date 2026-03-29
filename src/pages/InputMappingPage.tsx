import { useState, useEffect, useCallback, useRef } from 'react';
import { useUiStore } from '../stores/uiStore';
import { useLibraryStore } from '../stores/libraryStore';
import { api } from '../lib/invoke';
import type { InputProfile, ButtonBinding, ActionInfo, SystemProfileAssignment, SystemInfo } from '../types';

// ── Styles ────────────────────────────────────────────────────────────

const btnStyle: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  color: 'var(--color-text)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const btnPrimary: React.CSSProperties = {
  ...btnStyle,
  background: 'var(--color-primary, #3b82f6)',
  borderColor: 'var(--color-primary, #3b82f6)',
  color: '#fff',
  fontWeight: 600,
};

const btnDanger: React.CSSProperties = {
  ...btnStyle,
  background: '#dc2626',
  borderColor: '#dc2626',
  color: '#fff',
};

const selectStyle: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--color-text)',
  outline: 'none',
  minWidth: 200,
};

const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  color: 'var(--color-text)',
  outline: 'none',
};

const BUTTON_LABELS: Record<number, string> = {
  0: 'A / Cross',
  1: 'B / Circle',
  2: 'X / Square',
  3: 'Y / Triangle',
  4: 'LB / L1',
  5: 'RB / R1',
  6: 'LT / L2',
  7: 'RT / R2',
  8: 'Select / Back',
  9: 'Start',
  10: 'L3',
  11: 'R3',
  12: 'D-Pad Up',
  13: 'D-Pad Down',
  14: 'D-Pad Left',
  15: 'D-Pad Right',
  16: 'Home / Guide',
};

const ACTION_LABELS: Record<string, string> = {
  // UI actions
  ui_confirm: '✓ Confirm',
  ui_back: '← Back',
  ui_up: '↑ Up',
  ui_down: '↓ Down',
  ui_left: '← Left',
  ui_right: '→ Right',
  ui_menu: '☰ Menu',
  ui_search: '🔍 Search',
  ui_tab_left: '◀ Tab Left',
  ui_tab_right: '▶ Tab Right',
  ui_page_up: '⇑ Page Up',
  ui_page_down: '⇓ Page Down',
  // Game actions
  game_a: 'A Button',
  game_b: 'B Button',
  game_x: 'X Button',
  game_y: 'Y Button',
  game_l1: 'L1 / LB',
  game_r1: 'R1 / RB',
  game_l2: 'L2 / LT',
  game_r2: 'R2 / RT',
  game_l3: 'L3',
  game_r3: 'R3',
  game_start: 'Start',
  game_select: 'Select',
  game_dpad_up: 'D-Pad Up',
  game_dpad_down: 'D-Pad Down',
  game_dpad_left: 'D-Pad Left',
  game_dpad_right: 'D-Pad Right',
  // Hotkey actions
  hotkey_menu: 'Hotkey: Menu',
  hotkey_save_state: 'Hotkey: Save State',
  hotkey_load_state: 'Hotkey: Load State',
  hotkey_fast_forward: 'Hotkey: Fast Forward',
  hotkey_screenshot: 'Hotkey: Screenshot',
};

const CATEGORY_LABELS: Record<string, string> = {
  UI: '🖥️ UI Navigation',
  Game: '🎮 In-Game Buttons',
  Hotkey: '⚡ Hotkey Combos',
};

const CATEGORY_ORDER = ['UI', 'Game', 'Hotkey'];

const EMULATORS_EXPORT = [
  { name: 'RetroArch', id: 'retroarch' },
  { name: 'Dolphin', id: 'dolphin' },
  { name: 'PCSX2', id: 'pcsx2' },
  { name: 'DuckStation', id: 'duckstation' },
  { name: 'Generic JSON', id: 'generic' },
];

// ── Button Capture Modal ──────────────────────────────────────────────

function ButtonCaptureModal({
  action,
  onCapture,
  onCancel,
}: {
  action: string;
  onCapture: (buttonIndex: number) => void;
  onCancel: () => void;
}) {
  const rafRef = useRef<number>(0);
  const capturedRef = useRef(false);

  useEffect(() => {
    capturedRef.current = false;

    function poll() {
      if (capturedRef.current) return;
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (!gp) continue;
        for (let i = 0; i < gp.buttons.length; i++) {
          if (gp.buttons[i].pressed) {
            capturedRef.current = true;
            onCapture(i);
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(poll);
    }
    rafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onCapture]);

  // Also listen for keyboard Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--color-surface, #1a1a2e)',
          border: '2px solid var(--color-primary, #3b82f6)',
          borderRadius: 16,
          padding: '40px 48px',
          textAlign: 'center',
          maxWidth: 420,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
        <h2 style={{ color: 'var(--color-text)', margin: '0 0 8px', fontSize: 20 }}>
          Press a Button
        </h2>
        <p style={{ color: 'var(--color-text-secondary, #888)', fontSize: 14, margin: '0 0 24px' }}>
          Mapping: <strong style={{ color: 'var(--color-primary, #3b82f6)' }}>{ACTION_LABELS[action] || action}</strong>
        </p>
        <p style={{ color: '#666', fontSize: 12 }}>
          Press any gamepad button to assign it, or press <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: 4 }}>Esc</kbd> to cancel
        </p>
        <div
          style={{
            marginTop: 16,
            width: 40,
            height: 40,
            border: '3px solid var(--color-primary, #3b82f6)',
            borderRadius: '50%',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
            margin: '16px auto 0',
          }}
        />
      </div>
    </div>
  );
}

// ── Create Profile Modal ──────────────────────────────────────────────

function CreateProfileModal({
  profiles,
  onCreateProfile,
  onClose,
}: {
  profiles: InputProfile[];
  onCreateProfile: (name: string, controllerType: string, baseProfileId?: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [controllerType, setControllerType] = useState('Xbox');
  const [baseProfileId, setBaseProfileId] = useState('');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface, #1a1a2e)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 32,
          minWidth: 380,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: 'var(--color-text)', margin: '0 0 20px', fontSize: 18 }}>
          Create New Profile
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ color: 'var(--color-text-secondary, #aaa)', fontSize: 12, fontWeight: 600 }}>
            PROFILE NAME
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Custom Profile"
            style={inputStyle}
            autoFocus
          />
          <label style={{ color: 'var(--color-text-secondary, #aaa)', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
            CONTROLLER TYPE
          </label>
          <select
            value={controllerType}
            onChange={(e) => setControllerType(e.target.value)}
            style={selectStyle}
          >
            <option value="Xbox">Xbox</option>
            <option value="PlayStation">PlayStation</option>
            <option value="Nintendo">Nintendo</option>
            <option value="Custom">Custom</option>
          </select>
          <label style={{ color: 'var(--color-text-secondary, #aaa)', fontSize: 12, fontWeight: 600, marginTop: 8 }}>
            COPY BINDINGS FROM (optional)
          </label>
          <select
            value={baseProfileId}
            onChange={(e) => setBaseProfileId(e.target.value)}
            style={selectStyle}
          >
            <option value="">— Start from defaults —</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.controller_type})
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
          <button style={btnStyle} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{ ...btnPrimary, opacity: name.trim() ? 1 : 0.5 }}
            disabled={!name.trim()}
            onClick={() => {
              onCreateProfile(name.trim(), controllerType, baseProfileId || undefined);
              onClose();
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Export Preview Modal ──────────────────────────────────────────────

function ExportPreviewModal({
  emulatorName,
  content,
  onClose,
}: {
  emulatorName: string;
  content: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface, #1a1a2e)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 24,
          minWidth: 500,
          maxWidth: 700,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: 'var(--color-text)', margin: '0 0 12px', fontSize: 16 }}>
          Export: {emulatorName}
        </h3>
        <pre
          style={{
            background: '#0a0a0a',
            border: '1px solid #333',
            borderRadius: 8,
            padding: 16,
            fontSize: 12,
            color: '#8f8',
            overflowY: 'auto',
            flex: 1,
            fontFamily: 'Consolas, monospace',
            whiteSpace: 'pre-wrap',
            margin: 0,
          }}
        >
          {content}
        </pre>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button
            style={btnStyle}
            onClick={() => {
              navigator.clipboard.writeText(content);
            }}
          >
            📋 Copy
          </button>
          <button style={btnPrimary} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export function InputMappingPage() {
  const { showToast, navigateTo } = useUiStore();
  const { systems } = useLibraryStore();

  // ── State ────
  const [profiles, setProfiles] = useState<InputProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [bindings, setBindings] = useState<ButtonBinding[]>([]);
  const [actions, setActions] = useState<ActionInfo[]>([]);
  const [assignments, setAssignments] = useState<SystemProfileAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [captureAction, setCaptureAction] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [exportPreview, setExportPreview] = useState<{ emulator: string; content: string } | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState('UI');

  // ── Load data ────
  const loadProfiles = useCallback(async () => {
    try {
      const [profs, acts] = await Promise.all([api.getInputProfiles(), api.getAllActions()]);
      setProfiles(profs);
      setActions(acts);
      if (profs.length > 0 && (!selectedProfileId || !profs.find((p) => p.id === selectedProfileId))) {
        setSelectedProfileId(profs[0].id);
      }
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId, showToast]);

  const loadBindings = useCallback(async () => {
    if (!selectedProfileId) return;
    try {
      const b = await api.getProfileBindings(selectedProfileId);
      setBindings(b);
    } catch (e) {
      showToast(String(e), 'error');
    }
  }, [selectedProfileId, showToast]);

  const loadAssignments = useCallback(async () => {
    try {
      const a = await api.getSystemProfileAssignments();
      setAssignments(a);
    } catch (e) {
      showToast(String(e), 'error');
    }
  }, [showToast]);

  useEffect(() => {
    loadProfiles();
    loadAssignments();
  }, []);

  useEffect(() => {
    loadBindings();
  }, [selectedProfileId]);

  // ── Handlers ────
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  const handleCapture = useCallback(
    async (buttonIndex: number) => {
      if (!captureAction || !selectedProfileId) return;
      try {
        await api.setBinding(selectedProfileId, captureAction, buttonIndex);
        await loadBindings();
        showToast(`Mapped ${ACTION_LABELS[captureAction] || captureAction} → ${BUTTON_LABELS[buttonIndex] || `Button ${buttonIndex}`}`, 'success');
      } catch (e) {
        showToast(String(e), 'error');
      }
      setCaptureAction(null);
    },
    [captureAction, selectedProfileId, loadBindings, showToast],
  );

  const handleCreateProfile = async (name: string, controllerType: string, baseProfileId?: string) => {
    try {
      const p = await api.createInputProfile(name, controllerType, baseProfileId);
      await loadProfiles();
      setSelectedProfileId(p.id);
      showToast(`Profile "${name}" created`, 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedProfile || selectedProfile.is_builtin) return;
    try {
      await api.deleteInputProfile(selectedProfileId);
      setSelectedProfileId('');
      await loadProfiles();
      showToast('Profile deleted', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleResetBindings = async () => {
    if (!selectedProfileId) return;
    try {
      await api.resetProfileBindings(selectedProfileId);
      await loadBindings();
      showToast('Bindings reset to defaults', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleExport = async (emulatorId: string, emulatorName: string) => {
    if (!selectedProfileId) return;
    try {
      const content = await api.exportProfileForEmulator(selectedProfileId, emulatorId);
      setExportPreview({ emulator: emulatorName, content });
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  const handleAssignment = async (systemId: string, profileId: string) => {
    try {
      if (profileId) {
        await api.setSystemProfileAssignment(systemId, profileId);
      } else {
        await api.deleteSystemProfileAssignment(systemId);
      }
      await loadAssignments();
      showToast('Assignment updated', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  };

  // ── Categorized actions ────
  const actionsByCategory: Record<string, ActionInfo[]> = {};
  for (const a of actions) {
    if (!actionsByCategory[a.category]) actionsByCategory[a.category] = [];
    actionsByCategory[a.category].push(a);
  }

  const bindingMap = new Map<string, ButtonBinding>();
  for (const b of bindings) {
    bindingMap.set(b.action, b);
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#666' }}>Loading input profiles…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg, #0d0d0d)',
        color: 'var(--color-text, #eee)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--color-border, #333)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <button style={btnStyle} onClick={() => navigateTo('settings')}>
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🎮 Input Mapping</h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* ── Profile Selector ── */}
        <section
          style={{
            background: 'var(--color-surface, #1a1a2e)',
            border: '1px solid var(--color-border, #333)',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Controller Profiles</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              style={selectStyle}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.controller_type}){p.is_builtin ? ' [built-in]' : ''}
                </option>
              ))}
            </select>
            <button style={btnPrimary} onClick={() => setShowCreateModal(true)}>
              + New Profile
            </button>
            {selectedProfile && !selectedProfile.is_builtin && (
              <button style={btnDanger} onClick={handleDeleteProfile}>
                Delete
              </button>
            )}
            <button style={btnStyle} onClick={handleResetBindings}>
              ↺ Reset to Defaults
            </button>
          </div>
          {selectedProfile && (
            <div style={{ marginTop: 12, color: 'var(--color-text-secondary, #888)', fontSize: 12 }}>
              Type: <strong>{selectedProfile.controller_type}</strong> · 
              {selectedProfile.is_builtin ? ' Built-in profile (create a copy to customize)' : ' Custom profile'} · 
              Bindings: {bindings.length}
            </div>
          )}
        </section>

        {/* ── Binding Table ── */}
        <section
          style={{
            background: 'var(--color-surface, #1a1a2e)',
            border: '1px solid var(--color-border, #333)',
            borderRadius: 12,
            padding: 20,
            flex: 1,
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Button Bindings</h2>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {CATEGORY_ORDER.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                style={{
                  ...btnStyle,
                  background: activeTab === cat ? 'var(--color-primary, #3b82f6)' : 'var(--color-surface-2)',
                  color: activeTab === cat ? '#fff' : 'var(--color-text)',
                  fontWeight: activeTab === cat ? 700 : 400,
                  borderColor: activeTab === cat ? 'var(--color-primary, #3b82f6)' : 'var(--color-border)',
                  borderRadius: 8,
                  padding: '8px 18px',
                }}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>

          {/* Binding rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 160px 100px',
                padding: '8px 12px',
                color: 'var(--color-text-secondary, #888)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid var(--color-border, #333)',
              }}
            >
              <span>Action</span>
              <span>Current Button</span>
              <span>Remap</span>
            </div>

            {(actionsByCategory[activeTab] ?? []).map((action) => {
              const binding = bindingMap.get(action.name);
              return (
                <div
                  key={action.name}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 160px 100px',
                    padding: '10px 12px',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 13 }}>
                    {ACTION_LABELS[action.name] || action.name}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: binding ? 'var(--color-primary, #3b82f6)' : '#555',
                      fontWeight: binding ? 600 : 400,
                    }}
                  >
                    {binding ? (BUTTON_LABELS[binding.button_index] || `Button ${binding.button_index}`) : '—'}
                  </span>
                  <button
                    style={{
                      ...btnStyle,
                      padding: '4px 12px',
                      fontSize: 12,
                      borderRadius: 6,
                    }}
                    onClick={() => setCaptureAction(action.name)}
                  >
                    Map
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Per-System Assignments ── */}
        <section
          style={{
            background: 'var(--color-surface, #1a1a2e)',
            border: '1px solid var(--color-border, #333)',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>System Profile Assignments</h2>
          <p style={{ color: 'var(--color-text-secondary, #888)', fontSize: 12, margin: '0 0 16px' }}>
            Override the default profile for specific systems. Unassigned systems use the first profile.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 250px',
                padding: '8px 12px',
                color: 'var(--color-text-secondary, #888)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid var(--color-border, #333)',
              }}
            >
              <span>System</span>
              <span>Profile</span>
            </div>
            {(systems as SystemInfo[]).map((sys) => {
              const assigned = assignments.find((a) => a.system_id === sys.id);
              return (
                <div
                  key={sys.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 250px',
                    padding: '8px 12px',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{sys.name}</span>
                  <select
                    value={assigned?.profile_id || ''}
                    onChange={(e) => handleAssignment(sys.id, e.target.value)}
                    style={{ ...selectStyle, minWidth: 0 }}
                  >
                    <option value="">— Default —</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
            {systems.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: '#555', fontSize: 13 }}>
                No systems found. Scan your library first.
              </div>
            )}
          </div>
        </section>

        {/* ── Export ── */}
        <section
          style={{
            background: 'var(--color-surface, #1a1a2e)',
            border: '1px solid var(--color-border, #333)',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>Export to Emulator</h2>
          <p style={{ color: 'var(--color-text-secondary, #888)', fontSize: 12, margin: '0 0 16px' }}>
            Generate a configuration file for the selected profile in emulator-native format.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {EMULATORS_EXPORT.map((emu) => (
              <button
                key={emu.id}
                style={{ ...btnStyle, padding: '8px 16px' }}
                onClick={() => handleExport(emu.id, emu.name)}
                disabled={!selectedProfileId}
              >
                📄 {emu.name}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ── Modals ── */}
      {captureAction && (
        <ButtonCaptureModal
          action={captureAction}
          onCapture={handleCapture}
          onCancel={() => setCaptureAction(null)}
        />
      )}
      {showCreateModal && (
        <CreateProfileModal
          profiles={profiles}
          onCreateProfile={handleCreateProfile}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      {exportPreview && (
        <ExportPreviewModal
          emulatorName={exportPreview.emulator}
          content={exportPreview.content}
          onClose={() => setExportPreview(null)}
        />
      )}

      {/* Spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
