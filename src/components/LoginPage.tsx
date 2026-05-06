import React, { useState } from 'react';
import { Activity, User, Lock, LogIn, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import type { AuthUser } from '../utils/api';

interface Props {
  onLogin: (user: AuthUser) => void;
}

export const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { user } = await api.login(username.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao autenticar');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px 32px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
          <Activity size={32} color="var(--primary)" />
          <h1 className="text-gradient" style={{ margin: 0, fontSize: '1.5rem' }}>Materiais AGHU</h1>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '32px' }}>
          Acesse com seu usuário do Active Directory
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Username */}
          <div>
            <label htmlFor="username" style={{
              display: 'block', fontSize: '0.72rem', textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px',
            }}>Usuário</label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{
                position: 'absolute', left: '12px', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                id="username"
                type="text"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="nome.sobrenome"
                disabled={loading}
                style={{
                  width: '100%', padding: '11px 12px 11px 38px',
                  background: 'var(--panel-highlight)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  color: 'var(--text-main)', fontSize: '0.9rem',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" style={{
              display: 'block', fontSize: '0.72rem', textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px',
            }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{
                position: 'absolute', left: '12px', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
              }} />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                style={{
                  width: '100%', padding: '11px 12px 11px 38px',
                  background: 'var(--panel-highlight)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  color: 'var(--text-main)', fontSize: '0.9rem',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {error && (
            <div role="alert" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 12px',
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: '8px',
              color: '#ef4444', fontSize: '0.82rem',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            style={{
              marginTop: '8px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary)',
              color: 'var(--bg-dark)',
              fontWeight: 700, fontSize: '0.9rem',
              cursor: (loading || !username.trim() || !password) ? 'not-allowed' : 'pointer',
              opacity: (loading || !username.trim() || !password) ? 0.55 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'opacity 0.2s',
            }}
          >
            <LogIn size={16} />
            {loading ? 'Autenticando…' : 'Entrar'}
          </button>
        </form>

        <p style={{
          marginTop: '24px', textAlign: 'center',
          fontSize: '0.72rem', color: 'var(--text-muted)',
        }}>
          Hospital das Clínicas — UFG / EBSERH
        </p>
      </div>
    </div>
  );
};
