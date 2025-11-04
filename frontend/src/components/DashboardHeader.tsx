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
      <div className="header-main">
        <div className="header-left">
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
        </div>
        <div className="header-switchers">
          <label className="header-select">
            <span>交易所</span>
            <select defaultValue="shfe">
              <option value="shfe">上海期货交易所</option>
              <option value="lme">伦敦金属交易所</option>
            </select>
          </label>
          <label className="header-select">
            <span>合约</span>
            <select defaultValue="ni2501">
              <option value="ni2501">NI2501</option>
              <option value="ni2505">NI2505</option>
              <option value="ni2509">NI2509</option>
            </select>
          </label>
        </div>
      </div>
    </header>
  );
};
