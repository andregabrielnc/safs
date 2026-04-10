import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendText?: string;
  className?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title, value, icon: Icon, trend, trendText, className
}) => {
  return (
    <div className={`glass-panel kpi-card animate-fade-in ${className || ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="kpi-title">{title}</div>
          <div className="kpi-value">{value}</div>
        </div>
        <div style={{ 
          padding: '12px', 
          background: 'var(--panel-highlight)', 
          borderRadius: '12px',
          color: 'var(--primary)'
        }}>
          <Icon size={24} />
        </div>
      </div>
      
      {(trend !== undefined || trendText) && (
        <div style={{ 
          marginTop: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '0.875rem'
        }}>
          {trend !== undefined && (
            <span style={{ 
              color: trend >= 0 ? 'var(--success)' : 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600
            }}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
          {trendText && <span style={{ color: 'var(--text-muted)' }}>{trendText}</span>}
        </div>
      )}
    </div>
  );
};
