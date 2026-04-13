import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../utils/api';
import type { Notification } from '../utils/api';

interface Props {
  onNavigateMonitorados: () => void;
}

export const NotificationBell: React.FC<Props> = ({ onNavigateMonitorados }) => {
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = () =>
    api.unreadCount().then(r => setUnread(r.total)).catch(() => {});

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    api.notificacoes().then(setNotifications).catch(() => {});
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => setOpen(prev => !prev);

  const handleMarkRead = async () => {
    await api.markAllRead().catch(() => {});
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, lida: 1 })));
  };

  const handleViewAll = () => {
    setOpen(false);
    onNavigateMonitorados();
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        title="Notificações de monitoramento"
        style={{
          position: 'relative',
          background: 'var(--panel-highlight)',
          border: '1px solid var(--panel-border)',
          borderRadius: '50%',
          width: '36px', height: '36px',
          cursor: 'pointer',
          color: 'var(--text-main)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: '#ef4444', color: '#fff',
            borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700,
            padding: '1px 5px', lineHeight: '1.4',
            minWidth: '16px', textAlign: 'center',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: '340px', maxHeight: '420px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          overflow: 'hidden', zIndex: 1000,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--panel-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notificações</span>
            {unread > 0 && (
              <button onClick={handleMarkRead} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600,
              }}>
                Marcar tudo como lido
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Nenhuma notificação
              </div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div key={n.id} style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--panel-border)',
                  background: n.lida ? 'transparent' : 'rgba(var(--primary-rgb, 0,210,255), 0.04)',
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                }}>
                  <span style={{
                    display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                    background: n.level_cor, marginTop: '5px', flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.mat_nome}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Nível <span style={{ color: n.level_cor, fontWeight: 600 }}>{n.level_nome}</span>
                      {' '}— estoque: {Number(n.estoque).toLocaleString('pt-BR')}
                      {' '}(limite: {n.quantidade})
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {formatDate(n.criado_em)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--panel-border)', textAlign: 'center' }}>
            <button onClick={handleViewAll} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600,
            }}>
              Ver itens monitorados →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
