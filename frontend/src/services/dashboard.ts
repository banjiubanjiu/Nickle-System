import axios, { type AxiosRequestConfig } from "axios";
import type { MarketKey } from "../data/mock";

const DEFAULT_BASE_URL = "http://127.0.0.1:8000";
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL?.toString().trim() || DEFAULT_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------- 基础类型 ----------

export interface HealthResponse {
  status: string;
  database: string;
  latest_lme_snapshot: string | null;
  intraday_interval_seconds: number;
  retention_hours: number;
  timestamp: string;
}

export interface DashboardEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
  error: string | null;
}

export interface SnapshotRecord {
  id: number;
  exchange: string;
  contract: string;
  captured_at: string;
  quote_date: string | null;
  latest_price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  settlement: number | null;
  prev_settlement: number | null;
  volume: number | null;
  open_interest: number | null;
  bid: number | null;
  ask: number | null;
  change: number | null;
  change_pct: number | null;
  tick_time: string | null;
  elapsed_seconds: number | null;
}

export interface DailyRecord {
  id: number;
  exchange: string;
  contract: string;
  trade_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  settlement: number | null;
  prev_settlement: number | null;
  change: number | null;
  change_pct: number | null;
  volume: number | null;
  open_interest: number | null;
  elapsed_seconds: number | null;
}

type RequestOptions = AxiosRequestConfig & {
  searchParams?: Record<string, string | number | boolean | undefined>;
};

// ---------- 通用请求封装 ----------

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { searchParams, ...restOptions } = options;

  const config: AxiosRequestConfig = {
    url: path,
    method: restOptions.method ?? "GET",
    ...restOptions,
  };

  if (searchParams) {
    config.params = {
      ...(config.params ?? {}),
      ...searchParams,
    };
  }

  const response = await apiClient.request<T>(config);
  return response.data;
}

// ---------- 具体接口 ----------

/** 获取服务健康状态与采集配置。 */
export function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

/** 获取指定交易所的最新快照。 */
export function fetchLatest(exchange: MarketKey): Promise<DashboardEnvelope<SnapshotRecord>> {
  return request<DashboardEnvelope<SnapshotRecord>>("/api/v1/dashboard/latest", {
    params: { exchange },
  });
}

/** 获取指定交易所的最新 N 条快照。 */
export function fetchIntraday(
  exchange: MarketKey,
  limit = 30,
): Promise<DashboardEnvelope<SnapshotRecord[]>> {
  return request<DashboardEnvelope<SnapshotRecord[]>>("/api/v1/dashboard/intraday", {
    params: { exchange, limit },
  });
}

/** 获取日线数据，可指定日期区间。 */
export function fetchDaily(params: {
  exchange: MarketKey;
  start_date?: string;
  end_date?: string;
}): Promise<DashboardEnvelope<DailyRecord[]>> {
  const { exchange, start_date, end_date } = params;
  return request<DashboardEnvelope<DailyRecord[]>>("/api/v1/dashboard/daily", {
    params: { exchange, start_date, end_date },
  });
}

/** 返回用于 mock 的 trades 列表占位符，后续可替换为真实接口。 */
export interface TradeRecord {
  time: string;
  price: string;
  volume: string;
  side: "买入" | "卖出";
}

export function fetchMockTrades(existing: TradeRecord[]): Promise<TradeRecord[]> {
  return Promise.resolve(existing);
}
