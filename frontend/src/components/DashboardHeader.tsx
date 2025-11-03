import type { FC } from "react";

import "../styles/global.css";

type DashboardHeaderProps = {
  title: string;
  exchange: string;
  contract: string;
};

export const DashboardHeader: FC<DashboardHeaderProps> = ({ title, exchange, contract }) => {
  return (
    <header className="dashboard-card" style={{ paddingBottom: 28 }}>
      <div className="flex-between">
        <div>
          <div className="badge">实时监控</div>
          <h1 style={{ margin: "12px 0 0", fontSize: 32, fontWeight: 600 }}>{title}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="muted">{exchange}</div>
          <div style={{ fontSize: 24, fontWeight: 500 }}>{contract}</div>
        </div>
      </div>
    </header>
  );
};
