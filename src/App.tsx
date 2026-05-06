import { useState, useEffect } from 'react';
import { AppLayout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { MateriaisG36 } from './components/MateriaisG36';
import { MaterialDetail } from './components/MaterialDetail';
import { Monitoramento } from './components/Monitoramento';
import { ItensMonitorados } from './components/ItensMonitorados';
import { LoginPage } from './components/LoginPage';
import { api, auth, setOnUnauthorized } from './utils/api';
import type { AuthUser } from './utils/api';

type Page = 'dashboard' | 'materiais' | 'monitoramento' | 'monitorados';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('safs_theme') || 'light');
  const [page, setPage] = useState<Page>('dashboard');
  const [almox, setAlmox] = useState(() => Number(localStorage.getItem('safs_almox')) || 1);
  const [almoxarifados, setAlmoxarifados] = useState<{ seq: number; descricao: string }[]>([]);
  const [selectedMat, setSelectedMat] = useState<number | null>(null);
  const [user, setUser] = useState<AuthUser | null>(() => auth.getUser());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('safs_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('safs_almox', String(almox));
  }, [almox]);

  // Wire 401 handler from api.ts to drop user state
  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
  }, []);

  // Validate stored token on mount
  useEffect(() => {
    if (!user) return;
    api.me().catch(() => { auth.clear(); setUser(null); });
  }, []);

  // Load almoxarifados once authenticated
  useEffect(() => {
    if (!user) return;
    api.almoxarifados()
      .then(setAlmoxarifados)
      .catch(err => console.error('Erro ao carregar almoxarifados:', err));
  }, [user]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleSelectMaterial = (codigo: number) => {
    setSelectedMat(codigo);
    setPage('materiais');
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const renderPage = () => {
    if (selectedMat !== null && page === 'materiais') {
      return (
        <MaterialDetail
          codigo={selectedMat}
          almox={almox}
          onBack={() => setSelectedMat(null)}
        />
      );
    }
    switch (page) {
      case 'dashboard':
        return <Dashboard almox={almox} onSelectMaterial={handleSelectMaterial} onNavigate={p => setPage(p as Page)} />;
      case 'materiais':
        return <MateriaisG36 almox={almox} />;
      case 'monitoramento':
        return <Monitoramento />;
      case 'monitorados':
        return <ItensMonitorados almox={almox} onSelectMaterial={handleSelectMaterial} />;
    }
  };

  return (
    <AppLayout
      theme={theme}
      toggleTheme={toggleTheme}
      currentPage={page}
      onNavigate={p => { setPage(p as Page); setSelectedMat(null); }}
      almox={almox}
      almoxarifados={almoxarifados}
      onAlmoxChange={setAlmox}
      user={user}
      onLogout={handleLogout}
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;
