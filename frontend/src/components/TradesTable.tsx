import type { FC } from "react";

// 单条成交记录：时间、价格、成交量、方向。
type Trade = {
  time: string;
  price: string;
  volume: string;
  side: string;
};

type TradesTableProps = {
  // 按时间倒序排列的成交列表。
  trades: Trade[];
};

export const TradesTable: FC<TradesTableProps> = ({ trades }) => {
  return (
    <section className="dashboard-card">
      <div className="flex-between">
        <h2>实时成交明细</h2>
        {/* 静态说明：展示最近 30 条记录，可滚动查看更多 */}
        <span className="muted">最新 30 条（滚动查看）</span>
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>价格</th>
              <th>成交量</th>
              <th>方向</th>
            </tr>
          </thead>
          <tbody>
            {/* 使用行号辅助 key，避免时间重复导致警告 */}
            {trades.map((trade, idx) => (
              <tr key={`${trade.time}-${idx}`}>
                <td>{trade.time}</td>
                <td>{trade.price}</td>
                <td>{trade.volume}</td>
                <td>{trade.side}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
