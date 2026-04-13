import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Settings2, Mail, Smartphone } from 'lucide-react';
import { api } from '../utils/api';
import type { MonitoringLevel } from '../utils/api';

const DIAS_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Apply Brazilian phone mask: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
function maskCelular(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2)  return `(${digits}`;
  if (digits.length <= 6)  return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validateCelular(masked: string): boolean {
  const digits = masked.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}

function validateEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export const Monitoramento: React.FC = () => {
  const [levels, setLevels] = useState<MonitoringLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, { email?: string; celular?: string }>>({});

  useEffect(() => {
    api.niveis()
      .then(levels => setLevels(levels.map(l => ({
        ...l,
        email:   l.email   ?? '',
        // Format stored digits back into masked display
        celular: l.celular ? maskCelular(l.celular) : '',
      }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateLevel = (id: number, patch: Partial<MonitoringLevel>) => {
    setLevels(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  };

  const setFieldError = (id: number, field: 'email' | 'celular', msg: string | undefined) => {
    setErrors(prev => ({ ...prev, [id]: { ...prev[id], [field]: msg } }));
  };

  const toggleDia = (levelId: number, dia: number) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;
    const dias = level.dias_semana.includes(dia)
      ? level.dias_semana.filter(d => d !== dia)
      : [...level.dias_semana, dia].sort();
    updateLevel(levelId, { dias_semana: dias });
  };

  const addHorario = (levelId: number) => {
    const level = levels.find(l => l.id === levelId);
    if (!level || level.horarios.length >= 5) return;
    updateLevel(levelId, { horarios: [...level.horarios, '08:00'] });
  };

  const removeHorario = (levelId: number, idx: number) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;
    updateLevel(levelId, { horarios: level.horarios.filter((_, i) => i !== idx) });
  };

  const setHorario = (levelId: number, idx: number, value: string) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;
    const horarios = [...level.horarios];
    horarios[idx] = value;
    updateLevel(levelId, { horarios });
  };

  const handleCelularChange = (id: number, raw: string) => {
    const masked = maskCelular(raw);
    updateLevel(id, { celular: masked });
    const digits = masked.replace(/\D/g, '');
    if (digits.length > 0 && !validateCelular(masked)) {
      setFieldError(id, 'celular', 'Informe DDD + número: (99) 99999-9999');
    } else {
      setFieldError(id, 'celular', undefined);
    }
  };

  const handleEmailChange = (id: number, value: string) => {
    updateLevel(id, { email: value });
    if (value && !validateEmail(value)) {
      setFieldError(id, 'email', 'E-mail inválido');
    } else {
      setFieldError(id, 'email', undefined);
    }
  };

  const handleSave = async (level: MonitoringLevel) => {
    // Client-side validation before submit
    const errs: { email?: string; celular?: string } = {};
    if (level.email && !validateEmail(level.email)) errs.email = 'E-mail inválido';
    if (level.celular && !validateCelular(level.celular)) errs.celular = 'Celular incompleto';
    if (errs.email || errs.celular) {
      setErrors(prev => ({ ...prev, [level.id]: errs }));
      return;
    }

    setSaving(level.id);
    try {
      const updated = await api.updateNivel(level.id, {
        quantidade:  level.quantidade,
        dias_semana: level.dias_semana,
        horarios:    level.horarios,
        email:       level.email,
        celular:     level.celular,
      });
      setLevels(prev => prev.map(l => l.id === updated.id ? {
        ...updated,
        email:   updated.email ?? '',
        celular: updated.celular ? maskCelular(updated.celular) : '',
      } : l));
      setSaved(level.id);
      setTimeout(() => setSaved(null), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return (
    <div className="content-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <span style={{ color: 'var(--text-muted)' }}>Carregando configurações...</span>
    </div>
  );

  return (
    <div className="content-area">
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Settings2 size={22} color="var(--primary)" />
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Monitoramento de Estoque</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Configure os 3 níveis de alerta. Cada nível define um limite de quantidade, periodicidade de verificação no AGHU e canais de notificação.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {levels.map(level => {
          const levelErrors = errors[level.id] ?? {};
          return (
            <div key={level.id} className="glass-panel" style={{ padding: '24px', borderLeft: `4px solid ${level.cor}` }}>
              {/* Level header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: level.cor, display: 'inline-block', flexShrink: 0 }} />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: level.cor }}>{level.nome}</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Quantidade */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Quantidade limite (≤ aciona alerta)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={level.quantidade}
                    onChange={e => updateLevel(level.id, { quantidade: Math.max(0, parseInt(e.target.value) || 0) })}
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: 'var(--panel-highlight)', border: `1px solid ${level.cor}44`,
                      borderRadius: '8px', color: 'var(--text-main)', fontSize: '1rem',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Dias da semana */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Dias da semana
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {DIAS_LABELS.map((label, dia) => {
                      const active = level.dias_semana.includes(dia);
                      return (
                        <button
                          key={dia}
                          onClick={() => toggleDia(level.id, dia)}
                          style={{
                            padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                            border: `1px solid ${active ? level.cor : 'var(--panel-border)'}`,
                            background: active ? `${level.cor}22` : 'transparent',
                            color: active ? level.cor : 'var(--text-muted)',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Horários */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    Horários de verificação (máx. 5)
                  </label>
                  <button
                    onClick={() => addHorario(level.id)}
                    disabled={level.horarios.length >= 5}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                      border: `1px solid ${level.cor}55`, background: `${level.cor}11`,
                      color: level.cor, cursor: level.horarios.length >= 5 ? 'not-allowed' : 'pointer',
                      opacity: level.horarios.length >= 5 ? 0.4 : 1,
                    }}
                  >
                    <Plus size={12} /> Adicionar horário
                  </button>
                </div>

                {level.horarios.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                    Nenhum horário configurado — monitoramento inativo.
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {level.horarios.map((h, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'var(--panel-highlight)', border: '1px solid var(--panel-border)',
                        borderRadius: '8px', padding: '6px 10px',
                      }}>
                        <input
                          type="time"
                          value={h}
                          onChange={e => setHorario(level.id, idx, e.target.value)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
                        />
                        <button
                          onClick={() => removeHorario(level.id, idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notification contacts */}
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--panel-border)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Canais de notificação (opcional)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Email */}
                  <div>
                    <div style={{ position: 'relative' }}>
                      <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={level.email}
                        onChange={e => handleEmailChange(level.id, e.target.value)}
                        style={{
                          width: '100%', padding: '10px 12px 10px 36px',
                          background: 'var(--panel-highlight)',
                          border: `1px solid ${levelErrors.email ? '#ef4444' : 'var(--panel-border)'}`,
                          borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.875rem',
                          outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
                        }}
                      />
                    </div>
                    {levelErrors.email && (
                      <p style={{ color: '#ef4444', fontSize: '0.72rem', margin: '4px 0 0 2px' }}>{levelErrors.email}</p>
                    )}
                  </div>

                  {/* Celular */}
                  <div>
                    <div style={{ position: 'relative' }}>
                      <Smartphone size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="(99) 99999-9999"
                        value={level.celular}
                        onChange={e => handleCelularChange(level.id, e.target.value)}
                        maxLength={16}
                        style={{
                          width: '100%', padding: '10px 12px 10px 36px',
                          background: 'var(--panel-highlight)',
                          border: `1px solid ${levelErrors.celular ? '#ef4444' : 'var(--panel-border)'}`,
                          borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.875rem',
                          outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
                        }}
                      />
                    </div>
                    {levelErrors.celular && (
                      <p style={{ color: '#ef4444', fontSize: '0.72rem', margin: '4px 0 0 2px' }}>{levelErrors.celular}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleSave(level)}
                  disabled={saving === level.id || !!levelErrors.email || !!levelErrors.celular}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '9px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem',
                    border: 'none',
                    background: saved === level.id ? '#10b981' : level.cor,
                    color: '#fff',
                    cursor: (saving === level.id || !!levelErrors.email || !!levelErrors.celular) ? 'not-allowed' : 'pointer',
                    opacity: (saving === level.id || !!levelErrors.email || !!levelErrors.celular) ? 0.7 : 1,
                    transition: 'background 0.3s',
                  }}
                >
                  <Save size={15} />
                  {saving === level.id ? 'Salvando...' : saved === level.id ? 'Salvo!' : 'Salvar configurações'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
