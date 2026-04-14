import React, { useEffect, useState } from 'react';
import { Bell, BellOff, RefreshCw, ExternalLink, FileText, Package } from 'lucide-react';
import { api } from '../utils/api';
import type { MonitoredItem, Notification, MonitoredContract } from '../utils/api';

interface Props {
  almox: number;
  onSelectMaterial: (codigo: number) => void;
}

// ── Design tokens alinhados ao tema shadcn ────────────────────────────────────
const T = {
  radius:    '10px',
  radiusSm:  '6px',
  border:    '1px solid var(--panel-border)',
  bg:        'var(--panel-bg)',
  bgSubtle:  'var(--panel-highlight)',
  textMain:  'var(--text-main)',
  textMuted: 'var(--text-muted)',
  shadow:    '0 1px 3px 0 rgba(0,0,0,0.10), 0 1px 2px -1px rgba(0,0,0,0.10)',
};

const ALERTA: Record<string, { color: string; bg: string; label: string }> = {
  critico: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  label: 'Crítico' },
  baixo:   { color: '#f97316', bg: 'rgba(249,115,22,0.10)', label: 'Baixo'   },
  atencao: { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Atenção' },
  normal:  { color: '#10b981', bg: 'rgba(16,185,129,0.10)', label: 'Normal'  },
};

// ── Primitivos de estilo reutilizáveis ────────────────────────────────────────
const card: React.CSSProperties = {
  background: T.bg, border: T.border, borderRadius: T.radius,
  boxShadow: T.shadow, padding: '16px 20px',
};

const badge = (color: string, bg: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center',
  background: bg, color, borderRadius: '5px',
  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.03em',
  padding: '2px 8px', whiteSpace: 'nowrap' as const,
});

const pill = (color: string): React.CSSProperties => ({
  width: 8, height: 8, borderRadius: '50%',
  background: color, flexShrink: 0, marginTop: 2,
});

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '5px',
  padding: '6px 12px', borderRadius: T.radiusSm,
  fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
  transition: 'all 0.15s',
};

const btnOutline = (color: string): React.CSSProperties => ({
  ...btnBase,
  background: 'transparent',
  border: `1px solid ${color}55`,
  color,
});

const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: 'transparent',
  border: T.border,
  color: '#ef4444',
};

const divider: React.CSSProperties = {
  height: 1, background: 'var(--panel-border)', margin: '12px 0',
};

const metaLabel: React.CSSProperties = {
  fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' as const,
  letterSpacing: '0.04em', marginBottom: '2px',
};

const metaValue: React.CSSProperties = {
  fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-main)',
};

