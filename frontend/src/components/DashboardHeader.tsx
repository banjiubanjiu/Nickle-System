import type { ChangeEvent, FC } from "react";
import { useMemo, useState } from "react";

import "../styles/global.css";

type DashboardHeaderProps = {
  title: string;
  exchange: string;
  contract: string;
};

type ExchangeOption = {
  key: string;
  label: string;
  contracts: { key: string; label: string }[];
};

const EXCHANGE_OPTIONS: ExchangeOption[] = [
  {
    key: "shfe",
    label: "上海期货交易所",
    contracts: [
      { key: "ni2501", label: "NI2501" },
      { key: "ni2505", label: "NI2505" },
      { key: "ni2509", label: "NI2509" },
    ],
  },
  {
    key: "lme",
    label: "伦敦金属交易所",
    contracts: [
      { key: "nickel3m", label: "Nickel 3M" },
      { key: "nickel15m", label: "Nickel 15M" },
      { key: "nickel27m", label: "Nickel 27M" },
    ],
  },
];

export const DashboardHeader: FC<DashboardHeaderProps> = ({ title, exchange, contract }) => {
  const defaultExchange = useMemo(
    () => EXCHANGE_OPTIONS.find((option) => option.label === exchange) ?? EXCHANGE_OPTIONS[0],
    [exchange],
  );

  const defaultContractKey = useMemo(() => {
    const matchedContract = defaultExchange.contracts.find((item) => item.label === contract);
    return matchedContract?.key ?? defaultExchange.contracts[0]?.key ?? "";
  }, [contract, defaultExchange]);

  const [selectedExchangeKey, setSelectedExchangeKey] = useState(defaultExchange.key);
  const [selectedContractKey, setSelectedContractKey] = useState(defaultContractKey);

  const activeExchange = useMemo(() => {
    return EXCHANGE_OPTIONS.find((option) => option.key === selectedExchangeKey) ?? EXCHANGE_OPTIONS[0];
  }, [selectedExchangeKey]);

  const activeContracts = activeExchange.contracts;

  const handleExchangeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextExchangeKey = event.target.value;
    setSelectedExchangeKey(nextExchangeKey);
    const nextExchange = EXCHANGE_OPTIONS.find((option) => option.key === nextExchangeKey);
    const fallbackContract = nextExchange?.contracts[0]?.key ?? "";
    setSelectedContractKey(fallbackContract);
  };

  const handleContractChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedContractKey(event.target.value);
  };

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
            <select value={selectedExchangeKey} onChange={handleExchangeChange}>
              {EXCHANGE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="header-select">
            <span>合约</span>
            <select value={selectedContractKey} onChange={handleContractChange}>
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
