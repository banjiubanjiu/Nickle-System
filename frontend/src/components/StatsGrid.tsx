import type { FC } from "react";

// 单条统计指标：文案、数值以及可选单位。
type Stat = {
  label: string;
  value: string;
  unit?: string;
};

type StatsGridProps = {
  // 指标数组，通常用于展示开盘/最高/最低等概要数据。
  stats: Stat[];
};

export const StatsGrid: FC<StatsGridProps> = ({ stats }) => {
  return (
    <div className="grid cols-4">
      {/* 按指标列表依次渲染四列卡片 */}
      {stats.map((stat) => (
        <div key={stat.label} className="dashboard-card stat-card">
          <h2>{stat.label}</h2>
          <div className="value-large">{stat.value}</div>
          {stat.unit ? <div className="muted">{stat.unit}</div> : null}
        </div>
      ))}
    </div>
  );
};
