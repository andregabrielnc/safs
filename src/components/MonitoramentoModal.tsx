import React, { useEffect, useState } from 'react';
import { X, Bell, BellOff } from 'lucide-react';
import { api } from '../utils/api';
import type { MonitoringLevel } from '../utils/api';

interface Props {
  matCodigo: number;
  matNome: string;
  matUmd: string;
  almox: number;
  currentLevelId?: number | null;
  onClose: () => void;
  onSave: () => void;
}

export const MonitoramentoModal: React.FC<Props> = ({
  matCodigo, matNome, matUmd, almox, currentLevelId, onClose, onSave,
}) => {
  const [levels, setLevels] = useState<MonitoringLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(currentLevelId ?? null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    api.niveis().then(setLevels).catch(() => {});
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!selectedLevel) return;
    setSaving(true);
    try {
      await api.monitorarItem({ mat_codigo: matCodigo, mat_nome: matNome, mat_umd: matUmd, almox, level_id: selectedLevel });
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.removerMonitoramento(matCodigo, almox);
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '16px',
      }}
    >
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: '16px',
        width: '100%', maxWidth: '460px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--panel-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Bell size={18} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Monitorar Material</h3>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '340px' }}>
              #{matCodigo} — {matNome}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Level selector */}
        <div style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Selecione o nível de monitoramento para este material:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {levels.map(l => (
              <button
                key={l.id}
                onClick={() => setSelectedLevel(l.id)}
                style={{
                  padding: '14px 16px',
                  border: `2px solid ${selectedLevel === l.id ? l.cor : 'var(--panel-border)'}`,
                  borderRadius: '10px',
                  background: selectedLevel === l.id ? `${l.cor}18` : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: l.cor, fontSize: '0.9rem' }}>{l.nome}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Aciona quando estoque ≤ {l.quantidade} {matUmd}
                    {' · '}
                    {l.horarios.length} horário{l.horarios.length !== 1 ? 's' : ''}/dia
                  </div>
                </div>
                {selectedLevel === l.id && (
                  <span style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: l.cor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--panel-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
        }}>
          <div>
            {currentLevelId && (
              <button onClick={handleRemove} disabled={removing} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem',
                border: '1px solid #ef444444', background: 'transparent',
                color: '#ef4444', cursor: removing ? 'not-allowed' : 'pointer',
                opacity: removing ? 0.6 : 1,
              }}>
                <BellOff size={14} /> {removing ? 'Removendo...' : 'Parar monitoramento'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={{
              padding: '8px 18px', borderRadius: '8px', fontSize: '0.875rem',
              border: '1px solid var(--panel-border)', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!selectedLevel || saving} style={{
              padding: '8px 18px', borderRadius: '8px', fontSize: '0.875rem',
              border: 'none', background: selectedLevel ? 'var(--primary)' : 'var(--panel-border)',
              color: selectedLevel ? 'var(--bg-dark)' : 'var(--text-muted)',
              cursor: !selectedLevel || saving ? 'not-allowed' : 'pointer',
              fontWeight: 700, opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
