import React, { useEffect, useState } from 'react';
import { fetchEstoqueGeral, fetchEstoqueAlmoxarifado } from '../utils/dataFetcher';
import type { EstoqueGeral, EstoqueAlmoxarifado } from '../utils/dataFetcher';
import { KPICard } from './KPICard';
import { Package, DollarSign, Activity, Archive } from 'lucide-react';
import { Column, Pie, Line } from '@ant-design/plots';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
};

export const Dashboard: React.FC<{ theme: string }> = ({ theme }) => {
  const [estoqueGeral, setEstoqueGeral] = useState<EstoqueGeral[]>([]);
  const [estoqueAlmox, setEstoqueAlmox] = useState<EstoqueAlmoxarifado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchEstoqueGeral(), fetchEstoqueAlmoxarifado()])
      .then(([geral, almox]) => {
        setEstoqueGeral(geral.filter(item => item.valor > 0 || item.qtd > 0)); // Filter out empty mock rows if any
        setEstoqueAlmox(almox);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}><h2>Carregando Dados...</h2></div>;
  }

  // --- KPI Calculation ---
  const totalValue = estoqueGeral.reduce((acc, item) => acc + item.valor, 0);
  const totalQuantity = estoqueGeral.reduce((acc, item) => acc + item.qtd, 0);
  
  // Calculate Consignado percentages
  const totalAlmoxItems = estoqueAlmox.length;
  const consignadoItems = estoqueAlmox.filter(item => item.consignado === 'Sim').length;
  const consignadoPercentage = totalAlmoxItems > 0 ? (consignadoItems / totalAlmoxItems) * 100 : 0;

  // --- Charts Data Manipulation ---

  // 1. Top 10 Materials by Value
  const topMaterials = [...estoqueGeral]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10)
    .map(item => ({
      material: item.material.substring(0, 30) + '...', // truncate name
      valor: item.valor
    }));

  const columnConfig = {
    data: topMaterials,
    xField: 'material',
    yField: 'valor',
    color: 'l(90) 0:#00d2ff 1:#3a7bd5',
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
        style: { fill: '#94a3b8' }
      },
    },
    yAxis: {
      label: { 
        formatter: (v: string) => `${(Number(v) / 1000).toFixed(0)}k`,
        style: { fill: '#94a3b8' }
      }
    },
    tooltip: {
      formatter: (data: any) => ({ name: 'Valor', value: formatCurrency(data.valor) })
    },
    theme: theme
  };

  // 2. ABC Classification Pie
  const abcDataMap = estoqueGeral.reduce((acc, item) => {
    const cls = item.classABC || 'N/A';
    acc[cls] = (acc[cls] || 0) + item.valor;
    return acc;
  }, {} as Record<string, number>);
  
  const abcPieData = Object.keys(abcDataMap).map(key => ({
    type: `Classe ${key}`,
    value: abcDataMap[key]
  }));

  const pieConfig = {
    appendPadding: 10,
    data: abcPieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}',
      style: { fill: '#f8fafc' }
    },
    interactions: [{ type: 'element-active' }],
    color: ['#00d2ff', '#3a7bd5', '#10b981', '#f59e0b', '#ef4444'],
    theme: theme,
    tooltip: {
      formatter: (data: any) => ({ name: data.type, value: formatCurrency(data.value) })
    }
  };

  // 3. Trend Mock (Usually uses sequence of dates, we will map Grupo to Value dynamically as demo line chart)
  const grupoDataMap = estoqueGeral.reduce((acc, item) => {
    if(!item.grupo) return acc;
    acc[item.grupo] = (acc[item.grupo] || 0) + item.valor;
    return acc;
  }, {} as Record<string, number>);

  const trendData = Object.keys(grupoDataMap).map(key => ({
    grupo: key.substring(0, 15),
    valor: grupoDataMap[key]
  })).sort((a,b) => b.valor - a.valor).slice(0, 15);

  const lineConfig = {
    data: trendData,
    xField: 'grupo',
    yField: 'valor',
    point: { size: 5, shape: 'diamond' },
    color: '#00d2ff',
    yAxis: {
      label: { style: { fill: '#94a3b8' } }
    },
    xAxis: {
      label: { style: { fill: '#94a3b8' } }
    },
    theme: theme
  };

  return (
    <div className="content-area">
      <div style={{ marginBottom: '8px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Visualização de Painel</h1>
        <p style={{ color: 'var(--text-muted)' }}>Resumo analítico dos materiais hospitalares (OPME e Gerais)</p>
      </div>

      <div className="kpi-grid">
        <KPICard 
          title="Valor Total em Estoque" 
          value={formatCurrency(totalValue)} 
          icon={DollarSign} 
          trend={2.4} 
          trendText="vs mês anterior"
        />
        <KPICard 
          title="Quantidade Total" 
          value={totalQuantity.toLocaleString('pt-BR')} 
          icon={Package} 
        />
        <KPICard 
          title="Itens Consignados" 
          value={`${consignadoPercentage.toFixed(1)}%`} 
          icon={Archive} 
          trend={-1.2}
          trendText="dos materiais da Almox."
        />
        <KPICard 
          title="Índice de Acerto (ABC)" 
          value="94%" 
          icon={Activity} 
          trend={0.8}
        />
      </div>

      <div className="charts-grid">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-muted)' }}>Top 10 Materiais por Valor ($)</h3>
          <div style={{ height: '300px' }}>
            <Column {...columnConfig} />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-muted)' }}>Distribuição por Classe ABC</h3>
          <div style={{ height: '300px' }}>
            <Pie {...pieConfig} />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-muted)' }}>Curva de Valor por Grupo de Material</h3>
          <div style={{ height: '250px' }}>
            <Line {...lineConfig} />
          </div>
        </div>
      </div>
    </div>
  );
};
