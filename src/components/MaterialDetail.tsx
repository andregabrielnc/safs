import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Package, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { Line } from '@ant-design/plots';
import { api } from '../utils/api';
import type { ConsumoMensal, MaterialDetalhe } from '../utils/api';
import { AlertBadge } from './AlertBadge';

interface Props {
  codigo: number;
  almox: number;
  onBack: () => void;
}

// Linear regression helper
function linearRegression(data: { x: number; y: number }[]) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0 };
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, c] = await Promise.all([
        api.material(codigo, almox),
        api.consumo(codigo, almox, 24),
      ]);
      setDetalhe(d);
      setConsumo(c);
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
  const mediaConsumo = consumo.length
    ? consumo.slice(-6).reduce((s, c) => s + Number(c.quantidade), 0) / Math.min(consumo.length, 6)
    : 0;
  const diasAteRuptura = mediaConsumo > 0 ? Math.round(estoque / (mediaConsumo / 30)) : null;

  const alerta = estoque === 0 ? 'critico' : estoque < 10 ? 'baixo' : estoque < 20 ? 'atencao' : 'normal';

  // Build chart data with trend line
  const chartData: { mes: string; valor: number; tipo: string }[] = [];

  const consumoArr = consumo.map((c, i) => ({ x: i, y: Number(c.quantidade) }));
  const reg = linearRegression(consumoArr);

  consumo.forEach((c) => {
    chartData.push({ mes: c.competencia, valor: Number(c.quantidade), tipo: 'Consumo Real' });
  });
  consumo.forEach((c, i) => {
    chartData.push({ mes: c.competencia, valor: Math.max(0, Math.round(reg.slope * i + reg.intercept)), tipo: 'Tendência' });
  });

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

  const consumoConfig = {
    data: chartData,
    xField: 'mes',
    yField: 'valor',
    colorField: 'tipo',
    scale: {
      color: {
        domain: ['Consumo Real', 'Tendência'],
        range: ['#00d2ff', '#f59e0b'],
      },
    },
    style: { lineWidth: 2 },
    point: {
      shapeField: 'square',
      sizeField: 3,
    },
    axis: {
      x: { labelAutoRotate: true, labelFill: '#94a3b8' },
      y: { labelFill: '#94a3b8' },
    },
    tooltip: {
      items: [
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
        type: 'line',
        yField: 0,
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
          <h3 style={{ marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Consumo Mensal + Tendência (últimos 24 meses)
          </h3>
          <div style={{ height: '280px' }}>
            {consumo.length > 0
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
              Projeção baseada na média de consumo dos últimos 6 meses ({Math.round(mediaConsumo).toLocaleString('pt-BR')} {detalhe.umd_codigo}/mês)
            </p>
            <div style={{ height: '240px' }}>
              <Line {...previsaoConfig} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
