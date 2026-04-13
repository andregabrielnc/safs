import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, TrendingDown, Search, Package, Printer, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../utils/api';
import type { Material } from '../utils/api';
import { AlertBadge } from './AlertBadge';
import { MaterialDetail } from './MaterialDetail';

interface Props {
  almox: number;
}

const PAGE_SIZE = 50;

const ALERT_LABELS: Record<string, string> = {
  critico: 'Crítico',
  baixo: 'Baixo',
  atencao: 'Atenção',
  normal: 'Normal',
};

function criticalidadeColor(dias: number | null): string {
  if (dias === null) return 'var(--text-muted)';
  if (dias <= 15) return '#ef4444';
  if (dias <= 30) return '#f97316';
  return '#f59e0b';
}

export const Previsor: React.FC<Props> = ({ almox }) => {
  const [data, setData] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const first = await api.materiais({ almox, limit: 200, page: 1 });
        if (cancelled) return;

        const totalPages = Math.ceil(first.total / 200);
        let allMateriais = [...first.data];

        for (let p = 2; p <= totalPages; p++) {
          if (cancelled) return;
          const result = await api.materiais({ almox, limit: 200, page: p });
          allMateriais = allMateriais.concat(result.data);
        }

        const withCriticidade = allMateriais
          .filter(m => m.dias_ate_ruptura !== null && m.dias_ate_ruptura <= 90)
          .sort((a, b) => (a.dias_ate_ruptura ?? 9999) - (b.dias_ate_ruptura ?? 9999));
        setData(withCriticidade);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erro ao carregar previsões');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [almox]);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  if (selected !== null) {
    return <MaterialDetail codigo={selected} almox={almox} onBack={() => setSelected(null)} />;
  }

  const urgente  = data.filter(m => (m.dias_ate_ruptura ?? 9999) <= 15);
  const atencao  = data.filter(m => (m.dias_ate_ruptura ?? 9999) > 15 && (m.dias_ate_ruptura ?? 9999) <= 30);
  const moderado = data.filter(m => (m.dias_ate_ruptura ?? 9999) > 30 && (m.dias_ate_ruptura ?? 9999) <= 90);

  const searchLower = search.toLowerCase().trim();
  const filtered = searchLower
    ? data.filter(m =>
        m.nome.toLowerCase().includes(searchLower) ||
        String(m.codigo).includes(searchLower)
      )
    : data;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Export helpers ──────────────────────────────────────────────────────────

  const exportRows = () => filtered.map(m => ({
    Código: m.codigo,
    Nome: m.nome,
    Unidade: m.umd_codigo,
    Estoque: Number(m.estoque),
    'Consumo/mês': Number(m.media_consumo_mensal) > 0 ? Math.round(Number(m.media_consumo_mensal)) : '',
    'Esgota em (dias)': m.dias_ate_ruptura ?? '',
    'Data Prevista': m.dias_ate_ruptura !== null
      ? new Date(Date.now() + m.dias_ate_ruptura * 86400000).toLocaleDateString('pt-BR')
      : '',
    Status: ALERT_LABELS[m.alerta] ?? m.alerta,
  }));

  const handleExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows());
    ws['!cols'] = [
      { wch: 10 }, { wch: 50 }, { wch: 8 }, { wch: 10 },
      { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Criticidade');
    XLSX.writeFile(wb, `criticidade-estoque-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = () => window.print();

  // ── Button style helper ─────────────────────────────────────────────────────
  const iconBtn = (title: string, onClick: () => void, children: React.ReactNode) => (
    <button
      title={title}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '6px', padding: '9px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600,
        border: '1px solid var(--panel-border)', background: 'var(--panel-bg)',
        color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'var(--transition-smooth)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-main)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
    >
      {children}
    </button>
  );

  return (
    <>
      {/* Print styles injected once */}
      <style>{`
        @media print {
          .sidebar, .top-nav, .no-print { display: none !important; }
          .content-area { padding: 0 !important; }
          body { background: #fff !important; color: #000 !important; }
          table { font-size: 10pt !important; }
          th, td { border: 1px solid #ccc !important; padding: 4px 8px !important; }
          thead { background: #f3f4f6 !important; print-color-adjust: exact; }
        }
      `}</style>

      <div className="content-area">
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Previsor de Criticidade de Estoque</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Materiais com Estoque Crítico nos próximos 90 dias — baseado na média de consumo dos últimos 6 meses
          </p>
        </div>

        {/* KPI cards */}
        <div className="kpi-grid">
          {[
            { label: 'Estoque Crítico ≤ 15 dias',  count: loading ? '—' : urgente.length,  color: '#ef4444', icon: AlertTriangle },
            { label: 'Estoque Crítico 16–30 dias', count: loading ? '—' : atencao.length,  color: '#f97316', icon: Clock },
            { label: 'Estoque Crítico 31–90 dias', count: loading ? '—' : moderado.length, color: '#f59e0b', icon: TrendingDown },
          ].map(({ label, count, color, icon: Icon }) => (
            <div key={label} className="glass-panel kpi-card" style={{ borderTop: `2px solid ${color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="kpi-title">{label}</span>
                <Icon size={20} color={color} />
              </div>
              <div className="kpi-value" style={{ color }}>{count}</div>
            </div>
          ))}
        </div>

        {error ? (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>
            {error}
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Analisando criticidade dos materiais...
          </div>
        ) : (
          <>
            {/* Search + export + count */}
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Search input */}
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou código..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 38px',
                    background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
                    borderRadius: '10px', color: 'var(--text-main)', fontSize: '0.9rem',
                    outline: 'none', transition: 'var(--transition-smooth)',
                  }}
                />
              </div>

              {/* Export buttons */}
              {iconBtn('Exportar para Excel', handleExcel, <><FileSpreadsheet size={15} /> Excel</>)}
              {iconBtn('Imprimir / Salvar PDF', handlePrint, <><Printer size={15} /> PDF</>)}

              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                {filtered.length} {filtered.length === 1 ? 'material' : 'materiais'}
                {searchLower ? ' encontrados' : ' em criticidade'}
              </span>
            </div>

            {/* Table */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Package size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                  Nenhum material encontrado para "{search}"
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                        {['Código', 'Nome', 'Estoque', 'Consumo/mês', 'Esgota em', 'Data Prevista', 'Status'].map(h => (
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
                      {paginated.map(m => {
                        const color = criticalidadeColor(m.dias_ate_ruptura);
                        const dataEsgotamento = m.dias_ate_ruptura !== null
                          ? new Date(Date.now() + m.dias_ate_ruptura * 86400000).toLocaleDateString('pt-BR')
                          : '—';
                        return (
                          <tr key={m.codigo} onClick={() => setSelected(m.codigo)}
                            style={{ borderBottom: '1px solid var(--panel-border)', cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-highlight)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{m.codigo}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 500, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color }}>{Number(m.estoque).toLocaleString('pt-BR')}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                              {Number(m.media_consumo_mensal) > 0 ? Math.round(Number(m.media_consumo_mensal)).toLocaleString('pt-BR') : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color }}>{m.dias_ate_ruptura} dias</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{dataEsgotamento}</td>
                            <td style={{ padding: '12px 16px' }}><AlertBadge level={m.alerta} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
                  padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)',
                  background: 'var(--panel-bg)', color: 'var(--text-muted)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1,
                }}>← Anterior</button>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Página {page} de {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
                  padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)',
                  background: 'var(--panel-bg)', color: 'var(--text-muted)',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1,
                }}>Próxima →</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
