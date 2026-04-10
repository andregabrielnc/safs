import React from 'react';

type AlertLevel = 'critico' | 'baixo' | 'atencao' | 'normal';

const config: Record<AlertLevel, { label: string; color: string; bg: string }> = {
  critico: { label: 'Crítico',  color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  baixo:   { label: 'Baixo',   color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  atencao: { label: 'Atenção', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  normal:  { label: 'Normal',  color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
};

export const AlertBadge: React.FC<{ level: AlertLevel }> = ({ level }) => {
  const { label, color, bg } = config[level] ?? config.normal;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '999px',
      fontSize: '0.72rem', fontWeight: 700,
      color, background: bg, border: `1px solid ${color}44`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
};

export const alertColor = (level: AlertLevel) => config[level]?.color ?? '#10b981';
