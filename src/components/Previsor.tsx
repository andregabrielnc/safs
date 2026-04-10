import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import { api } from '../utils/api';
import type { Material } from '../utils/api';
import { AlertBadge } from './AlertBadge';
import { MaterialDetail } from './MaterialDetail';

interface Props {
  almox: number;
}

export const Previsor: React.FC<Props> = ({ almox }) => {
  const [data, setData] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Fetch first 200 to get most critical ones with dias_ate_ruptura
      const result = await api.materiais({ almox, limit: 200, page: 1 });
      const withRuptura = result.data
        .filter(m => m.dias_ate_ruptura !== null && m.dias_ate_ruptura <= 90)
        .sort((a, b) => (a.dias_ate_ruptura ?? 9999) - (b.dias_ate_ruptura ?? 9999));
      setData(withRuptura);
      setLoading(false);
    };
    load();
  }, [almox]);

  if (selected !== null) {
    return <MaterialDetail codigo={selected} almox={almox} onBack={() => setSelected(null)} />;
  }

  const urgente   = data.filter(m => (m.dias_ate_ruptura ?? 9999) <= 15);
  const atencao   = data.filter(m => (m.dias_ate_ruptura ?? 9999) > 15 && (m.dias_ate_ruptura ?? 9999) <= 30);
  const moderado  = data.filter(m => (m.dias_ate_ruptura ?? 9999) > 30 && (m.dias_ate_ruptura ?? 9999) <= 90);

  const renderGroup = (title: string, color: string, items: Material[], icon: React.ReactNode) => (
    items.length > 0 && (
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          {icon}
          <h3 style={{ margin: 0, color }}>{title}</h3>
          <span style={{ marginLeft: 'auto', background: `${color}22`, color, borderRadius: '999px', padding: '2px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
            {items.length} materiais
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
              {['Código', 'Nome', 'Estoque', 'Consumo/mês', 'Ruptura em', 'Data Prevista', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(m => {
              const dataRuptura = m.dias_ate_ruptura !== null
                ? new Date(Date.now() + m.dias_ate_ruptura * 86400000).toLocaleDateString('pt-BR')
                : '—';
              return (
                <tr key={m.codigo} onClick={() => setSelected(m.codigo)}
                  style={{ borderBottom: '1px solid var(--panel-border)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-highlight)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{m.codigo}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color }}>{Number(m.estoque).toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    {Number(m.media_consumo_mensal) > 0 ? Math.round(Number(m.media_consumo_mensal)).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color }}>
                    {m.dias_ate_ruptura} dias
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{dataRuptura}</td>
                  <td style={{ padding: '10px 12px' }}><AlertBadge level={m.alerta} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <div className="content-area">
      <div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Previsor de Ruptura de Estoque</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Materiais com previsão de ruptura nos próximos 90 dias — baseado na média de consumo dos últimos 6 meses
        </p>
      </div>

      {/* Summary cards */}
      <div className="kpi-grid">
        {[
          { label: 'Ruptura ≤ 15 dias', count: urgente.length,  color: '#ef4444', icon: AlertTriangle },
          { label: 'Ruptura 16–30 dias', count: atencao.length,  color: '#f97316', icon: Clock },
          { label: 'Ruptura 31–90 dias', count: moderado.length, color: '#f59e0b', icon: TrendingDown },
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Analisando consumo dos materiais...
        </div>
      ) : data.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Nenhum material com previsão de ruptura nos próximos 90 dias.
        </div>
      ) : (
        <>
          {renderGroup('Urgente — Ruptura em até 15 dias', '#ef4444', urgente,
            <AlertTriangle size={20} color="#ef4444" />)}
          {renderGroup('Atenção — Ruptura entre 16 e 30 dias', '#f97316', atencao,
            <Clock size={20} color="#f97316" />)}
          {renderGroup('Monitorar — Ruptura entre 31 e 90 dias', '#f59e0b', moderado,
            <TrendingDown size={20} color="#f59e0b" />)}
        </>
      )}
    </div>
  );
};
