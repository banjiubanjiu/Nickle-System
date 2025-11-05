import type { FC, ReactNode } from "react";

type MetricCardProps = {
  // 指标标题（例如“最新价”）
  label: string;
  // 展示值：已在上层格式化好，直接渲染
  value: string;
  // 可选单位文案
  unit?: string;
  // 趋势描述及方向，用于标记涨跌色
  trend?: string;
  trendDirection?: "up" | "down";
  // 允许调用方传入图标，便于后续扩展
  icon?: ReactNode;
};

export const MetricCard: FC<MetricCardProps> = ({ label, value, unit, trend, trendDirection = "up", icon }) => {
  const trendClass = trendDirection === "down" ? "trend-down" : "trend-up";
  // 注意：trendDirection 默认视为上涨（保持与设计稿一致），调用方需要显式传入 "down" 才会显示绿色。
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
