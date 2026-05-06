import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';
import { Pie } from '@ant-design/plots';
import { api } from '../utils/api';
import type { Stats, Material, MonitoredItem, MonitoredContract, CriticalityRule } from '../utils/api';
import { KPICard } from './KPICard';
import { AlertBadge } from './AlertBadge';

interface Props {
  almox: number;
  onSelectMaterial: (codigo: number) => void;
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<Props> = ({ almox, onSelectMaterial, onNavigate }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rule, setRule] = useState<CriticalityRule | null>(null);
  const [criticos, setCriticos] = useState<Material[]>([]);
  const [itensMonitorados, setItensMonitorados] = useState<MonitoredItem[]>([]);
  const [contratosMonitorados, setContratosMonitorados] = useState<MonitoredContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, criticosResp, baixosResp, itens, contratos, r] = await Promise.all([
          api.stats(almox),
          api.materiais({ almox, limit: 30, page: 1, alerta: 'critico' }),
          api.materiais({ almox, limit: 30, page: 1, alerta: 'baixo' }),
          api.itensMonitorados(),
          api.eneMonitorados(),
          api.criticidade().catch(() => null),
        ]);
        setStats(s);
        setCriticos([...criticosResp.data, ...baixosResp.data]);
        setItensMonitorados(itens);
        setContratosMonitorados(contratos);
        setRule(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [almox]);

  if (loading) return (
    <div className="content-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Carregando dashboard...</div>
    </div>
  );

  if (error) return (
    <div className="content-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#ef4444', fontSize: '1rem' }}>{error}</div>
    </div>
  );

  const pieData = stats ? [
    { type: 'Crítico',  value: Number(stats.critico),  color: '#ef4444' },
    { type: 'Baixo',    value: Number(stats.baixo),    color: '#f97316' },
    { type: 'Atenção',  value: Number(stats.atencao),  color: '#f59e0b' },
    { type: 'Normal',   value: Number(stats.normal),   color: '#10b981' },
  ].filter(d => d.value > 0) : [];

  // ── Itens Monitorados — agrupar por nível ────────────────────────────────
  const itensPieData = Object.values(
    itensMonitorados.reduce<Record<string, { type: string; value: number; color: string }>>((acc, item) => {
      const key = item.level_nome;
      if (!acc[key]) acc[key] = { type: key, value: 0, color: item.level_cor };
      acc[key].value += 1;
      return acc;
    }, {})
  );

  // ── Contratos Monitorados — agrupar por alerta ───────────────────────────
  const alertaLabel: Record<string, string> = { critico: 'Crítico', baixo: 'Baixo', atencao: 'Atenção', normal: 'Normal' };
  const alertaColor: Record<string, string> = { critico: '#ef4444', baixo: '#f97316', atencao: '#f59e0b', normal: '#10b981' };
  const contratosPieData = Object.values(
    contratosMonitorados.reduce<Record<string, { type: string; value: number; color: string }>>((acc, c) => {
      const key = c.alerta ?? 'normal';
      const label = alertaLabel[key] ?? key;
      if (!acc[label]) acc[label] = { type: label, value: 0, color: alertaColor[key] ?? '#94a3b8' };
      acc[label].value += 1;
      return acc;
    }, {})
  );

  const makePieConfig = (data: { type: string; value: number; color: string }[], tooltipName = 'Itens') => ({
    data,
    angleField: 'value',
    colorField: 'type',
    radius: 0.82,
    innerRadius: 0.6,
    label: {
      text: (d: { type: string; value: number }) => `${d.type}: ${d.value}`,
      style: { fill: '#94a3b8', fontSize: 12, fontWeight: 500 },
      position: 'outside' as const,
    },
    legend: { color: { position: 'bottom' as const, layout: { justifyContent: 'center' } } },
    scale: {
      color: {
        domain: data.map(d => d.type),
        range: data.map(d => d.color),
      },
    },
    tooltip: {
      items: [{ field: 'value', name: tooltipName }],
    },
  });

  return (
    <div className="content-area">
      <div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)' }}>Materiais Hospitalares — Grupo 36 (AGHU)</p>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard title="Total de Materiais" value={Number(stats?.total_materiais ?? 0).toLocaleString('pt-BR')} icon={Package} />
        <KPICard
          title={rule ? `Estoque Crítico (≤ ${rule.limite_critico})` : 'Estoque Crítico'}
          value={Number(stats?.critico ?? 0).toLocaleString('pt-BR')}
          icon={AlertTriangle}
        />
        <KPICard
          title={rule ? `Estoque Baixo (${rule.limite_critico + 1}–${rule.limite_baixo})` : 'Estoque Baixo'}
          value={Number(stats?.baixo ?? 0).toLocaleString('pt-BR')}
          icon={Clock}
        />
        <KPICard
          title={rule ? `Estoque Normal (> ${rule.limite_atencao})` : 'Estoque Normal'}
          value={Number(stats?.normal ?? 0).toLocaleString('pt-BR')}
          icon={CheckCircle}
        />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {/* Distribuição por Status */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Distribuição por Status
          </h3>
          <div style={{ height: '260px' }}>
            <Pie {...makePieConfig(pieData, 'Materiais')} />
          </div>
        </div>

        {/* Itens Monitorados */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Itens Monitorados
            </h3>
            <button onClick={() => onNavigate('monitorados')} style={{
              background: 'none', border: '1px solid var(--panel-border)', borderRadius: '6px',
              padding: '4px 10px', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem',
            }}>Ver →</button>
          </div>
          <div style={{ height: '260px' }}>
            {itensPieData.length > 0
              ? <Pie {...makePieConfig(itensPieData, 'Itens')} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum item monitorado</div>
            }
          </div>
        </div>

        {/* Contratos Monitorados */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Contratos Monitorados
            </h3>
            <button onClick={() => onNavigate('monitorados')} style={{
              background: 'none', border: '1px solid var(--panel-border)', borderRadius: '6px',
              padding: '4px 10px', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem',
            }}>Ver →</button>
          </div>
          <div style={{ height: '260px' }}>
            {contratosPieData.length > 0
              ? <Pie {...makePieConfig(contratosPieData, 'Contratos')} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum contrato monitorado</div>
            }
          </div>
        </div>
      </div>

      {/* Critical materials list */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#ef4444" />
            Materiais Críticos e em Baixo Estoque
          </h3>
          <button onClick={() => onNavigate('materiais')} style={{
            background: 'none', border: '1px solid var(--panel-border)', borderRadius: '6px',
            padding: '4px 10px', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem',
          }}>Ver todos →</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
              {['Código', 'Nome', 'Estoque', 'Consumo/mês', 'Esgota em', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criticos.map(m => (
              <tr key={m.codigo} onClick={() => onSelectMaterial(m.codigo)} style={{ borderBottom: '1px solid var(--panel-border)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-highlight)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{m.codigo}</td>
                <td style={{ padding: '10px 12px', fontWeight: 500, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: m.alerta === 'critico' ? '#ef4444' : '#f97316' }}>
                  {Number(m.estoque).toLocaleString('pt-BR')}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                  {Number(m.media_consumo_mensal) > 0 ? Math.round(Number(m.media_consumo_mensal)).toLocaleString('pt-BR') : '—'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {m.dias_ate_ruptura !== null
                    ? <span style={{ color: m.dias_ate_ruptura < 30 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{m.dias_ate_ruptura}d</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px' }}><AlertBadge level={m.alerta} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