// ── Componente ────────────────────────────────────────────────────────────────
export const ItensMonitorados: React.FC<Props> = ({ almox, onSelectMaterial }) => {
  const [activeTab, setActiveTab] = useState<'itens' | 'contratos'>('itens');

  const [items,         setItems]         = useState<MonitoredItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingItens,  setLoadingItens]  = useState(true);
  const [removing,      setRemoving]      = useState<number | null>(null);
  const [checking,      setChecking]      = useState<number | null>(null);

  const [contratos,          setContratos]          = useState<MonitoredContract[]>([]);
  const [loadingContratos,   setLoadingContratos]   = useState(true);
  const [checkingContrato,   setCheckingContrato]   = useState<string | null>(null);
  const [removingContrato,   setRemovingContrato]   = useState<string | null>(null);

  const loadItens = () => {
    setLoadingItens(true);
    Promise.all([api.itensMonitorados(), api.notificacoes()])
      .then(([its, notifs]) => { setItems(its.filter(i => i.almox === almox)); setNotifications(notifs); })
      .catch(() => {})
      .finally(() => setLoadingItens(false));
  };

  const loadContratos = () => {
    setLoadingContratos(true);
    api.eneMonitorados()
      .then(setContratos).catch(() => {})
      .finally(() => setLoadingContratos(false));
  };

  useEffect(() => { loadItens(); }, [almox]);
  useEffect(() => { loadContratos(); }, []);

  const handleRemove = async (mat_codigo: number) => {
    setRemoving(mat_codigo);
    await api.removerMonitoramento(mat_codigo, almox).catch(() => {});
    setRemoving(null); loadItens();
  };

  const handleCheckNow = async (mat_codigo: number) => {
    setChecking(mat_codigo);
    try {
      const r = await api.checkNow(mat_codigo, almox);
      if (r.triggered) api.notificacoes().then(setNotifications).catch(() => {});
    } catch {}
    setChecking(null);
  };

  const handleCheckContrato = async (nro_af: number, cpto: number) => {
    const key = `${nro_af}_${cpto}`;
    setCheckingContrato(key);
    try { await api.checkNowContrato(nro_af, cpto); loadContratos(); } catch {}
    setCheckingContrato(null);
  };

  const handleRemoveContrato = async (nro_af: number, cpto: number) => {
    const key = `${nro_af}_${cpto}`;
    setRemovingContrato(key);
    await api.removerContratoMonitorado(nro_af, cpto).catch(() => {});
    setRemovingContrato(null); loadContratos();
  };

  const notifsByMat = notifications.reduce<Record<number, Notification[]>>((acc, n) => {
    (acc[n.mat_codigo] ??= []).push(n); return acc;
  }, {});

  const fmt = (s: string) =>
    new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR');

  // ── Tab button ──────────────────────────────────────────────────────────────
  const TabBtn = ({ id, label }: { id: 'itens' | 'contratos'; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '8px 18px', background: 'none', border: 'none',
        borderBottom: activeTab === id ? '2px solid var(--primary)' : '2px solid transparent',
        color: activeTab === id ? 'var(--primary)' : 'var(--text-muted)',
        cursor: 'pointer', fontSize: '0.875rem', fontWeight: activeTab === id ? 600 : 400,
        marginBottom: '-1px', transition: 'color 0.15s',
      }}
    >{label}</button>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  const Empty = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
    <div style={{ ...card, padding: '60px 24px', textAlign: 'center' }}>
      <Icon size={36} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 360, margin: '0 auto' }}>{text}</p>
    </div>
  );

  // ── Loading state ───────────────────────────────────────────────────────────
  const Loading = ({ label }: { label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{label}</span>
    </div>
  );

  return (
    <div className="content-area">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, marginBottom: '4px' }}>Monitoramento</h1>
          <p style={{ color: T.textMuted, fontSize: '0.82rem', margin: 0 }}>
            {items.length} {items.length === 1 ? 'material' : 'materiais'} · {contratos.length} {contratos.length === 1 ? 'contrato' : 'contratos'} monitorados
          </p>
        </div>
        <button
          onClick={() => { loadItens(); loadContratos(); }}
          style={{ ...btnBase, background: T.bgSubtle, border: T.border, color: T.textMuted }}
        >
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--panel-border)' }}>
        <TabBtn id="itens"     label={`Itens Monitorados${items.length > 0 ? ` (${items.length})` : ''}`} />
        <TabBtn id="contratos" label={`Contratos Monitorados${contratos.length > 0 ? ` (${contratos.length})` : ''}`} />
      </div>

      {/* ── Aba: Itens ─────────────────────────────────────────────────────── */}
      {activeTab === 'itens' && (
        loadingItens ? <Loading label="Carregando itens monitorados..." /> :
        items.length === 0 ? (
          <Empty icon={Package} text="Nenhum material monitorado. Acesse a lista de Materiais G36 e marque com o ícone de sino." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map(item => {
              const notifs    = notifsByMat[item.mat_codigo] ?? [];
              const unread    = notifs.filter(n => !n.lida).length;
              const isChecking = checking === item.mat_codigo;
              const isRemoving = removing === item.mat_codigo;

              return (
                <div key={item.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>

                    {/* Dot indicador */}
                    <div style={{ ...pill(item.level_cor), marginTop: 6 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Nome + badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <button
                          onClick={() => onSelectMaterial(item.mat_codigo)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '5px', color: T.textMain, fontWeight: 600, fontSize: '0.875rem' }}
                        >
                          {item.mat_nome}
                          <ExternalLink size={12} style={{ color: T.textMuted, flexShrink: 0 }} />
                        </button>
                        <span style={badge(item.level_cor, `${item.level_cor}18`)}>{item.level_nome}</span>
                        {unread > 0 && (
                          <span style={badge('#ef4444', 'rgba(239,68,68,0.10)')}>
                            {unread} alerta{unread !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Metadados em grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px 20px' }}>
                        <div>
                          <div style={metaLabel}>Código</div>
                          <div style={{ ...metaValue, fontFamily: 'monospace' }}>{item.mat_codigo}</div>
                        </div>
                        <div>
                          <div style={metaLabel}>Limite de alerta</div>
                          <div style={{ ...metaValue, color: item.level_cor }}>≤ {item.level_quantidade} {item.mat_umd}</div>
                        </div>
                        <div>
                          <div style={metaLabel}>Monitorado desde</div>
                          <div style={metaValue}>{fmtDate(item.criado_em)}</div>
                        </div>
                      </div>

                      {/* Último alerta */}
                      {notifs.length > 0 && (
                        <>
                          <div style={divider} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                            <Bell size={11} style={{ color: notifs[0].level_cor, flexShrink: 0 }} />
                            <span style={{ color: T.textMuted }}>Último alerta:</span>
                            <span style={{ color: notifs[0].level_cor, fontWeight: 600 }}>
                              estoque {Number(notifs[0].estoque).toLocaleString('pt-BR')}
                            </span>
                            <span style={{ color: T.textMuted }}>· limite {notifs[0].quantidade} · {fmt(notifs[0].criado_em)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => handleCheckNow(item.mat_codigo)}
                        disabled={isChecking}
                        style={{ ...btnOutline(item.level_cor), opacity: isChecking ? 0.6 : 1, cursor: isChecking ? 'not-allowed' : 'pointer' }}
                        title="Verificar estoque agora"
                      >
                        <Bell size={12} />
                        {isChecking ? 'Verificando…' : 'Verificar'}
                      </button>
                      <button
                        onClick={() => handleRemove(item.mat_codigo)}
                        disabled={isRemoving}
                        style={{ ...btnGhost, opacity: isRemoving ? 0.6 : 1, cursor: isRemoving ? 'not-allowed' : 'pointer' }}
                        title="Parar monitoramento"
                      >
                        <BellOff size={12} />
                        {isRemoving ? 'Removendo…' : 'Parar'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Aba: Contratos ─────────────────────────────────────────────────── */}
      {activeTab === 'contratos' && (
        loadingContratos ? <Loading label="Carregando contratos monitorados..." /> :
        contratos.length === 0 ? (
          <Empty icon={FileText} text="Nenhum contrato ENE monitorado. Acesse a aba ENE em um material e clique no sino em um contrato." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {contratos.map(c => {
              const key        = `${c.nro_af}_${c.cpto}`;
              const isChecking = checkingContrato === key;
              const isRemoving = removingContrato === key;
              const alerta     = c.alerta ?? 'normal';
              const A          = ALERTA[alerta] ?? ALERTA.normal;
              const saldoPct   = c.qtde_contratada > 0 && c.saldo_atual != null
                ? Math.round((c.saldo_atual / c.qtde_contratada) * 100) : null;
              const venc     = c.vencimento ? new Date(c.vencimento) : null;
              const daysLeft = venc ? Math.round((venc.getTime() - Date.now()) / 86400000) : null;
              const vencColor = daysLeft == null ? T.textMuted
                : daysLeft < 30 ? '#ef4444' : daysLeft < 90 ? '#f59e0b' : T.textMuted;

              return (
                <div key={c.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>

                    {/* Dot indicador */}
                    <div style={{ ...pill(c.level_cor), marginTop: 6 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Nome + alerta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <button
                          onClick={() => onSelectMaterial(c.mat_codigo)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '5px', color: T.textMain, fontWeight: 600, fontSize: '0.875rem' }}
                        >
                          {c.mat_nome}
                          <ExternalLink size={12} style={{ color: T.textMuted, flexShrink: 0 }} />
                        </button>
                        <span style={badge(c.level_cor, `${c.level_cor}18`)}>{c.level_nome}</span>
                        {c.alerta && (
                          <span style={badge(A.color, A.bg)}>{A.label}</span>
                        )}
                      </div>

                      {/* Metadados em grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px 20px' }}>
                        <div>
                          <div style={metaLabel}>Pregão</div>
                          <div style={{ ...metaValue, fontFamily: 'monospace', color: 'var(--primary)' }}>{c.pregao}</div>
                        </div>
                        <div>
                          <div style={metaLabel}>AF / Lote</div>
                          <div style={{ ...metaValue, fontFamily: 'monospace' }}>{c.nro_af}/{c.cpto}</div>
                        </div>
                        <div>
                          <div style={metaLabel}>Limite de saldo</div>
                          <div style={{ ...metaValue, color: c.level_cor }}>≤ {Number(c.level_quantidade).toLocaleString('pt-BR')}</div>
                        </div>
                        {venc && (
                          <div>
                            <div style={metaLabel}>Vencimento</div>
                            <div style={{ ...metaValue, color: vencColor }}>
                              {venc.toLocaleDateString('pt-BR')}
                              {daysLeft != null && daysLeft < 90 && (
                                <span style={{ fontSize: '0.7rem', marginLeft: '4px', color: vencColor }}>
                                  ({daysLeft}d)
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {c.status_af && (
                          <div>
                            <div style={metaLabel}>Situação</div>
                            <div style={{ ...metaValue, color: c.status_af === 'A EFETIVAR' ? '#10b981' : c.status_af === 'PARCIAL' ? '#f59e0b' : T.textMuted }}>
                              {c.status_af}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Saldo atual + barra de progresso */}
                      {c.saldo_atual != null && (
                        <>
                          <div style={divider} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '0.68rem', color: T.textMuted }}>Saldo atual</span>
                              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: A.color }}>
                                {Number(c.saldo_atual).toLocaleString('pt-BR')}
                              </span>
                              {saldoPct != null && (
                                <span style={{ fontSize: '0.68rem', color: T.textMuted }}>({saldoPct}%)</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '0.68rem', color: T.textMuted }}>Contratado</span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{Number(c.qtde_contratada).toLocaleString('pt-BR')}</span>
                            </div>
                            {saldoPct != null && (
                              <div style={{ flex: 1, minWidth: 100 }}>
                                <div style={{ height: 4, borderRadius: 99, background: 'var(--panel-highlight)', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, saldoPct))}%`, background: A.color, borderRadius: 99, transition: 'width 0.4s' }} />
                                </div>
                              </div>
                            )}
                            {c.atualizado_em && (
                              <span style={{ fontSize: '0.68rem', color: T.textMuted, marginLeft: 'auto' }}>
                                Atualizado {fmt(c.atualizado_em)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => handleCheckContrato(c.nro_af, c.cpto)}
                        disabled={isChecking}
                        style={{ ...btnOutline(c.level_cor), opacity: isChecking ? 0.6 : 1, cursor: isChecking ? 'not-allowed' : 'pointer' }}
                        title="Verificar saldo agora"
                      >
                        <Bell size={12} />
                        {isChecking ? 'Verificando…' : 'Verificar'}
                      </button>
                      <button
                        onClick={() => handleRemoveContrato(c.nro_af, c.cpto)}
                        disabled={isRemoving}
                        style={{ ...btnGhost, opacity: isRemoving ? 0.6 : 1, cursor: isRemoving ? 'not-allowed' : 'pointer' }}
                        title="Parar monitoramento"
                      >
                        <BellOff size={12} />
                        {isRemoving ? 'Removendo…' : 'Parar'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

    </div>
  );
};
