import type { FC } from "react";

import "../styles/global.css";

type DashboardHeaderProps = {
  title: string;
  exchange: string;
  contract: string;
};

export const DashboardHeader: FC<DashboardHeaderProps> = ({ title, exchange, contract }) => {
  return (
    <header className="dashboard-card dashboard-header">
      <div className="flex-between">
        <div className="header-brand">
          <span className="header-logo" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M3 16.5L8.5 9.5L13 13.5L16.5 8.5L21 11.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 600 }}>{title}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="muted" style={{ fontSize: 14 }}>{exchange}</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{contract}</div>
        </div>
      </div>
    </header>
  );
};
