import type { FC } from "react";

import "../styles/components/OrderBookPanel.css";

// 单条盘口信息，包含报价与对应的成交量。
type OrderItem = {
  price: string;
  volume: number;
};

type OrderBookPanelProps = {
  // 卖盘、买盘列表和撮合价位
  asks: OrderItem[];
  bids: OrderItem[];
  bestPrice: string;
};

// 归一化成交量，用于渲染条形宽度时的比例基准。
const maxVolume = (orders: OrderItem[]) => Math.max(...orders.map((item) => item.volume), 1);

export const OrderBookPanel: FC<OrderBookPanelProps> = ({ asks, bids, bestPrice }) => {
  // 计算买卖盘各自的最大成交量，用于宽度比例。
  const askMax = maxVolume(asks);
  const bidMax = maxVolume(bids);

  return (
    <section className="dashboard-card">
      <div className="flex-between">
        <h2>买卖盘口</h2>
        <span className="muted">单位：手</span>
      </div>

      {/* 卖盘：按成交量占比渲染条形，颜色偏红 */}
      <div className="orderbook-list" style={{ marginTop: 16 }}>
        <div className="orderbook-row" style={{ color: "#ff6b6b", fontWeight: 600 }}>
          <span>卖盘</span>
          <span style={{ width: 80, textAlign: "right" }}>价格</span>
          <span style={{ flex: 1, textAlign: "right" }}>成交量</span>
        </div>
        {asks.map((ask) => (
          <div key={`ask-${ask.price}`} className="orderbook-row">
            {/* 预留列位置，可用来放序号/档位标签 */}
            <span style={{ width: 48, color: "#ff6b6b" }}>{""}</span>
            <span className="orderbook-price">{ask.price}</span>
            <div
              className="orderbook-bar sell"
              style={{ width: `${(ask.volume / askMax) * 100}%`, minWidth: 12 }}
            />
            <span>{ask.volume}</span>
          </div>
        ))}
      </div>

      {/* 中间价展示：对应最优成交点位 */}
      <div style={{ textAlign: "center", margin: "12px 0", fontSize: 28, fontWeight: 600, color: "#00f2ff" }}>
        {bestPrice}
      </div>

      {/* 买盘：渲染逻辑对称于卖盘，使用绿色渐变 */}
      <div className="orderbook-list">
        <div className="orderbook-row" style={{ color: "#4ecdc4", fontWeight: 600 }}>
          <span>买盘</span>
          <span style={{ width: 80, textAlign: "right" }}>价格</span>
          <span style={{ flex: 1, textAlign: "right" }}>成交量</span>
        </div>
        {bids.map((bid) => (
          <div key={`bid-${bid.price}`} className="orderbook-row">
            <span style={{ width: 48, color: "#4ecdc4" }}>{""}</span>
            <span className="orderbook-price">{bid.price}</span>
            <div
              className="orderbook-bar buy"
              style={{ width: `${(bid.volume / bidMax) * 100}%`, minWidth: 12 }}
            />
            <span>{bid.volume}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
