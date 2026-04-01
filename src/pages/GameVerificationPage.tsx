import { useState } from 'react';
import { useVerification } from '../hooks/useVerification';
import { useUiStore } from '../stores/uiStore';
import type { GameVerificationResult, VerificationStatus } from '../types';

const containerStyle: React.CSSProperties = {
  height: '100%',
  overflow: 'auto',
  padding: '24px 32px',
  color: 'var(--color-text)',
  fontFamily: 'inherit',
};

const sectionStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

const btnPrimary: React.CSSProperties = {
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  background: '#dc3545',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  color: 'var(--color-text)',
  cursor: 'pointer',
};

const btnTest: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #17a2b8',
  borderRadius: 6,
  color: '#17a2b8',
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer',
};

const statusColors: Record<VerificationStatus, string> = {
  unverified: '#888',
  ok: '#28a745',
  file_missing: '#dc3545',
  file_unreadable: '#fd7e14',
  emulator_missing: '#ffc107',
  launch_failed: '#e83e8c',
};

const statusLabels: Record<VerificationStatus, string> = {
  unverified: 'Sin verificar',
  ok: 'OK',
  file_missing: 'Archivo no encontrado',
  file_unreadable: 'Archivo corrupto / ilegible',
  emulator_missing: 'Emulador no encontrado',
  launch_failed: 'No abre en emulador',
};

