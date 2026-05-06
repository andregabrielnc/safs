import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Settings2, ShieldAlert } from 'lucide-react';
import { api } from '../utils/api';
import type { MonitoringLevel, CriticalityRule } from '../utils/api';

const DIAS_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type Tab = 'monitoramento' | 'criticidade';

// ── Criticidade helpers ──────────────────────────────────────────────────────
const ALERTA_COLORS: Record<string, string> = {
  critico: '#ef4444', baixo: '#f97316', atencao: '#f59e0b', normal: '#10b981',
};
const ALERTA_LABELS: Record<string, string> = {
  critico: 'Crítico', baixo: 'Baixo', atencao: 'Atenção', normal: 'Normal',
};

// ── Main component ───────────────────────────────────────────────────────────
export const Monitoramento: React.FC = () => {
  const [tab, setTab] = useState<Tab>('monitoramento');

  return (
    <div className="content-area">
      {/* Page header */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Settings2 size={22} color="var(--primary)" />
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Monitoramento de Estoque</h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid var(--panel-border)', marginBottom: '24px' }}>
        {([
          { id: 'monitoramento', label: 'Regras de Monitoramento' },
          { id: 'criticidade',   label: 'Regras de Criticidade'   },
        ] as { id: Tab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 600,
              color: tab === t.id ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--primary)' : 'transparent'}`,
              marginBottom: '-2px', transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'monitoramento' && <TabMonitoramento />}
      {tab === 'criticidade'   && <TabCriticidade />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Tab 1 — Regras de Monitoramento (current content)
// ═══════════════════════════════════════════════════════════════════════════
const TabMonitoramento: React.FC = () => {
  const [levels, setLevels] = useState<MonitoringLevel[]>([]);
  const [loading, setLoading]  = useState(true);
  const [saving,  setSaving]   = useState<number | null>(null);
  const [saved,   setSaved]    = useState<number | null>(null);

  useEffect(() => {
    api.niveis()
      .then(setLevels)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (id: number, patch: Partial<MonitoringLevel>) =>
    setLevels(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));

  const toggleDia = (id: number, dia: number) => {
    const l = levels.find(l => l.id === id); if (!l) return;
    update(id, { dias_semana: l.dias_semana.includes(dia) ? l.dias_semana.filter(d=>d!==dia) : [...l.dias_semana,dia].sort() });
  };
  const addHorario    = (id: number) => { const l=levels.find(l=>l.id===id); if(!l||l.horarios.length>=5)return; update(id,{horarios:[...l.horarios,'08:00']}); };
  const removeHorario = (id: number, i: number) => { const l=levels.find(l=>l.id===id); if(!l)return; update(id,{horarios:l.horarios.filter((_,j)=>j!==i)}); };
  const setHorario    = (id: number, i: number, v: string) => { const l=levels.find(l=>l.id===id); if(!l)return; const h=[...l.horarios]; h[i]=v; update(id,{horarios:h}); };

  const handleSave = async (level: MonitoringLevel) => {
    setSaving(level.id);
    try {
      const u = await api.updateNivel(level.id, {
        quantidade:  level.quantidade,
        dias_semana: level.dias_semana,
        horarios:    level.horarios,
      });
      setLevels(prev => prev.map(l => l.id===u.id ? u : l));
      setSaved(level.id); setTimeout(()=>setSaved(null),2000);
    } catch(err){ console.error(err); } finally { setSaving(null); }
  };

  if (loading) return <div style={{color:'var(--text-muted)',padding:'40px',textAlign:'center'}}>Carregando...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
        Configure os 3 níveis de alerta. Cada nível define um limite de quantidade, periodicidade de verificação e canais de notificação.
      </p>

      {levels.map(level => {
        return (
          <div key={level.id} className="glass-panel" style={{ padding: '24px', borderLeft: `4px solid ${level.cor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ width:'12px', height:'12px', borderRadius:'50%', background:level.cor, display:'inline-block', flexShrink:0 }} />
              <h3 style={{ margin:0, fontSize:'1.05rem', color:level.cor }}>{level.nome}</h3>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)', marginBottom:'8px' }}>
                  Quantidade limite (≤ aciona alerta)
                </label>
                <input type="number" min={0} value={level.quantidade}
                  onChange={e=>update(level.id,{quantidade:Math.max(0,parseInt(e.target.value)||0)})}
                  style={{ width:'100%', padding:'10px 12px', background:'var(--panel-highlight)', border:`1px solid ${level.cor}44`, borderRadius:'8px', color:'var(--text-main)', fontSize:'1rem', outline:'none', boxSizing:'border-box' }}
                />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)', marginBottom:'8px' }}>Dias da semana</label>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {DIAS_LABELS.map((label,dia)=>{const active=level.dias_semana.includes(dia);return(
                    <button key={dia} onClick={()=>toggleDia(level.id,dia)} style={{ padding:'6px 10px', borderRadius:'6px', fontSize:'0.78rem', fontWeight:600, border:`1px solid ${active?level.cor:'var(--panel-border)'}`, background:active?`${level.cor}22`:'transparent', color:active?level.cor:'var(--text-muted)', cursor:'pointer', transition:'all 0.15s' }}>{label}</button>
                  );})}
                </div>
              </div>
            </div>

            {/* Horários */}
            <div style={{ marginTop:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                <label style={{ fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' }}>Horários de verificação (máx. 5)</label>
                <button onClick={()=>addHorario(level.id)} disabled={level.horarios.length>=5} style={{ display:'flex', alignItems:'center', gap:'4px', padding:'4px 10px', borderRadius:'6px', fontSize:'0.75rem', fontWeight:600, border:`1px solid ${level.cor}55`, background:`${level.cor}11`, color:level.cor, cursor:level.horarios.length>=5?'not-allowed':'pointer', opacity:level.horarios.length>=5?0.4:1 }}>
                  <Plus size={12}/> Adicionar horário
                </button>
              </div>
              {level.horarios.length===0
                ? <p style={{color:'var(--text-muted)',fontSize:'0.82rem',fontStyle:'italic'}}>Nenhum horário configurado — monitoramento inativo.</p>
                : <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                    {level.horarios.map((h,idx)=>(
                      <div key={idx} style={{display:'flex',alignItems:'center',gap:'6px',background:'var(--panel-highlight)',border:'1px solid var(--panel-border)',borderRadius:'8px',padding:'6px 10px'}}>
                        <input type="time" value={h} onChange={e=>setHorario(level.id,idx,e.target.value)} style={{background:'transparent',border:'none',color:'var(--text-main)',fontSize:'0.875rem',outline:'none',cursor:'pointer'}}/>
                        <button onClick={()=>removeHorario(level.id,idx)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:'2px',display:'flex'}}><Trash2 size={13}/></button>
                      </div>
                    ))}
                  </div>
              }
            </div>

            <div style={{marginTop:'20px',paddingTop:'20px',borderTop:'1px solid var(--panel-border)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
              <p style={{margin:0,fontSize:'0.78rem',color:'var(--text-muted)'}}>
                Os alertas aparecem no sino de notificações no topo. Envio por e-mail e SMS ainda não está disponível.
              </p>
              <button onClick={()=>handleSave(level)} disabled={saving===level.id}
                style={{display:'flex',alignItems:'center',gap:'6px',padding:'9px 20px',borderRadius:'8px',fontWeight:700,fontSize:'0.875rem',border:'none',background:saved===level.id?'#10b981':level.cor,color:'#fff',cursor:saving===level.id?'not-allowed':'pointer',opacity:saving===level.id?0.7:1,transition:'background 0.3s'}}>
                <Save size={15}/>
                {saving===level.id?'Salvando...':saved===level.id?'Salvo!':'Salvar configurações'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Tab 2 — Regras de Criticidade
// ═══════════════════════════════════════════════════════════════════════════
const TabCriticidade: React.FC = () => {
  const [rule,    setRule]    = useState<CriticalityRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    api.criticidade()
      .then(setRule)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<CriticalityRule>) => setRule(prev => prev ? { ...prev, ...patch } : prev);

  const validate = (): string | null => {
    if (!rule) return null;
    if (rule.limite_critico < 0) return 'Limite Crítico não pode ser negativo';
    if (rule.limite_baixo <= rule.limite_critico) return 'Limite Baixo deve ser maior que o Crítico';
    if (rule.limite_atencao <= rule.limite_baixo) return 'Limite Atenção deve ser maior que o Baixo';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    if (!rule) return;
    setSaving(true); setError(null);
    try {
      const updated = await api.updateCriticidade(rule.id, {
        nome:           rule.nome,
        limite_critico: rule.limite_critico,
        limite_baixo:   rule.limite_baixo,
        limite_atencao: rule.limite_atencao,
      });
      setRule(updated);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{color:'var(--text-muted)',padding:'40px',textAlign:'center'}}>Carregando...</div>;
  if (!rule)   return <div style={{color:'#ef4444',padding:'40px',textAlign:'center'}}>Regra não encontrada</div>;

  // Derived display ranges
  const ranges = [
    { key: 'critico', label: 'Crítico', desc: `Estoque de 0 até ${rule.limite_critico}` },
    { key: 'baixo',   label: 'Baixo',   desc: `Estoque de ${rule.limite_critico + 1} até ${rule.limite_baixo}` },
    { key: 'atencao', label: 'Atenção', desc: `Estoque de ${rule.limite_baixo + 1} até ${rule.limite_atencao}` },
    { key: 'normal',  label: 'Normal',  desc: `Estoque acima de ${rule.limite_atencao}` },
  ];

  const inputStyle = (hasErr: boolean): React.CSSProperties => ({
    width: '100%', padding: '10px 12px',
    background: 'var(--panel-highlight)',
    border: `1px solid ${hasErr ? '#ef4444' : 'var(--panel-border)'}`,
    borderRadius: '8px', color: 'var(--text-main)', fontSize: '1rem',
    outline: 'none', boxSizing: 'border-box',
  });

  const validationError = validate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
        Defina os limites de quantidade que classificam o estoque em cada status. Esses valores são aplicados em toda a aplicação.
      </p>

      <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--primary)' }}>
        {/* Rule name */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Nome da regra
          </label>
          <input
            type="text"
            value={rule.nome}
            onChange={e => update({ nome: e.target.value })}
            style={{ ...inputStyle(false), maxWidth: '320px' }}
          />
        </div>

        {/* Threshold inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
          {[
            { field: 'limite_critico' as const, label: 'Limite Crítico', hint: 'Estoque ≤ este valor → Crítico', color: ALERTA_COLORS.critico },
            { field: 'limite_baixo'   as const, label: 'Limite Baixo',   hint: 'Estoque ≤ este valor → Baixo',   color: ALERTA_COLORS.baixo   },
            { field: 'limite_atencao' as const, label: 'Limite Atenção', hint: 'Estoque ≤ este valor → Atenção', color: ALERTA_COLORS.atencao },
          ].map(({ field, label, hint, color }) => (
            <div key={field}>
              <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', color }}>
                {label}
              </label>
              <input
                type="number" min={0}
                value={rule[field]}
                onChange={e => update({ [field]: Math.max(0, parseInt(e.target.value) || 0) })}
                style={{ ...inputStyle(!!validationError), borderColor: color + '88' }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '4px 0 0 2px' }}>{hint}</p>
            </div>
          ))}
        </div>

        {/* Live preview table */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Prévia — como o estoque será classificado
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {ranges.map(r => (
              <div key={r.key} style={{
                padding: '14px 16px', borderRadius: '10px',
                background: `${ALERTA_COLORS[r.key]}14`,
                border: `1px solid ${ALERTA_COLORS[r.key]}44`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <ShieldAlert size={14} color={ALERTA_COLORS[r.key]} />
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: ALERTA_COLORS[r.key] }}>{ALERTA_LABELS[r.key]}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Error + Save */}
        {error && (
          <p style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '12px', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={saving || !!validationError}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem',
              border: 'none',
              background: saved ? '#10b981' : 'var(--primary)',
              color: 'var(--bg-dark)',
              cursor: (saving || !!validationError) ? 'not-allowed' : 'pointer',
              opacity: (saving || !!validationError) ? 0.7 : 1,
              transition: 'background 0.3s',
            }}
          >
            <Save size={15} />
            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar regras'}
          </button>
        </div>
      </div>
    </div>
  );
};
