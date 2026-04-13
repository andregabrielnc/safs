import React, { useEffect, useState } from 'react';
import { Bell, BellOff, RefreshCw, Package, ExternalLink } from 'lucide-react';
import { api } from '../utils/api';
import type { MonitoredItem, Notification } from '../utils/api';

interface Props {
  almox: number;
  onSelectMaterial: (codigo: number) => void;
}

export const ItensMonitorados: React.FC<Props> = ({ almox, onSelectMaterial }) => {
  const [items, setItems] = useState<MonitoredItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [checking, setChecking] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.itensMonitorados(), api.notificacoes()])
      .then(([its, notifs]) => {
        setItems(its.filter(i => i.almox === almox));
        setNotifications(notifs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [almox]);

  const handleRemove = async (mat_codigo: number) => {
    setRemoving(mat_codigo);
    await api.removerMonitoramento(mat_codigo, almox).catch(() => {});
    setRemoving(null);
    load();
  };

  const handleCheckNow = async (mat_codigo: number) => {
    setChecking(mat_codigo);
    try {
      const result = await api.checkNow(mat_codigo, almox);
      if (result.triggered) {
        api.notificacoes().then(setNotifications).catch(() => {});
      }
    } catch {}
    setChecking(null);
  };

  // Group notifications by material
  const notifsByMat = notifications.reduce<Record<number, Notification[]>>((acc, n) => {
    acc[n.mat_codigo] = acc[n.mat_codigo] ?? [];
    acc[n.mat_codigo].push(n);
    return acc;
  }, {});

  const formatDate = (s: string) =>
    new Date(s + 'Z').toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (loading) return (
    <div className="content-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <span style={{ color: 'var(--text-muted)' }}>Carregando itens monitorados...</span>
    </div>
  );

  return (
    <div className="content-area">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '4px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Bell size={22} color="var(--primary)" />
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Itens Monitorados</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            {items.length} {items.length === 1 ? 'material monitorado' : 'materiais monitorados'} neste almoxarifado
          </p>
        </div>
        <button onClick={load} style={{
          background: 'var(--panel-highlight)', border: '1px solid var(--panel-border)',
          borderRadius: '8px', padding: '8px 14px', color: 'var(--text-muted)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem',
        }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {items.length === 0 ? (
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
              <div key={item.id} className="glass-panel" style={{
                padding: '18px 20px',
                borderLeft: `4px solid ${item.level_cor}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', justifyContent: 'space-between' }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => onSelectMaterial(item.mat_codigo)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem',
                          padding: 0, display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                      >
                        {item.mat_nome}
                        <ExternalLink size={13} color="var(--text-muted)" />
                      </button>
                      {unreadCount > 0 && (
                        <span style={{
                          background: '#ef4444', color: '#fff',
                          borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700,
                          padding: '1px 7px',
                        }}>
                          {unreadCount} alerta{unreadCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>Código: <b style={{ color: 'var(--text-main)' }}>{item.mat_codigo}</b></span>
                      <span>Nível: <b style={{ color: item.level_cor }}>{item.level_nome}</b></span>
                      <span>Limite: <b style={{ color: 'var(--text-main)' }}>≤ {item.level_quantidade} {item.mat_umd}</b></span>
                      <span>Desde: {new Date(item.criado_em + 'Z').toLocaleDateString('pt-BR')}</span>
                    </div>

                    {/* Last notification */}
                    {itemNotifs.length > 0 && (
                      <div style={{
                        marginTop: '10px', padding: '8px 12px',
                        background: 'var(--panel-highlight)', borderRadius: '8px',
                        fontSize: '0.78rem',
                      }}>
                        <span style={{ color: 'var(--text-muted)' }}>Último alerta: </span>
                        <span style={{ color: itemNotifs[0].level_cor, fontWeight: 600 }}>
                          estoque {Number(itemNotifs[0].estoque).toLocaleString('pt-BR')} (limite {itemNotifs[0].quantidade})
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}> em {formatDate(itemNotifs[0].criado_em)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleCheckNow(item.mat_codigo)}
                      disabled={checking === item.mat_codigo}
                      title="Verificar agora"
                      style={{
                        padding: '7px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
                        border: `1px solid ${item.level_cor}44`, background: `${item.level_cor}11`,
                        color: item.level_cor, cursor: checking === item.mat_codigo ? 'not-allowed' : 'pointer',
                        opacity: checking === item.mat_codigo ? 0.6 : 1,
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}
                    >
                      <Bell size={13} />
                      {checking === item.mat_codigo ? 'Verificando...' : 'Verificar agora'}
                    </button>
                    <button
                      onClick={() => handleRemove(item.mat_codigo)}
                      disabled={removing === item.mat_codigo}
                      title="Parar monitoramento"
                      style={{
                        padding: '7px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
                        border: '1px solid #ef444444', background: 'transparent',
                        color: '#ef4444', cursor: removing === item.mat_codigo ? 'not-allowed' : 'pointer',
                        opacity: removing === item.mat_codigo ? 0.6 : 1,
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}
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
      )}
    </div>
  );
};
