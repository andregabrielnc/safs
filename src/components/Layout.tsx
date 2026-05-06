import React from 'react';
import { LayoutDashboard, Package, Sun, Moon, Activity, Bell, LogOut, BellRing } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import type { AuthUser } from '../utils/api';

interface LayoutProps {
  children: React.ReactNode;
  theme: string;
  toggleTheme: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  almox: number;
  almoxarifados: { seq: number; descricao: string }[];
  onAlmoxChange: (seq: number) => void;
  user: AuthUser;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard',     label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'materiais',     label: 'Materiais G36',     icon: Package },
  { id: 'monitorados',   label: 'Itens Monitorados', icon: BellRing },
  { id: 'monitoramento', label: 'Monitoramento',     icon: Bell },
];

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const AppLayout: React.FC<LayoutProps> = ({
  children, theme, toggleTheme, currentPage, onNavigate,
  almox, almoxarifados, onAlmoxChange, user, onLogout,
}) => {
  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', paddingLeft: '8px' }}>
          <Activity size={28} color="var(--primary)" />
          <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.3rem' }}>Materiais AGHU</h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`nav-item${currentPage === id ? ' active' : ''}`}
              style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer' }}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>

        {/* Almoxarifado selector */}
        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--panel-border)' }}>
          <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
            Almoxarifado
          </label>
          <select
            value={almox}
            onChange={e => onAlmoxChange(Number(e.target.value))}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: '8px',
              background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
              color: 'var(--text-main)', fontSize: '0.8rem', cursor: 'pointer', outline: 'none',
            }}
          >
            {almoxarifados.map(a => (
              <option key={a.seq} value={a.seq}>{a.descricao}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main */}
      <main className="main-content">
        {/* Top nav */}
        <div className="top-nav">
          <div style={{ flex: 1 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {navItems.find(n => n.id === currentPage)?.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <NotificationBell onNavigateMonitorados={() => onNavigate('monitorados')} />
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'} style={{
              background: 'var(--panel-highlight)', border: '1px solid var(--panel-border)',
              borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer',
              color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--panel-border)' }}>
              <div title={user.email} style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'var(--primary)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--bg-dark)', fontWeight: 700, fontSize: '0.8rem',
              }}>{userInitials(user.name)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {user.username}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Sair"
                aria-label="Sair"
                style={{
                  background: 'var(--panel-highlight)', border: '1px solid var(--panel-border)',
                  borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginLeft: '4px',
                }}
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
};
