import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Package, TrendingUp, AlertTriangle, Calendar, FileText, Bell, BellOff, X, Search } from 'lucide-react';
import { Line } from '@ant-design/plots';
import { api } from '../utils/api';
import type { ConsumoMensal, MaterialDetalhe, EneContrato, MonitoringLevel } from '../utils/api';
import { AlertBadge } from './AlertBadge';

interface Props {
  codigo: number;
  almox: number;
  onBack: () => void;
}

// Linear regression helper
function linearRegression(data: { x: number; y: number }[]) {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: data[0].y };
  const sumX  = data.reduce((s, d) => s + d.x, 0);
  const sumY  = data.reduce((s, d) => s + d.y, 0);
  const sumXY = data.reduce((s, d) => s + d.x * d.y, 0);
  const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export const MaterialDetail: React.FC<Props> = ({ codigo, almox, onBack }) => {
  const [detalhe, setDetalhe] = useState<MaterialDetalhe | null>(null);
  const [consumo, setConsumo] = useState<ConsumoMensal[]>([]);
  const [ene, setEne] = useState<EneContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'ene'>('geral');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, c, e] = await Promise.all([
        api.material(codigo, almox),
        api.consumo(codigo, almox, 24),
        api.eneContratos(codigo).catch(() => [] as EneContrato[]),
      ]);
      setDetalhe(d);
      setConsumo(c);
      setEne(e);
      // Registra acesso para histórico de itens recorrentes (fire-and-forget)
      api.registrarAcesso(d.codigo, d.nome, almox).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar material');
    } finally {
      setLoading(false);
    }
  }, [codigo, almox]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="content-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Carregando dados...</div>
    </div>
  );

  if (error) return (
    <div className="content-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#ef4444', fontSize: '1rem' }}>{error}</div>
    </div>
  );

  if (!detalhe) return null;

  const estoque = Number(detalhe.estoque) || 0;

  // Only complete months with real consumption for stats and trend (exclude current partial month)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const mesesConsumo = consumo.filter(c => c.quantidade !== null && Number(c.quantidade) > 0 && c.competencia < currentMonth);
  const mediaConsumo = mesesConsumo.length
    ? mesesConsumo.slice(-6).reduce((s, c) => s + Number(c.quantidade), 0) / Math.min(mesesConsumo.length, 6)
    : 0;
  const diasAteRuptura = mediaConsumo > 0 ? Math.round(estoque / (mediaConsumo / 30)) : null;

  // alerta comes from backend (uses configured criticality thresholds)
  const alerta = detalhe.alerta ?? (estoque === 0 ? 'critico' : 'normal');

  // Build chart data — Tendência only when there are enough real consumption points
  const TREND_MIN = 3;
  const hasTrend = mesesConsumo.length >= TREND_MIN;
  const chartData: { mes: string; valor: number; tipo: string }[] = [];

  // G2 v5 requires consecutive same-series blocks: Consumo Real → Tendência → Estoque
  const hasSaldo = consumo.some(c => c.saldo !== null);

  // Only push real consumption months (skip stock-only months with null quantidade)
  mesesConsumo.forEach((c) => {
    chartData.push({ mes: c.competencia, valor: Number(c.quantidade), tipo: 'Consumo Real' });
  });
  if (hasTrend) {
    // Regression uses sequential index over real consumption months only
    const consumoArr = mesesConsumo.map((c, i) => ({ x: i, y: Number(c.quantidade) }));
    const reg = linearRegression(consumoArr);
    mesesConsumo.forEach((c, i) => {
      chartData.push({ mes: c.competencia, valor: Math.max(0, Math.round(reg.slope * i + reg.intercept)), tipo: 'Tendência' });
    });
  }
  if (hasSaldo) {
    consumo.forEach((c) => {
      if (c.saldo !== null) {
        chartData.push({ mes: c.competencia, valor: Number(c.saldo), tipo: 'Estoque' });
      }
    });
  }

  // Predictor: project forward until stock reaches zero
  const previsaoData: { mes: string; valor: number; tipo: string }[] = [];
  if (mediaConsumo > 0 && diasAteRuptura !== null) {
    let estqAtual = estoque;
    const lastDate = consumo.length ? new Date(consumo[consumo.length - 1].competencia + '-01') : new Date();
    for (let m = 1; m <= Math.min(Math.ceil(diasAteRuptura / 30) + 2, 12); m++) {
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + m);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      estqAtual = Math.max(0, estqAtual - mediaConsumo);
      previsaoData.push({ mes: label, valor: Math.round(estqAtual), tipo: 'Estoque Previsto' });
    }
  }

  const hasConsumo  = mesesConsumo.length > 0;
  const colorDomain = [
    ...(hasConsumo ? ['Consumo Real'] : []),
    ...(hasTrend   ? ['Tendência']   : []),
    ...(hasSaldo   ? ['Estoque']     : []),
  ];
  const colorRange = [
    ...(hasConsumo ? ['#00d2ff'] : []),
    ...(hasTrend   ? ['#f59e0b'] : []),
    ...(hasSaldo   ? ['#a78bfa'] : []),
  ];

  // All months across every series, sorted chronologically.
  // G2 v5 determines x-axis order by first appearance in data[]; since
  // mesesConsumo is sparse (no stock-only months), stock months would be
  // appended out of order causing zigzag. Explicit domain fixes this.
  const allMonths = [...new Set([
    ...mesesConsumo.map(c => c.competencia),
    ...consumo.filter(c => c.saldo !== null).map(c => c.competencia),
  ])].sort();

  const consumoConfig = {
    data: chartData,
    xField: 'mes',
    yField: 'valor',
    colorField: 'tipo',
    scale: { x: { domain: allMonths }, color: { domain: colorDomain, range: colorRange } },
    style: { lineWidth: 2 },
    point: { size: 3 },
    axis: {
      x: { labelAutoRotate: true, labelFill: '#94a3b8' },
      y: { labelFill: '#94a3b8' },
    },
    tooltip: {
      items: [
        { field: 'tipo', name: 'Série' },
        { field: 'valor', name: 'Qtd', valueFormatter: (v: number) => v.toLocaleString('pt-BR') },
      ],
    },
  };

  const previsaoConfig = {
    data: previsaoData,
    xField: 'mes',
    yField: 'valor',
    style: { stroke: '#ef4444', lineWidth: 2 },
    point: { shapeField: 'diamond', sizeField: 4 },
    axis: {
      x: { labelFill: '#94a3b8' },
      y: { labelFill: '#94a3b8' },
    },
    annotations: previsaoData.some(d => d.valor === 0) ? [
      {
        type: 'lineY',
        data: [0],
        style: { stroke: '#ef4444', lineDash: [4, 4] },
        label: { text: 'Esgotamento', style: { fill: '#ef4444', fontSize: 12 } },
      },
    ] : [],
    tooltip: {
      items: [
        { field: 'valor', name: 'Estoque', valueFormatter: (v: number) => v.toLocaleString('pt-BR') },
      ],
    },
  };

  return (
    <div className="content-area">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={onBack} style={{
          background: 'var(--panel-highlight)', border: '1px solid var(--panel-border)',
          borderRadius: '8px', padding: '8px 14px', color: 'var(--text-main)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '0.875rem', transition: 'var(--transition-smooth)',
        }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0 }}>#{detalhe.codigo}</h2>
            <AlertBadge level={alerta} />
          </div>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.875rem', maxWidth: '600px' }}>
            {detalhe.nome}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0' }}>
        {([
          { key: 'geral', label: 'Visão Geral' },
          { key: 'ene',   label: `ENE / Contratos${ene.length > 0 ? ` (${ene.length})` : ''}` },
        ] as { key: 'geral' | 'ene'; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 18px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: activeTab === tab.key ? 600 : 400,
              marginBottom: '-1px', transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: activeTab === 'geral' ? 'contents' : 'none' }}>
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="glass-panel kpi-card" style={{ borderTop: '2px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="kpi-title">Estoque Atual</span>
            <Package size={20} color="var(--primary)" />
          </div>
          <div className="kpi-value" style={{ color: estoque === 0 ? '#ef4444' : estoque < 20 ? '#f59e0b' : 'var(--primary)' }}>
            {estoque.toLocaleString('pt-BR')} {detalhe.umd_codigo}
          </div>
        </div>

        <div className="glass-panel kpi-card" style={{ borderTop: '2px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="kpi-title">Média Mensal (6m)</span>
            <TrendingUp size={20} color="#10b981" />
          </div>
          <div className="kpi-value" style={{ color: '#10b981' }}>
            {Math.round(mediaConsumo).toLocaleString('pt-BR')} {detalhe.umd_codigo}
          </div>
        </div>

        <div className="glass-panel kpi-card" style={{ borderTop: `2px solid ${diasAteRuptura !== null && diasAteRuptura < 30 ? '#ef4444' : '#f59e0b'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="kpi-title">Criticidade de Estoque</span>
            <AlertTriangle size={20} color={diasAteRuptura !== null && diasAteRuptura < 30 ? '#ef4444' : '#f59e0b'} />
          </div>
          <div className="kpi-value" style={{ color: diasAteRuptura !== null && diasAteRuptura < 30 ? '#ef4444' : '#f59e0b' }}>
            {diasAteRuptura !== null ? `${diasAteRuptura} dias` : estoque === 0 ? 'Zerado' : 'Sem consumo'}
          </div>
        </div>

        <div className="glass-panel kpi-card" style={{ borderTop: '2px solid var(--secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="kpi-title">Último Consumo</span>
            <Calendar size={20} color="var(--secondary)" />
          </div>
          <div className="kpi-value" style={{ fontSize: '1.2rem', color: 'var(--secondary)' }}>
            {detalhe.dt_ultimo_consumo
              ? new Date(detalhe.dt_ultimo_consumo).toLocaleDateString('pt-BR')
              : '—'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Consumo Mensal{hasTrend ? ' + Tendência' : ''}{hasSaldo ? ' + Estoque' : ''} (últimos 24 meses)
            </h3>
          </div>
          <div style={{ height: '280px' }}>
            {chartData.length > 0
              ? <Line {...consumoConfig} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Sem dados de consumo</div>
            }
          </div>
        </div>

        {previsaoData.length > 0 && (
          <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Previsão de Esgotamento
              </h3>
              {diasAteRuptura !== null && diasAteRuptura < 30 && (
                <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '6px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                  ⚠ Estoque Crítico — esgota em {diasAteRuptura} dias
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
              Projeção baseada na média dos últimos {Math.min(mesesConsumo.length, 6)} meses com consumo real ({Math.round(mediaConsumo).toLocaleString('pt-BR')} {detalhe.umd_codigo}/mês)
            </p>
            <div style={{ height: '240px' }}>
              <Line {...previsaoConfig} />
            </div>
          </div>
        )}
      </div>
      </div>

      <div style={{ display: activeTab === 'ene' ? 'contents' : 'none' }}>
        <EneTab
          contratos={ene}
          umd={detalhe.umd_codigo}
          matCodigo={detalhe.codigo}
          matNome={detalhe.nome}
          onMonitorChange={() => api.eneContratos(codigo).then(setEne).catch(() => {})}
        />
      </div>
    </div>
  );
};

// ── ENE tab ────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  'A EFETIVAR': { label: 'A Efetivar', bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
  'PARCIAL':    { label: 'Parcial',    bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  'EFETIVADO':  { label: 'Efetivado',  bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
  'CANCELADO':  { label: 'Cancelado',  bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
};

function isAtivo(c: EneContrato) {
  return (c.status === 'A EFETIVAR' || c.status === 'PARCIAL') && new Date(c.vencimento) >= new Date();
}

// ── Modal de monitoramento de contrato ────────────────────────────────────────
function ContratoMonitorModal({
  contrato, matCodigo, matNome, currentLevelId, onClose, onSave,
}: {
  contrato: EneContrato;
  matCodigo: number;
  matNome: string;
  currentLevelId: number | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [levels, setLevels] = useState<MonitoringLevel[]>([]);
  const [selected, setSelected] = useState<number | null>(currentLevelId);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => { api.niveis().then(setLevels).catch(() => {}); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.monitorarContrato({
        nro_af: contrato.nro_af, cpto: contrato.cpto,
        mat_codigo: matCodigo, mat_nome: matNome,
        pregao: contrato.pregao, fornecedor: contrato.fornecedor,
        qtde_contratada: contrato.qtde_contratada,
        level_id: selected,
      });
      onSave(); onClose();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.removerContratoMonitorado(contrato.nro_af, contrato.cpto);
      onSave(); onClose();
    } catch (err) { console.error(err); } finally { setRemoving(false); }
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px',
    }}>
      <div style={{
        background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
        borderRadius: '16px', width: '100%', maxWidth: '460px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Bell size={18} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Monitorar Contrato ENE</h3>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Pregão {contrato.pregao} · AF {contrato.nro_af}/{contrato.cpto}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Selecione o nível de alerta — acionado quando o saldo ficar abaixo do limite:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {levels.map(l => (
              <button key={l.id} onClick={() => setSelected(l.id)} style={{
                padding: '14px 16px',
                border: `2px solid ${selected === l.id ? l.cor : 'var(--panel-border)'}`,
                borderRadius: '10px', background: selected === l.id ? `${l.cor}18` : 'transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: l.cor, fontSize: '0.9rem' }}>{l.nome}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Aciona quando saldo ≤ {l.quantidade} unid.{' · '}{l.horarios.length} horário{l.horarios.length !== 1 ? 's' : ''}/dia
                  </div>
                </div>
                {selected === l.id && (
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: l.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div>
            {currentLevelId && (
              <button onClick={handleRemove} disabled={removing} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                borderRadius: '8px', fontSize: '0.82rem', border: '1px solid #ef444444',
                background: 'transparent', color: '#ef4444', cursor: removing ? 'not-allowed' : 'pointer', opacity: removing ? 0.6 : 1,
              }}>
                <BellOff size={14} /> {removing ? 'Removendo...' : 'Parar monitoramento'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '0.875rem', border: '1px solid var(--panel-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!selected || saving} style={{
              padding: '8px 18px', borderRadius: '8px', fontSize: '0.875rem', border: 'none',
              background: selected ? 'var(--primary)' : 'var(--panel-border)',
              color: selected ? 'var(--bg-dark)' : 'var(--text-muted)',
              cursor: !selected || saving ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContratoTable({
  rows, muted, matCodigo, matNome, onMonitorChange,
}: {
  rows: EneContrato[];
  muted?: boolean;
  matCodigo?: number;
  matNome?: string;
  onMonitorChange?: () => void;
}) {
  const [modalContrato, setModalContrato] = useState<EneContrato | null>(null);
  const opacity = muted ? 0.65 : 1;

  return (
    <>
      {modalContrato && matCodigo && matNome && (
        <ContratoMonitorModal
          contrato={modalContrato}
          matCodigo={matCodigo}
          matNome={matNome}
          currentLevelId={modalContrato.monitorado ?? null}
          onClose={() => setModalContrato(null)}
          onSave={() => { onMonitorChange?.(); setModalContrato(null); }}
        />
      )}
      <div style={{ overflowX: 'auto', opacity }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
              {['', 'Pregão', 'AF / Lote', 'Fornecedor', 'Item', 'Contratado', 'Empenhado', 'Saldo', 'Vencimento', 'Situação'].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left',
                  color: 'var(--text-muted)', fontWeight: 600,
                  fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => {
              const pct = c.qtde_contratada > 0 ? (c.qtde_empenhada / c.qtde_contratada) * 100 : 0;
              const saldoColor = c.saldo <= 0 ? '#ef4444' : c.saldo < c.qtde_contratada * 0.1 ? '#f59e0b' : '#10b981';
              const venc = new Date(c.vencimento);
              const daysLeft = Math.round((venc.getTime() - Date.now()) / 86400000);
              const vencColor = muted ? 'var(--text-muted)' : daysLeft < 30 ? '#ef4444' : daysLeft < 90 ? '#f59e0b' : 'var(--text-muted)';
              const st = STATUS_LABEL[c.status] ?? { label: c.status, bg: 'rgba(100,116,139,0.15)', color: '#64748b' };
              const isMonitored = c.monitorado != null;
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <td style={{ padding: '10px 8px 10px 14px', width: '32px' }}>
                    {!muted && matCodigo && (
                      <button
                        onClick={() => setModalContrato(c)}
                        title={isMonitored ? 'Monitorado — clique para alterar' : 'Adicionar ao monitoramento'}
                        style={{
                          background: isMonitored ? 'rgba(99,102,241,0.15)' : 'transparent',
                          border: `1px solid ${isMonitored ? '#6366f1' : 'var(--panel-border)'}`,
                          borderRadius: '6px', padding: '4px 6px', cursor: 'pointer',
                          color: isMonitored ? '#6366f1' : 'var(--text-muted)',
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        {isMonitored ? <Bell size={12} /> : <Bell size={12} />}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: muted ? 'var(--text-muted)' : 'var(--primary)', fontWeight: 600 }}>
                    {c.pregao}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {c.nro_af}/{c.cpto}
                  </td>
                  <td style={{ padding: '10px 14px', maxWidth: '220px' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: muted ? 'var(--text-muted)' : undefined }}>
                      {c.fornecedor}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', textAlign: 'center' }}>{c.item}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: muted ? 'var(--text-muted)' : undefined }}>
                    {c.qtde_contratada.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <div style={{ color: muted ? 'var(--text-muted)' : undefined }}>{c.qtde_empenhada.toLocaleString('pt-BR')}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</div>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>
                    <span style={{ color: muted ? 'var(--text-muted)' : saldoColor }}>{c.saldo.toLocaleString('pt-BR')}</span>
                  </td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: vencColor }}>
                    {venc.toLocaleDateString('pt-BR')}
                    {!muted && daysLeft < 90 && daysLeft > 0 && (
                      <div style={{ fontSize: '0.65rem' }}>{daysLeft}d restantes</div>
                    )}
                    {!muted && daysLeft <= 0 && (
                      <div style={{ fontSize: '0.65rem', color: '#ef4444' }}>Vencido</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: st.bg, color: st.color, borderRadius: '6px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EneTab({ contratos, umd, matCodigo, matNome, onMonitorChange }: {
  contratos: EneContrato[];
  umd: string;
  matCodigo: number;
  matNome: string;
  onMonitorChange: () => void;
}) {
  const [showHistorico, setShowHistorico] = useState(false);
  const [search, setSearch]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const ativos    = contratos.filter(c => isAtivo(c));
  const historico = contratos.filter(c => !isAtivo(c));

  // Apply search + date range to ativos only
  const ativosFiltered = ativos.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        c.pregao.toLowerCase().includes(q) ||
        c.fornecedor.toLowerCase().includes(q) ||
        String(c.nro_af).includes(q) ||
        String(c.cpto).includes(q);
      if (!match) return false;
    }
    if (dateFrom) {
      const venc = new Date(c.vencimento);
      if (venc < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const venc = new Date(c.vencimento);
      if (venc > new Date(dateTo + 'T23:59:59')) return false;
    }
    return true;
  });

  const totalContratadoAtivo = ativosFiltered.reduce((s, c) => s + c.qtde_contratada, 0);
  const totalEmpenhadoAtivo  = ativosFiltered.reduce((s, c) => s + c.qtde_empenhada,  0);
  const totalSaldoAtivo      = ativosFiltered.reduce((s, c) => s + c.saldo, 0);
  const monitoradosCount     = contratos.filter(c => c.monitorado != null).length;
  const hasFilter            = !!search || !!dateFrom || !!dateTo;

  if (contratos.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <FileText size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
        Nenhum contrato ENE encontrado para este material
      </div>
    );
  }

  return (
    <>
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="glass-panel kpi-card" style={{ borderTop: '2px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="kpi-title">Saldo Total (Ativos)</span>
            <FileText size={20} color="var(--primary)" />
          </div>
          <div className="kpi-value" style={{ color: totalSaldoAtivo <= 0 ? '#ef4444' : 'var(--primary)' }}>
            {totalSaldoAtivo.toLocaleString('pt-BR')} {umd}
          </div>
        </div>
        <div className="glass-panel kpi-card" style={{ borderTop: '2px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="kpi-title">Total Contratado</span>
            <Package size={20} color="#10b981" />
          </div>
          <div className="kpi-value" style={{ color: '#10b981' }}>
            {totalContratadoAtivo.toLocaleString('pt-BR')} {umd}
          </div>
        </div>
        <div className="glass-panel kpi-card" style={{ borderTop: '2px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="kpi-title">Total Empenhado</span>
            <TrendingUp size={20} color="#f59e0b" />
          </div>
          <div className="kpi-value" style={{ color: '#f59e0b' }}>
            {totalEmpenhadoAtivo.toLocaleString('pt-BR')} {umd}
          </div>
        </div>
        <div className="glass-panel kpi-card" style={{ borderTop: '2px solid var(--secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="kpi-title">Contratos Ativos</span>
            <Calendar size={20} color="var(--secondary)" />
          </div>
          <div className="kpi-value" style={{ fontSize: '1.4rem', color: 'var(--secondary)' }}>
            {ativos.length}
            {historico.length > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                + {historico.length} hist.
              </span>
            )}
            {monitoradosCount > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#6366f1', marginLeft: '8px' }}>
                <Bell size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {monitoradosCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contratos Ativos */}
      {ativos.length > 0 ? (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#10b981', marginRight: '4px' }}>
              Contratos Ativos
            </span>

            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '160px' }}>
              <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Pregão, fornecedor, AF…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px 6px 28px',
                  background: 'var(--panel-highlight)', border: '1px solid var(--panel-border)',
                  borderRadius: '7px', color: 'var(--text-main)', fontSize: '0.78rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Date range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Vencimento</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                style={{
                  padding: '5px 8px', background: 'var(--panel-highlight)',
                  border: '1px solid var(--panel-border)', borderRadius: '7px',
                  color: 'var(--text-main)', fontSize: '0.78rem', outline: 'none', cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>até</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                style={{
                  padding: '5px 8px', background: 'var(--panel-highlight)',
                  border: '1px solid var(--panel-border)', borderRadius: '7px',
                  color: 'var(--text-main)', fontSize: '0.78rem', outline: 'none', cursor: 'pointer',
                }}
              />
              {hasFilter && (
                <button
                  onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
                  title="Limpar filtros"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {hasFilter && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                {ativosFiltered.length} / {ativos.length}
              </span>
            )}
            {!hasFilter && (
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Clique no sino para monitorar
              </span>
            )}
          </div>

          {ativosFiltered.length > 0 ? (
            <ContratoTable rows={ativosFiltered} matCodigo={matCodigo} matNome={matNome} onMonitorChange={onMonitorChange} />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Nenhum contrato corresponde ao filtro
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Nenhum contrato ativo no momento
        </div>
      )}

      {/* Histórico */}
      {historico.length > 0 && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <button
            onClick={() => setShowHistorico(v => !v)}
            style={{
              width: '100%', padding: '14px 16px', background: 'none', border: 'none',
              borderBottom: showHistorico ? '1px solid var(--panel-border)' : 'none',
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Histórico — {historico.length} contrato{historico.length !== 1 ? 's' : ''} (efetivados / cancelados / vencidos)
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>{showHistorico ? '▲' : '▼'}</span>
          </button>
          {showHistorico && <ContratoTable rows={historico} muted />}
        </div>
      )}
    </>
  );
}
