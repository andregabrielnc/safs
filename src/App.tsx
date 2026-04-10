import { useState, useEffect } from 'react';
import { AppLayout } from './components/Layout';
import { Dashboard } from './components/Dashboard';

function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <AppLayout theme={theme} toggleTheme={toggleTheme}>
      <Dashboard theme={theme} />
    </AppLayout>
  );
}

export default App;