export function GameVerificationPage() {
  const { navigateTo, showToast } = useUiStore();
  const {
    loading,
    testingId,
    summary,
    brokenGames,
    verifyAll,
    testLaunchGame,
    deleteGame,
    deleteGames,
  } = useVerification();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState<VerificationStatus | 'all'>('all');
  const [timeoutSecs, setTimeoutSecs] = useState(5);

  const handleVerify = async () => {
    try {
      const result = await verifyAll();
      if (result) {
        const problems = result.file_missing + result.file_unreadable + result.launch_failed;
        showToast(
          `Verificacion completa: ${result.ok} OK, ${result.file_missing} faltantes, ${result.file_unreadable} corruptos, ${result.emulator_missing} sin emulador, ${result.launch_failed} no abren`,
          problems > 0 ? 'warning' : 'success'
        );
      }
    } catch (e) {
      showToast(`Error: ${e}`, 'error');
    }
  };

  const handleTestLaunch = async (gameId: string) => {
    try {
      const result = await testLaunchGame(gameId, timeoutSecs);
      if (result.status === 'ok') {
        showToast(`"${result.title}" funciona correctamente`, 'success');
      } else {
        showToast(`"${result.title}" fallo: ${result.message}`, 'error');
      }
    } catch (e) {
      showToast(`Error: ${e}`, 'error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(filteredGames.map(g => g.game_id)));
  };

  const clearSelection = () => setSelected(new Set());

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    try {
      const result = await deleteGames(Array.from(selected), deleteFiles);
      showToast(result, 'success');
      setSelected(new Set());
      setConfirmDelete(false);
    } catch (e) {
      showToast(`Error: ${e}`, 'error');
    }
  };

  const handleDeleteSingle = async (gameId: string) => {
    try {
      const result = await deleteGame(gameId, deleteFiles);
      showToast(result, 'success');
      setSelected(prev => { const n = new Set(prev); n.delete(gameId); return n; });
    } catch (e) {
      showToast(`Error: ${e}`, 'error');
    }
  };

  const filteredGames = filter === 'all'
    ? brokenGames
    : brokenGames.filter(g => g.status === filter);

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button style={btnSecondary} onClick={() => navigateTo('settings')}>
          &larr; Volver
        </button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          Verificacion de Juegos
        </h2>
      </div>

      {/* Summary */}
      {summary && (
        <section style={sectionStyle}>
          <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 15 }}>Resumen</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            <StatCard label="Total" value={summary.total} color="var(--color-text)" />
            <StatCard label="OK" value={summary.ok} color="#28a745" />
            <StatCard label="Faltantes" value={summary.file_missing} color="#dc3545" />
            <StatCard label="Corruptos" value={summary.file_unreadable} color="#fd7e14" />
            <StatCard label="Sin emulador" value={summary.emulator_missing} color="#ffc107" />
            <StatCard label="No abren" value={summary.launch_failed} color="#e83e8c" />
          </div>
        </section>
      )}

      {/* Actions */}
      <section style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={handleVerify}
            disabled={loading}
            style={{
              ...btnPrimary,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verificando...' : 'Verificar toda la biblioteca'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Timeout prueba (seg):
            </label>
            <input
              type="number"
              min={3}
              max={30}
              value={timeoutSecs}
              onChange={e => setTimeoutSecs(Math.max(3, Math.min(30, parseInt(e.target.value) || 5)))}
              style={{
                width: 50,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                padding: '4px 8px',
                color: 'var(--color-text)',
                fontSize: 13,
                textAlign: 'center',
              }}
            />
          </div>

          {brokenGames.length > 0 && (
            <>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as VerificationStatus | 'all')}
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: 'var(--color-text)',
                  fontSize: 13,
                }}
              >
                <option value="all">Todos los problemas ({brokenGames.length})</option>
                <option value="file_missing">Archivos faltantes</option>
                <option value="file_unreadable">Archivos corruptos</option>
                <option value="emulator_missing">Sin emulador</option>
                <option value="launch_failed">No abren en emulador</option>
              </select>

              <button onClick={selectAll} style={btnSecondary}>
                Seleccionar todos
              </button>
              {selected.size > 0 && (
                <button onClick={clearSelection} style={btnSecondary}>
                  Limpiar seleccion ({selected.size})
                </button>
              )}
            </>
          )}
        </div>

        <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
          La verificacion basica revisa archivos y emuladores. Usa el boton "Probar" en cada juego
          para lanzar el emulador y confirmar que el ROM carga correctamente (se cierra automaticamente despues del timeout).
        </p>
      </section>

      {/* Broken games list */}
      {filteredGames.length > 0 && (
        <section style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>
              Juegos con problemas ({filteredGames.length})
            </p>
            {selected.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={deleteFiles}
                    onChange={e => setDeleteFiles(e.target.checked)}
                  />
                  Eliminar archivos del disco
                </label>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)} style={btnDanger}>
                    Eliminar seleccionados ({selected.size})
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={handleDeleteSelected} style={btnDanger}>
                      {deleteFiles ? 'Confirmar (archivos seran eliminados)' : 'Confirmar eliminacion'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} style={btnSecondary}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ maxHeight: 500, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px', width: 30 }}></th>
                  <th style={{ padding: '8px 6px' }}>Titulo</th>
                  <th style={{ padding: '8px 6px' }}>Sistema</th>
                  <th style={{ padding: '8px 6px' }}>Estado</th>
                  <th style={{ padding: '8px 6px' }}>Mensaje</th>
                  <th style={{ padding: '8px 6px', width: 140 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredGames.map(game => (
                  <GameRow
                    key={game.game_id}
                    game={game}
                    isSelected={selected.has(game.game_id)}
                    isTesting={testingId === game.game_id}
                    onToggle={() => toggleSelect(game.game_id)}
                    onDelete={() => handleDeleteSingle(game.game_id)}
                    onTestLaunch={() => handleTestLaunch(game.game_id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* No issues */}
      {summary && brokenGames.length === 0 && (
        <section style={{ ...sectionStyle, textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>&#10003;</p>
          <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>
            Todos los juegos estan verificados correctamente
          </p>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'var(--color-surface-2)',
      borderRadius: 8,
      padding: '12px 16px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function GameRow({
  game,
  isSelected,
  isTesting,
  onToggle,
  onDelete,
  onTestLaunch,
}: {
  game: GameVerificationResult;
  isSelected: boolean;
  isTesting: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onTestLaunch: () => void;
}) {
  return (
    <tr style={{
      borderBottom: '1px solid var(--color-border)',
      background: isSelected ? 'rgba(220, 53, 69, 0.08)' : 'transparent',
    }}>
      <td style={{ padding: '8px 6px' }}>
        <input type="checkbox" checked={isSelected} onChange={onToggle} />
      </td>
      <td style={{ padding: '8px 6px', fontWeight: 500 }}>{game.title}</td>
      <td style={{ padding: '8px 6px', color: 'var(--color-text-secondary)' }}>{game.system_id}</td>
      <td style={{ padding: '8px 6px' }}>
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          color: '#fff',
          background: statusColors[game.status],
        }}>
          {statusLabels[game.status]}
        </span>
      </td>
      <td style={{ padding: '8px 6px', fontSize: 12, color: 'var(--color-text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={game.message}
      >
        {game.message}
      </td>
      <td style={{ padding: '8px 6px', display: 'flex', gap: 4 }}>
        <button
          onClick={onTestLaunch}
          disabled={isTesting}
          style={{
            ...btnTest,
            opacity: isTesting ? 0.5 : 1,
            cursor: isTesting ? 'not-allowed' : 'pointer',
          }}
          title="Lanzar emulador para probar si el ROM carga"
        >
          {isTesting ? 'Probando...' : 'Probar'}
        </button>
        <button
          onClick={onDelete}
          style={{
            background: 'transparent',
            border: '1px solid #dc3545',
            borderRadius: 6,
            color: '#dc3545',
            padding: '4px 10px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Eliminar
        </button>
      </td>
    </tr>
  );
}
