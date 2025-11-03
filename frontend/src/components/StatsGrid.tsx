import type { FC } from "react";

type Stat = {
  label: string;
  value: string;
  unit?: string;
};

type StatsGridProps = {
  stats: Stat[];
};

export const StatsGrid: FC<StatsGridProps> = ({ stats }) => {
  return (
    <div className="grid cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="dashboard-card">
          <h2>{stat.label}</h2>
          <div className="value-large">{stat.value}</div>
          {stat.unit ? <div className="muted">{stat.unit}</div> : null}
        </div>
      ))}
    </div>
  );
};
