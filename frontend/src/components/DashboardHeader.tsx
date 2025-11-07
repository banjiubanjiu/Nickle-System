import type { FC } from "react";

import "../styles/components/DashboardHeader.css";

// Option describes a generic dropdown item with key/label pair.
type Option = {
  key: string;
  label: string;
};

type ExchangeOption = Option & {
  contracts: Option[];
};

export const NAV_ITEMS = [
  { key: "home", label: "首页" },
  { key: "morning", label: "晨报" },
  { key: "daily", label: "日报" },
  { key: "weekly", label: "周报" },
  { key: "monthly", label: "月报" },
  { key: "yearly", label: "年报" },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];

type DashboardHeaderProps = {
  // 标题文案（例：镍金属期货实时数据大屏）
  title: string;
  activeNavKey: NavKey;
  // 全部交易所选项，包含对应的合约列表
  exchangeOptions: ExchangeOption[];
  // 当前选中的交易所/合约
  selectedExchangeKey: string;
  selectedContractKey: string;
  // 交互回调：切换交易所 / 合约 / 导航页签
  onExchangeChange: (key: string) => void;
  onContractChange: (key: string) => void;
  onNavChange: (key: NavKey) => void;
};

export const DashboardHeader: FC<DashboardHeaderProps> = ({
  title,
  activeNavKey,
  exchangeOptions,
  selectedExchangeKey,
  selectedContractKey,
  onExchangeChange,
  onContractChange,
  onNavChange,
}) => {
  // 派生当前交易所信息，兜底为列表的首项，避免渲染阶段出现 undefined。
  const activeExchange =
    exchangeOptions.find((item) => item.key === selectedExchangeKey) ?? exchangeOptions[0];
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
        <nav className="header-nav" aria-label="研报导航">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activeNavKey;
            return (
              <button
                type="button"
                key={item.key}
                className={isActive ? "header-nav-item active" : "header-nav-item"}
                aria-pressed={isActive}
                onClick={() => onNavChange(item.key)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="header-switchers">
          {/* 交易所选择器：驱动页面主数据切换 */}
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
          {/* 合约选择器：仅在当前交易所内切换合约视图 */}
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
