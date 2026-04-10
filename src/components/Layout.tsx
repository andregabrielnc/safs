import React from 'react';
import { LayoutDashboard, Package, TrendingUp, DollarSign, Settings, Activity, Sun, Moon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  theme: string;
  toggleTheme: () => void;
}

const Navbar: React.FC<{ theme: string; toggleTheme: () => void }> = ({ theme, toggleTheme }) => {
  return (
    <div className="top-nav">
      <div style={{ flex: 1 }}></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={toggleTheme} style={{ 
          background: 'var(--panel-highlight)', 
          border: '1px solid var(--panel-border)', 
          borderRadius: '50%',
          width: '36px', height: '36px',
          cursor: 'pointer', 
          color: 'var(--text-main)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'var(--transition-smooth)'
        }}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'var(--primary)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--bg-dark)', fontWeight: 'bold'
        }}>
          AG
        </div>
      </div>
    </div>
  );
};

const Sidebar: React.FC = () => {
  return (
    <div className="sidebar">
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px',
        paddingLeft: '8px'
      }}>
        <Activity size={32} color="var(--primary)" />
        <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem' }}>Materiais AGHU</h2>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column' }}>
        <a href="#" className="nav-item active">
          <LayoutDashboard size={20} /> Dashboard
        </a>
        <a href="#" className="nav-item">
          <Package size={20} /> Estoque Geral
        </a>
        <a href="#" className="nav-item">
          <TrendingUp size={20} /> Curva ABC
        </a>
        <a href="#" className="nav-item">
          <DollarSign size={20} /> Faturamento
        </a>
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <a href="#" className="nav-item">
          <Settings size={20} /> Configurações
        </a>
      </div>
    </div>
  );
};

export const AppLayout: React.FC<LayoutProps> = ({ children, theme, toggleTheme }) => {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="main-content">
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        {children}
      </main>
    </div>
  );
};
