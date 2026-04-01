import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/invoke';
import type { SystemWiki } from '../../types';
import { SystemLogo } from '../common/SystemLogo';
import { SYSTEM_LOGOS } from '../../assets/system-logos';

interface Props {
  systemId: string;
  systemName: string;
  onClose: () => void;
}

const GENERATION_NAMES: Record<number, string> = {
  1: '1st Generation',
  2: '2nd Generation',
  3: '3rd Generation (8-bit)',
  4: '4th Generation (16-bit)',
  5: '5th Generation (32/64-bit)',
  6: '6th Generation (128-bit)',
  7: '7th Generation',
  8: '8th/9th Generation',
};

const fieldLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
  color: 'var(--color-text-muted)', marginBottom: 2,
};
const fieldValue: React.CSSProperties = {
  fontSize: 13, color: 'var(--color-text)', marginBottom: 12,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, marginBottom: 12, paddingBottom: 6,
  borderBottom: '1px solid var(--color-border)',
};
const specRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '120px 1fr',
  gap: 4, padding: '4px 0', fontSize: 13,
};
const specLabel: React.CSSProperties = {
  fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 12,
};

export function SystemWikiPanel({ systemId, systemName, onClose }: Props) {
  const [wiki, setWiki] = useState<SystemWiki | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<SystemWiki | null>(null);
  const [saving, setSaving] = useState(false);

  const loadWiki = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSystemWiki(systemId);
      setWiki(data);
    } catch (e) {
      console.error('Failed to load system wiki:', e);
    } finally {
      setLoading(false);
    }
  }, [systemId]);

  useEffect(() => { loadWiki(); }, [loadWiki]);

  const handleEdit = () => {
    setEditData(wiki ? { ...wiki } : {
      system_id: systemId, manufacturer: '', media_type: '', cpu: '', memory: '',
      graphics: '', sound: '', display: '', units_sold: '', launch_price: '',
      description: '', wikipedia_url: '', image_url: '', notable_games: '', emulators: '',
    } as SystemWiki);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      await api.updateSystemWiki(editData);
      setWiki(editData);
      setEditing(false);
    } catch (e) {
      console.error('Failed to save wiki:', e);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof SystemWiki, value: string | number | undefined) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
  };

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading system info...
      </div>
    );
  }

  // ── Edit Mode ──────────────────────────────────────────────────
  if (editing && editData) {
    return (
      <div style={{ padding: 24, overflowY: 'auto', maxHeight: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Edit: {systemName}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setEditing(false)}
              style={{
                padding: '6px 16px', borderRadius: 6, border: '1px solid var(--color-border)',
                background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontSize: 13,
              }}
            >Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none',
                background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontSize: 13,
                opacity: saving ? 0.6 : 1,
              }}
            >{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <EditField label="Manufacturer" value={editData.manufacturer} onChange={v => updateField('manufacturer', v)} />
          <EditField label="Media Type" value={editData.media_type} onChange={v => updateField('media_type', v)} />
          <EditField label="Release Year" value={String(editData.release_year ?? '')} onChange={v => updateField('release_year', v ? parseInt(v) || undefined : undefined)} />
          <EditField label="Discontinued Year" value={String(editData.discontinue_year ?? '')} onChange={v => updateField('discontinue_year', v ? parseInt(v) || undefined : undefined)} />
          <EditField label="Generation" value={String(editData.generation ?? '')} onChange={v => updateField('generation', v ? parseInt(v) || undefined : undefined)} />
          <EditField label="Launch Price" value={editData.launch_price} onChange={v => updateField('launch_price', v)} />
          <EditField label="Units Sold" value={editData.units_sold} onChange={v => updateField('units_sold', v)} />
          <EditField label="Display" value={editData.display} onChange={v => updateField('display', v)} />
        </div>
        <EditField label="CPU" value={editData.cpu} onChange={v => updateField('cpu', v)} />
        <EditField label="Memory" value={editData.memory} onChange={v => updateField('memory', v)} />
        <EditField label="Graphics" value={editData.graphics} onChange={v => updateField('graphics', v)} />
        <EditField label="Sound" value={editData.sound} onChange={v => updateField('sound', v)} />
        <EditField label="Emulators" value={editData.emulators} onChange={v => updateField('emulators', v)} />
        <EditField label="Notable Games (comma-separated)" value={editData.notable_games} onChange={v => updateField('notable_games', v)} />
        <EditField label="Wikipedia URL" value={editData.wikipedia_url} onChange={v => updateField('wikipedia_url', v)} />
        <div style={{ marginBottom: 12 }}>
          <div style={fieldLabel}>Description</div>
          <textarea
            value={editData.description}
            onChange={e => updateField('description', e.target.value)}
            rows={8}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6,
              border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
              color: 'var(--color-text)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
            }}
          />
        </div>
      </div>
    );
  }

  // ── View Mode ──────────────────────────────────────────────────

  if (!wiki) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
          No wiki data available for {systemName}.
        </p>
        <button
          onClick={handleEdit}
          style={{
            padding: '8px 20px', borderRadius: 6, border: 'none',
            background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontSize: 13,
          }}
        >Add Info</button>
      </div>
    );
  }

  const genName = wiki.generation ? GENERATION_NAMES[wiki.generation] ?? `Gen ${wiki.generation}` : null;

  return (
    <div style={{ overflowY: 'auto', maxHeight: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '24px 24px 16px', display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 12, background: 'var(--color-surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {SYSTEM_LOGOS[systemId] ? (
            <SystemLogo systemId={systemId} size={48} />
          ) : (
            <span style={{ fontSize: 32 }}>🎮</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{systemName}</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            {wiki.manufacturer && (
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{wiki.manufacturer}</span>
            )}
            {wiki.release_year && (
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {wiki.release_year}{wiki.discontinue_year ? `–${wiki.discontinue_year}` : '–present'}
              </span>
            )}
            {genName && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: 'var(--color-primary)', color: '#fff', fontWeight: 600,
              }}>{genName}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {wiki.wikipedia_url && (
            <button
              onClick={() => window.open(wiki.wikipedia_url, '_blank')}
              title="Open Wikipedia"
              style={{
                padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)',
                background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontSize: 13,
              }}
            >🌐 Wiki</button>
          )}
          <button
            onClick={handleEdit}
            title="Edit system info"
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontSize: 13,
            }}
          >✏️ Edit</button>
          <button
            onClick={onClose}
            title="Close"
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', color: 'var(--color-text)', cursor: 'pointer', fontSize: 13,
            }}
          >✕</button>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* Description */}
        {wiki.description && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)', margin: 0 }}>
              {wiki.description}
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12, marginBottom: 24,
        }}>
          {wiki.units_sold && <StatCard label="Units Sold" value={wiki.units_sold} />}
          {wiki.launch_price && <StatCard label="Launch Price" value={wiki.launch_price} />}
          {wiki.media_type && <StatCard label="Media" value={wiki.media_type} />}
          {wiki.display && <StatCard label="Display" value={wiki.display} />}
        </div>

        {/* Technical Specifications */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={sectionTitle}>Technical Specifications</h3>
          {wiki.cpu && <SpecRow label="CPU" value={wiki.cpu} />}
          {wiki.memory && <SpecRow label="Memory" value={wiki.memory} />}
          {wiki.graphics && <SpecRow label="Graphics" value={wiki.graphics} />}
          {wiki.sound && <SpecRow label="Sound" value={wiki.sound} />}
          {wiki.media_type && <SpecRow label="Media" value={wiki.media_type} />}
        </div>

        {/* Notable Games */}
        {wiki.notable_games && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={sectionTitle}>Notable Games</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {wiki.notable_games.split(',').map((game, i) => (
                <span key={i} style={{
                  display: 'inline-block', padding: '4px 10px', borderRadius: 6,
                  background: 'var(--color-surface-2)', fontSize: 12, color: 'var(--color-text)',
                }}>
                  {game.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Emulators */}
        {wiki.emulators && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={sectionTitle}>Recommended Emulators</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {wiki.emulators.split(',').map((emu, i) => (
                <span key={i} style={{
                  display: 'inline-block', padding: '4px 10px', borderRadius: 6,
                  background: 'var(--color-primary)', color: '#fff', fontSize: 12, fontWeight: 600,
                  opacity: 0.9,
                }}>
                  {emu.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: 12, borderRadius: 8, background: 'var(--color-surface-2)', textAlign: 'center',
    }}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{value}</div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={specRow}>
      <span style={specLabel}>{label}</span>
      <span style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={fieldLabel}>{label}</div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '6px 10px', borderRadius: 6,
          border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
          color: 'var(--color-text)', fontSize: 13,
        }}
      />
    </div>
  );
}
