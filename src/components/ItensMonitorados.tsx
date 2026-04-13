import React, { useEffect, useState } from 'react';
import { Bell, BellOff, RefreshCw, Package, ExternalLink, FileText } from 'lucide-react';
import { api } from '../utils/api';
import type { MonitoredItem, Notification, MonitoredContract } from '../utils/api';

interface Props {
  almox: number;
  onSelectMaterial: (codigo: number) => void;
}

const ALERTA_STYLE: Record<string, { color: string; label: string }> = {
  critico: { color: '#ef4444', label: 'Crítico' },
  baixo:   { color: '#f59e0b', label: 'Baixo' },
  atencao: { color: '#f97316', label: 'Atenção' },
  normal:  { color: '#10b981', label: 'Normal' },
};

export const ItensMonitorados: React.FC<Props> = ({ almox, onSelectMaterial }) => {
  const [activeTab, setActiveTab] = useState<'itens' | 'contratos'>('itens');

  // ── Itens monitorados state ────────────────────────────────────────────────
  const [items, setItems] = useState<MonitoredItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingItens, setLoadingItens] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [checking, setChecking] = useState<number | null>(null);

  // ── Contratos monitorados state ────────────────────────────────────────────
  const [contratos, setContratos] = useState<MonitoredContract[]>([]);
  const [loadingContratos, setLoadingContratos] = useState(true);
  const [checkingContrato, setCheckingContrato] = useState<string | null>(null);
  const [removingContrato, setRemovingContrato] = useState<string | null>(null);

  const loadItens = () => {
    setLoadingItens(true);
    Promise.all([api.itensMonitorados(), api.notificacoes()])
      .then(([its, notifs]) => {
        setItems(its.filter(i => i.almox === almox));
        setNotifications(notifs);
      })
      .catch(() => {})
      .finally(() => setLoadingItens(false));
  };

  const loadContratos = () => {
    setLoadingContratos(true);
    api.eneMonitorados()
      .then(setContratos)
      .catch(() => {})
      .finally(() => setLoadingContratos(false));
  };

  useEffect(() => { loadItens(); }, [almox]);
  useEffect(() => { loadContratos(); }, []);

  // ── Itens handlers ─────────────────────────────────────────────────────────
  const handleRemove = async (mat_codigo: number) => {
    setRemoving(mat_codigo);
    await api.removerMonitoramento(mat_codigo, almox).catch(() => {});
    setRemoving(null);
    loadItens();
  };

  const handleCheckNow = async (mat_codigo: number) => {
    setChecking(mat_codigo);
    try {
      const result = await api.checkNow(mat_codigo, almox);
      if (result.triggered) api.notificacoes().then(setNotifications).catch(() => {});
    } catch {}
    setChecking(null);
  };

  // ── Contratos handlers ─────────────────────────────────────────────────────
  const handleCheckContrato = async (nro_af: number, cpto: number) => {
    const key = `${nro_af}_${cpto}`;
    setCheckingContrato(key);
    try {
      await api.checkNowContrato(nro_af, cpto);
      loadContratos();
    } catch {}
    setCheckingContrato(null);
  };

  const handleRemoveContrato = async (nro_af: number, cpto: number) => {
    const key = `${nro_af}_${cpto}`;
    setRemovingContrato(key);
    await api.removerContratoMonitorado(nro_af, cpto).catch(() => {});
    setRemovingContrato(null);
    loadContratos();
  };

  const notifsByMat = notifications.reduce<Record<number, Notification[]>>((acc, n) => {
    acc[n.mat_codigo] = acc[n.mat_codigo] ?? [];
    acc[n.mat_codigo].push(n);
    return acc;
  }, {});

  const formatDate = (s: string) =>
    new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="content-area">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '4px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Bell size={22} color="var(--primary)" />
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Monitoramento</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            {items.length} {items.length === 1 ? 'material' : 'materiais'} · {contratos.length} {contratos.length === 1 ? 'contrato' : 'contratos'} monitorados
          </p>
        </div>
        <button
          onClick={() => { loadItens(); loadContratos(); }}
          style={{
            background: 'var(--panel-highlight)', border: '1px solid var(--panel-border)',
            borderRadius: '8px', padding: '8px 14px', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem',
          }}
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--panel-border)' }}>
        {([
          { key: 'itens',     label: `Itens Monitorados${items.length > 0 ? ` (${items.length})` : ''}` },
          { key: 'contratos', label: `Contratos Monitorados${contratos.length > 0 ? ` (${contratos.length})` : ''}` },
        ] as { key: 'itens' | 'contratos'; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 18px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: activeTab === tab.key ? 600 : 400,
              marginBottom: '-1px', transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Aba: Itens Monitorados ── */}
      {activeTab === 'itens' && (
        loadingItens ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
            <span style={{ color: 'var(--text-muted)' }}>Carregando itens monitorados...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
            <Package size={40} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Nenhum material monitorado. Acesse a lista de Materiais G36 e marque materiais com o ícone de sino.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map(item => {
              const itemNotifs = notifsByMat[item.mat_codigo] ?? [];
              const unreadCount = itemNotifs.filter(n => !n.lida).length;
              return (
                <div key={item.id} className="glass-panel" style={{ padding: '18px 20px', borderLeft: `4px solid ${item.level_cor}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => onSelectMaterial(item.mat_codigo)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {item.mat_nome}
                          <ExternalLink size={13} color="var(--text-muted)" />
                        </button>
                        {unreadCount > 0 && (
                          <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px' }}>
                            {unreadCount} alerta{unreadCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>Código: <b style={{ color: 'var(--text-main)' }}>{item.mat_codigo}</b></span>
                        <span>Nível: <b style={{ color: item.level_cor }}>{item.level_nome}</b></span>
                        <span>Limite: <b style={{ color: 'var(--text-main)' }}>≤ {item.level_quantidade} {item.mat_umd}</b></span>
                        <span>Desde: {new Date(item.criado_em).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {itemNotifs.length > 0 && (
                        <div style={{ marginTop: '10px', padding: '8px 12px', background: 'var(--panel-highlight)', borderRadius: '8px', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Último alerta: </span>
                          <span style={{ color: itemNotifs[0].level_cor, fontWeight: 600 }}>
                            estoque {Number(itemNotifs[0].estoque).toLocaleString('pt-BR')} (limite {itemNotifs[0].quantidade})
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}> em {formatDate(itemNotifs[0].criado_em)}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => handleCheckNow(item.mat_codigo)}
                        disabled={checking === item.mat_codigo}
                        style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, border: `1px solid ${item.level_cor}44`, background: `${item.level_cor}11`, color: item.level_cor, cursor: checking === item.mat_codigo ? 'not-allowed' : 'pointer', opacity: checking === item.mat_codigo ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Bell size={13} />
                        {checking === item.mat_codigo ? 'Verificando...' : 'Verificar agora'}
                      </button>
                      <button
                        onClick={() => handleRemove(item.mat_codigo)}
                        disabled={removing === item.mat_codigo}
                        style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, border: '1px solid #ef444444', background: 'transparent', color: '#ef4444', cursor: removing === item.mat_codigo ? 'not-allowed' : 'pointer', opacity: removing === item.mat_codigo ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <BellOff size={13} />
                        {removing === item.mat_codigo ? 'Removendo...' : 'Parar'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Aba: Contratos Monitorados ── */}
      {activeTab === 'contratos' && (
        loadingContratos ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
            <span style={{ color: 'var(--text-muted)' }}>Carregando contratos monitorados...</span>
          </div>
        ) : contratos.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
            <FileText size={40} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Nenhum contrato ENE monitorado. Acesse a aba ENE em um material e clique no sino em um contrato.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {contratos.map(c => {
              const key = `${c.nro_af}_${c.cpto}`;
              const isChecking = checkingContrato === key;
              const isRemoving = removingContrato === key;
              const alerta = c.alerta ?? 'normal';
              const alertaInfo = ALERTA_STYLE[alerta] ?? ALERTA_STYLE.normal;
              const saldoPct = c.qtde_contratada > 0 && c.saldo_atual != null
                ? Math.round((c.saldo_atual / c.qtde_contratada) * 100)
                : null;
              const venc = c.vencimento ? new Date(c.vencimento) : null;
              const daysLeft = venc ? Math.round((venc.getTime() - Date.now()) / 86400000) : null;

              return (
                <div key={c.id} className="glass-panel" style={{ padding: '18px 20px', borderLeft: `4px solid ${c.level_cor}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Material + alerta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => onSelectMaterial(c.mat_codigo)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {c.mat_nome}
                          <ExternalLink size={13} color="var(--text-muted)" />
                        </button>
                        {c.alerta && (
                          <span style={{ background: `${alertaInfo.color}20`, color: alertaInfo.color, borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700, padding: '1px 8px' }}>
                            {alertaInfo.label}
                          </span>
                        )}
                      </div>

                      {/* Contrato info */}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>Pregão: <b style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{c.pregao}</b></span>
                        <span>AF: <b style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{c.nro_af}/{c.cpto}</b></span>
                        <span>Nível: <b style={{ color: c.level_cor }}>{c.level_nome}</b></span>
                        <span>Limite saldo: <b style={{ color: 'var(--text-main)' }}>≤ {Number(c.level_quantidade).toLocaleString('pt-BR')}</b></span>
                        {venc && (
                          <span style={{ color: daysLeft != null && daysLeft < 30 ? '#ef4444' : daysLeft != null && daysLeft < 90 ? '#f59e0b' : 'var(--text-muted)' }}>
                            Vence: <b>{venc.toLocaleDateString('pt-BR')}</b>
                            {daysLeft != null && daysLeft < 90 && ` (${daysLeft}d)`}
                          </span>
                        )}
                      </div>

                      {/* Saldo atual */}
                      {c.saldo_atual != null && (
                        <div style={{ marginTop: '10px', padding: '8px 12px', background: 'var(--panel-highlight)', borderRadius: '8px', fontSize: '0.78rem', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                          <span>
                            <span style={{ color: 'var(--text-muted)' }}>Saldo atual: </span>
                            <b style={{ color: alertaInfo.color }}>{Number(c.saldo_atual).toLocaleString('pt-BR')}</b>
                            {saldoPct != null && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: '4px' }}>({saldoPct}%)</span>
                            )}
                          </span>
                          <span>
                            <span style={{ color: 'var(--text-muted)' }}>Contratado: </span>
                            <b>{Number(c.qtde_contratada).toLocaleString('pt-BR')}</b>
                          </span>
                          {c.status_af && (
                            <span>
                              <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                              <b style={{ color: c.status_af === 'A EFETIVAR' ? '#10b981' : c.status_af === 'PARCIAL' ? '#f59e0b' : 'var(--text-muted)' }}>
                                {c.status_af}
                              </b>
                            </span>
                          )}
                          {c.atualizado_em && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: 'auto' }}>
                              Atualizado: {formatDate(c.atualizado_em)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => handleCheckContrato(c.nro_af, c.cpto)}
                        disabled={isChecking}
                        title="Verificar saldo agora"
                        style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, border: `1px solid ${c.level_cor}44`, background: `${c.level_cor}11`, color: c.level_cor, cursor: isChecking ? 'not-allowed' : 'pointer', opacity: isChecking ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Bell size={13} />
                        {isChecking ? 'Verificando...' : 'Verificar agora'}
                      </button>
                      <button
                        onClick={() => handleRemoveContrato(c.nro_af, c.cpto)}
                        disabled={isRemoving}
                        title="Parar monitoramento"
                        style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, border: '1px solid #ef444444', background: 'transparent', color: '#ef4444', cursor: isRemoving ? 'not-allowed' : 'pointer', opacity: isRemoving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <BellOff size={13} />
                        {isRemoving ? 'Removendo...' : 'Parar'}
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
