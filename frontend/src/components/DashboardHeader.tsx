import type { FC } from "react";

import "../styles/global.css";

type Option = {
  key: string;
  label: string;
};

type ExchangeOption = Option & {
  contracts: Option[];
};

type DashboardHeaderProps = {
  title: string;
  exchangeOptions: ExchangeOption[];
  selectedExchangeKey: string;
  selectedContractKey: string;
  onExchangeChange: (key: string) => void;
  onContractChange: (key: string) => void;
};

export const DashboardHeader: FC<DashboardHeaderProps> = ({
  title,
  exchangeOptions,
  selectedExchangeKey,
  selectedContractKey,
  onExchangeChange,
  onContractChange,
}) => {
  const activeExchange = exchangeOptions.find((item) => item.key === selectedExchangeKey) ?? exchangeOptions[0];
  const activeContracts = activeExchange?.contracts ?? [];

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
            <select value={selectedExchangeKey} onChange={(event) => onExchangeChange(event.target.value)}>
              {exchangeOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="header-select">
            <span>合约</span>
            <select
              value={selectedContractKey}
              onChange={(event) => onContractChange(event.target.value)}
              disabled={activeContracts.length === 0}
            >
              {activeContracts.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </header>
  );
};
