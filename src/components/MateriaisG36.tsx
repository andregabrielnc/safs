import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search, RefreshCw, Package, Bell,
  AlertTriangle, TrendingDown, Clock, Printer, FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../utils/api';
import type { Material, MateriaisResponse, MonitoredItem, Stats } from '../utils/api';
import { AlertBadge } from './AlertBadge';
import { MaterialDetail } from './MaterialDetail';
import { MonitoramentoModal } from './MonitoramentoModal';

interface Props { almox: number }

type AlertFilter = 'todos' | 'critico' | 'baixo' | 'atencao' | 'normal';

const LIMIT = 60;

const FILTER_META: Record<AlertFilter, { label: string; color: string }> = {
  todos:   { label: 'Todos',   color: 'var(--primary)' },
  critico: { label: 'Crítico', color: '#ef4444' },
  baixo:   { label: 'Baixo',   color: '#f97316' },
  atencao: { label: 'Atenção', color: '#f59e0b' },
  normal:  { label: 'Normal',  color: '#10b981' },
};

export const MateriaisG36: React.FC<Props> = ({ almox }) => {
  const [data, setData]               = useState<MateriaisResponse | null>(null);
  const [stats, setStats]             = useState<Stats | null>(null);
  const [ruptura, setRuptura]         = useState<Material[] | null>(null);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('todos');
  const [loading, setLoading]         = useState(false);
  const [exporting, setExporting]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [selectedMat, setSelectedMat] = useState<number | null>(null);
  const [monitorModal, setMonitorModal] = useState<Material | null>(null);
  const [monitoredMap, setMonitoredMap] = useState<Map<number, number>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadSeqRef  = useRef(0);

  // ── Load table data ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true); setError(null);
    try {
      const result = await api.materiais({ page, limit: LIMIT, search: debouncedSearch, almox, alerta: alertFilter });
      if (seq !== loadSeqRef.current) return;
      setData(result);
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      setError(err instanceof Error ? err.message : 'Erro ao carregar materiais');
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [page, debouncedSearch, almox, alertFilter]);

  useEffect(() => { load(); }, [load]);

  // ── Load stats ───────────────────────────────────────────────────────────────
  useEffect(() => {
    api.stats(almox).then(setStats).catch(() => {});
  }, [almox]);

  // ── Load ruptura only when critico filter is active ──────────────────────────
  useEffect(() => {
    if (alertFilter === 'critico' && ruptura === null) {
      api.ruptura(almox, 90).then(setRuptura).catch(() => {});
    }
  }, [alertFilter, almox]);

  // Reset ruptura cache when almox changes
  useEffect(() => { setRuptura(null); }, [almox]);

  // ── Monitored map ────────────────────────────────────────────────────────────
  const refreshMonitored = useCallback(() => {
    api.itensMonitorados()
      .then((items: MonitoredItem[]) => {
        const m = new Map<number, number>();
        items.filter(i => i.almox === almox).forEach(i => m.set(i.mat_codigo, i.level_id));
        setMonitoredMap(m);
      })
      .catch(() => {});
  }, [almox]);
  useEffect(() => { refreshMonitored(); }, [refreshMonitored]);

  // ── Debounce search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
      if (search.trim().length >= 2) api.registrarBusca(search.trim(), almox).catch(() => {});
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, almox]);

  useEffect(() => { setPage(1); }, [alertFilter]);

  // ── Export helpers ───────────────────────────────────────────────────────────
  const fetchAll = async (): Promise<Material[]> => {
    const result = await api.materiais({ page: 1, limit: 9999, search: debouncedSearch, almox, alerta: alertFilter });
    return result.data;
  };

  const toExportRows = (rows: Material[]) => rows.map(m => ({
    Código: m.codigo,
    Nome: m.nome,
    Unidade: m.umd_codigo,
    Estoque: Number(m.estoque),
    'Consumo/mês': Number(m.media_consumo_mensal) > 0 ? Math.round(Number(m.media_consumo_mensal)) : '',
    'Esgota em (dias)': m.dias_ate_ruptura ?? '',
    'Último mês': m.ultimo_mes ?? '',
    Status: FILTER_META[m.alerta as AlertFilter]?.label ?? m.alerta,
  }));

  const handleExcel = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll();
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(toExportRows(rows));
      ws['!cols'] = [{ wch: 10 }, { wch: 52 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 10 }];
      const sheetName = alertFilter === 'todos' ? 'Materiais G36' : `G36 - ${FILTER_META[alertFilter].label}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const filename = `materiais-g36${alertFilter !== 'todos' ? `-${alertFilter}` : ''}${debouncedSearch ? `-${debouncedSearch.slice(0, 20)}` : ''}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch {}
    setExporting(false);
  };

  const handlePrint = () => window.print();

  // ── Ruptura breakdown ────────────────────────────────────────────────────────
  const rupturaUrgente  = (ruptura ?? []).filter(m => (m.dias_ate_ruptura ?? 9999) <= 15);
  const rupturaAtencao  = (ruptura ?? []).filter(m => { const d = m.dias_ate_ruptura ?? 9999; return d > 15 && d <= 30; });
  const rupturaModerate = (ruptura ?? []).filter(m => { const d = m.dias_ate_ruptura ?? 9999; return d > 30 && d <= 90; });

  if (selectedMat !== null) {
    return <MaterialDetail codigo={selectedMat} almox={almox} onBack={() => setSelectedMat(null)} />;
  }

  const filtered = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <>
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Materiais Hospitalares — Grupo 36</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {data ? `${data.total.toLocaleString('pt-BR')} materiais` : 'Carregando...'}
              {alertFilter !== 'todos' && (
                <span style={{ marginLeft: '6px', color: FILTER_META[alertFilter].color, fontWeight: 600 }}>
                  · {FILTER_META[alertFilter].label}
                </span>
              )}
            </p>
          </div>
          <button onClick={load} className="no-print" style={{
            background: 'var(--panel-highlight)', border: '1px solid var(--panel-border)',
            borderRadius: '8px', padding: '8px 14px', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem',
          }}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        {/* ── KPI Cards — informativos ─────────────────────────────────────────── */}
        <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {([
            { key: 'critico', label: 'Crítico',  color: '#ef4444', icon: AlertTriangle },
            { key: 'baixo',   label: 'Baixo',    color: '#f97316', icon: TrendingDown  },
            { key: 'atencao', label: 'Atenção',  color: '#f59e0b', icon: Clock         },
            { key: 'normal',  label: 'Normal',   color: '#10b981', icon: Package       },
            ...(alertFilter === 'critico' ? [
              { key: '_r15',  label: '≤ 15 dias',   color: '#ef4444', icon: AlertTriangle, value: ruptura === null ? '…' : String(rupturaUrgente.length)  },
              { key: '_r30',  label: '16–30 dias',  color: '#f97316', icon: Clock,         value: ruptura === null ? '…' : String(rupturaAtencao.length)  },
              { key: '_r90',  label: '31–90 dias',  color: '#f59e0b', icon: TrendingDown,  value: ruptura === null ? '…' : String(rupturaModerate.length) },
            ] : []),
          ] as { key: string; label: string; color: string; icon: React.ElementType; value?: string }[]).map(({ key, label, color, icon: Icon, value }) => {
            const count = value ?? (stats ? String((stats as unknown as Record<string, number>)[key] ?? '—') : '—');
            const isRuptura = key.startsWith('_r');
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px',
                background: 'var(--panel-highlight)',
                border: `1px solid ${color}33`,
                borderLeft: `3px solid ${color}`,
                borderRadius: '8px',
                minWidth: '110px',
              }}>
                <Icon size={14} color={color} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>
                    {isRuptura ? `Esgota ${label}` : label}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color, lineHeight: 1.2 }}>{count}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Search + Filter + Export ─────────────────────────────────────────── */}
        <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
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

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['todos', 'critico', 'baixo', 'atencao', 'normal'] as AlertFilter[]).map(f => {
              const { label, color } = FILTER_META[f];
              const isActive = alertFilter === f;
              return (
                <button key={f} onClick={() => setAlertFilter(f)} style={{
                  padding: '6px 14px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                  cursor: 'pointer', border: `1px solid ${color}44`,
                  background: isActive ? `${color}22` : 'transparent',
                  color: isActive ? color : 'var(--text-muted)',
                  transition: 'var(--transition-smooth)',
                }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Separator */}
          <div style={{ width: '1px', height: '28px', background: 'var(--panel-border)', flexShrink: 0 }} />

          {/* Export */}
          <button
            onClick={handleExcel}
            disabled={exporting || loading}
            title={`Exportar ${alertFilter !== 'todos' ? FILTER_META[alertFilter].label : 'todos'} para Excel`}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600,
              border: '1px solid var(--panel-border)', background: 'var(--panel-bg)',
              color: 'var(--text-muted)', cursor: exporting || loading ? 'not-allowed' : 'pointer',
              opacity: exporting || loading ? 0.5 : 1, whiteSpace: 'nowrap',
            }}
          >
            <FileSpreadsheet size={15} /> {exporting ? 'Exportando…' : 'Excel'}
          </button>
          <button
            onClick={handlePrint}
            title="Imprimir / salvar PDF"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600,
              border: '1px solid var(--panel-border)', background: 'var(--panel-bg)',
              color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <Printer size={15} /> PDF
          </button>

          {data && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', whiteSpace: 'nowrap', marginLeft: '4px' }}>
              {data.total.toLocaleString('pt-BR')} {data.total === 1 ? 'material' : 'materiais'}
            </span>
          )}
        </div>

        {/* ── Table ────────────────────────────────────────────────────────────── */}
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{error}</div>
          ) : loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Carregando materiais...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                    {['Código', 'Nome', 'Unidade', 'Estoque', 'Consumo/mês', 'Previsão Ruptura', 'Status', ''].map(h => (
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
                      style={{ borderBottom: '1px solid var(--panel-border)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-highlight)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{m.codigo}</td>
                      <td style={{ padding: '12px 16px', maxWidth: '320px' }}>
                        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.nome}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{m.umd_codigo}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                        <span style={{ color: m.alerta === 'critico' ? '#ef4444' : m.alerta === 'baixo' ? '#f97316' : m.alerta === 'atencao' ? '#f59e0b' : '#10b981' }}>
                          {Number(m.estoque).toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {Number(m.media_consumo_mensal) > 0 ? Math.round(Number(m.media_consumo_mensal)).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {m.dias_ate_ruptura !== null ? (
                          <span style={{ color: m.dias_ate_ruptura < 30 ? '#ef4444' : m.dias_ate_ruptura < 60 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                            {m.dias_ate_ruptura} dias
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}><AlertBadge level={m.alerta} /></td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }} className="no-print">
                        <button
                          onClick={e => { e.stopPropagation(); setMonitorModal(m); }}
                          title={monitoredMap.has(m.codigo) ? 'Monitorando — clique para editar' : 'Monitorar este material'}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                            color: monitoredMap.has(m.codigo) ? 'var(--primary)' : 'var(--text-muted)',
                            opacity: 0.7, transition: 'opacity 0.15s, color 0.15s',
                            display: 'flex', alignItems: 'center',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; }}
                        >
                          <Bell size={15} fill={monitoredMap.has(m.codigo) ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Package size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                        Nenhum material encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
              padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)',
              background: 'var(--panel-bg)', color: 'var(--text-muted)',
              cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1,
            }}>← Anterior</button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Página {page} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
              padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--panel-border)',
              background: 'var(--panel-bg)', color: 'var(--text-muted)',
              cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1,
            }}>Próxima →</button>
          </div>
        )}

        {monitorModal && (
          <MonitoramentoModal
            matCodigo={monitorModal.codigo}
            matNome={monitorModal.nome}
            matUmd={monitorModal.umd_codigo}
            almox={almox}
            currentLevelId={monitoredMap.get(monitorModal.codigo) ?? null}
            onClose={() => setMonitorModal(null)}
            onSave={refreshMonitored}
          />
        )}
      </div>
    </>
  );
};
