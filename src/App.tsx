import { useState, useEffect } from 'react';
import { AppLayout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { MateriaisG36 } from './components/MateriaisG36';
import { MaterialDetail } from './components/MaterialDetail';
import { Monitoramento } from './components/Monitoramento';
import { ItensMonitorados } from './components/ItensMonitorados';
import { api } from './utils/api';

type Page = 'dashboard' | 'materiais' | 'monitoramento' | 'monitorados';

function App() {
  const [theme, setTheme] = useState('light');
  const [page, setPage] = useState<Page>('dashboard');
  const [almox, setAlmox] = useState(1);
  const [almoxarifados, setAlmoxarifados] = useState<{ seq: number; descricao: string }[]>([]);
  const [selectedMat, setSelectedMat] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    api.almoxarifados()
      .then(setAlmoxarifados)
      .catch(err => console.error('Erro ao carregar almoxarifados:', err));
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleSelectMaterial = (codigo: number) => {
    setSelectedMat(codigo);
    setPage('materiais');
  };

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
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;
