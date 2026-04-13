import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Search, RefreshCw, Package } from 'lucide-react';
import { api } from '../utils/api';
import type { Material, MateriaisResponse } from '../utils/api';
import { AlertBadge } from './AlertBadge';
import { MaterialDetail } from './MaterialDetail';

interface Props {
  almox: number;
}

type AlertFilter = 'todos' | 'critico' | 'baixo' | 'atencao' | 'normal';

const LIMIT = 60;

export const MateriaisG36: React.FC<Props> = ({ almox }) => {
  const [data, setData] = useState<MateriaisResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('todos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMat, setSelectedMat] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stale-request guard: only the most recent load call may update state
  const loadSeqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.materiais({ page, limit: LIMIT, search: debouncedSearch, almox });
      if (seq !== loadSeqRef.current) return; // discard stale response
      setData(result);
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      setError(err instanceof Error ? err.message : 'Erro ao carregar materiais');
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [page, debouncedSearch, almox]);

  useEffect(() => { load(); }, [load]);

  // Debounce search — reset to page 1
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Reset to page 1 when alert filter changes
  useEffect(() => {
    setPage(1);
  }, [alertFilter]);

  if (selectedMat !== null) {
    return <MaterialDetail codigo={selectedMat} almox={almox} onBack={() => setSelectedMat(null)} />;
  }

  const filtered = alertFilter === 'todos'
    ? (data?.data ?? [])
    : (data?.data ?? []).filter(m => m.alerta === alertFilter);

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;
  const filterActive = alertFilter !== 'todos';

  return (
    <div className="content-area">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Materiais Hospitalares — Grupo 36</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {data
              ? filterActive
                ? `${filtered.length} de ${LIMIT} materiais nesta página · ${data.total.toLocaleString('pt-BR')} no total`
                : `${data.total.toLocaleString('pt-BR')} materiais encontrados`
              : 'Carregando...'}
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

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: '38px', paddingRight: '12px',
              padding: '10px 12px 10px 38px',
              background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
              borderRadius: '10px', color: 'var(--text-main)', fontSize: '0.9rem',
              outline: 'none', transition: 'var(--transition-smooth)',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['todos', 'critico', 'baixo', 'atencao', 'normal'] as AlertFilter[]).map(f => {
            const colors: Record<AlertFilter, string> = {
              todos: 'var(--primary)', critico: '#ef4444', baixo: '#f97316', atencao: '#f59e0b', normal: '#10b981',
            };
            const labels: Record<AlertFilter, string> = {
              todos: 'Todos', critico: 'Crítico', baixo: 'Baixo', atencao: 'Atenção', normal: 'Normal',
            };
            const isActive = alertFilter === f;
            return (
              <button key={f} onClick={() => setAlertFilter(f)} style={{
                padding: '6px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer', border: `1px solid ${colors[f]}44`,
                background: isActive ? `${colors[f]}22` : 'transparent',
                color: isActive ? colors[f] : 'var(--text-muted)',
                transition: 'var(--transition-smooth)',
              }}>
                {labels[f]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alert filter scope warning */}
      {filterActive && (
        <div style={{
          padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          color: '#f59e0b',
        }}>
          ⚠ O filtro é aplicado por página. Use a paginação abaixo para verificar outras páginas.
        </div>
      )}

      {/* Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
            {error}
          </div>
        ) : loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando materiais...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  {['Código', 'Nome', 'Unidade', 'Estoque', 'Consumo Médio/mês', 'Previsão Ruptura', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '14px 16px', textAlign: 'left',
                      color: 'var(--text-muted)', fontWeight: 600,
                      fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: Material) => (
                  <tr
                    key={m.codigo}
                    onClick={() => setSelectedMat(m.codigo)}
                    style={{
                      borderBottom: '1px solid var(--panel-border)',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-highlight)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {m.codigo}
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: '320px' }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.nome}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{m.umd_codigo}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                      <span style={{ color: m.alerta === 'critico' ? '#ef4444' : m.alerta === 'baixo' ? '#f97316' : m.alerta === 'atencao' ? '#f59e0b' : '#10b981' }}>
                        {Number(m.estoque).toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {Number(m.media_consumo_mensal) > 0
                        ? Math.round(Number(m.media_consumo_mensal)).toLocaleString('pt-BR')
                        : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {m.dias_ate_ruptura !== null ? (
                        <span style={{ color: m.dias_ate_ruptura < 30 ? '#ef4444' : m.dias_ate_ruptura < 60 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                          {m.dias_ate_ruptura} dias
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <AlertBadge level={m.alerta} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Package size={32} style={{ opacity: 0.3, marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                      Nenhum material encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
            padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)',
            background: 'var(--panel-bg)', color: 'var(--text-muted)', cursor: page === 1 ? 'not-allowed' : 'pointer',
            opacity: page === 1 ? 0.4 : 1,
          }}>← Anterior</button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Página {page} de {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
            padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)',
            background: 'var(--panel-bg)', color: 'var(--text-muted)', cursor: page === totalPages ? 'not-allowed' : 'pointer',
            opacity: page === totalPages ? 0.4 : 1,
          }}>Próxima →</button>
        </div>
      )}
    </div>
  );
};
