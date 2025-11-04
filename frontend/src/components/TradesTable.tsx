import type { FC } from "react";

type Trade = {
  time: string;
  price: string;
  volume: string;
  side: string;
};

type TradesTableProps = {
  trades: Trade[];
};

export const TradesTable: FC<TradesTableProps> = ({ trades }) => {
  return (
    <section className="dashboard-card">
      <div className="flex-between">
        <h2>实时成交明细</h2>
        <span className="muted">最近 30 条（滚动查看）</span>
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
