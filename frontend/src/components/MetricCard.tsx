import type { FC, ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendDirection?: "up" | "down";
  icon?: ReactNode;
};

export const MetricCard: FC<MetricCardProps> = ({ label, value, unit, trend, trendDirection = "up", icon }) => {
  const trendClass = trendDirection === "down" ? "trend-down" : "trend-up";
  return (
    <div className="indicator-card">
      <div className="flex-between" style={{ gap: 12 }}>
        <h3 style={{ fontSize: 20 }}>{label}</h3>
        {icon}
      </div>
      <div className="value-large">{value}</div>
      <div className="muted" style={{ fontSize: 16 }}>{unit}</div>
      {trend ? <div className={trendClass}>{trendDirection === "down" ? "▼" : "▲"} {trend}</div> : null}
    </div>
  );
};
