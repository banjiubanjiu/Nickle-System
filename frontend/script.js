const random = (base = 0, variance = 1) =>
  base + (Math.random() - 0.5) * variance;

const buildKlineData = () => {
  const labels = [];
  const candles = [];
  let price = 18500;

  for (let i = 0; i < 36; i += 1) {
    labels.push(`${String(9 + Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}`);
    const open = price + random(0, 80);
    const close = open + random(0, 120) - 60;
    const high = Math.max(open, close) + random(0, 60);
    const low = Math.min(open, close) - random(0, 60);
    candles.push({ o: open, h: high, l: low, c: close });
    price = close;
  }

  return { labels, candles };
};

const buildSmoothSeries = (points = 24) => {
  const labels = [];
  const data = [];
  let value = 18.5;

  for (let i = 0; i < points; i += 1) {
    labels.push(`${String(i + 1).padStart(2, '0')}日`);
    value += random(0, 1.2) - 0.6;
    data.push(Number(value.toFixed(2)));
  }

  return { labels, data };
};

const renderKlineChart = () => {
  const { labels, candles } = buildKlineData();
  const ctx = document.getElementById('klineChart');

  const datasets = ['o', 'h', 'l', 'c'].map((key) => candles.map((item) => item[key]));

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((data, index) => ({
        label: ['开盘', '最高', '最低', '收盘'][index],
        data,
        borderColor: ['#1ec9a9', '#4ddbd2', '#f76f8e', '#5ea8ff'][index],
        borderWidth: index === 3 ? 2.5 : 1.5,
        pointRadius: 0,
        tension: 0.38,
        fill: false,
      })),
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: '#6fb4d6',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 9,
          },
          grid: {
            color: 'rgba(30, 130, 170, 0.12)',
          },
        },
        y: {
          ticks: {
            color: '#6fb4d6',
            callback: (value) => `${value.toFixed(0)}`,
            maxTicksLimit: 6,
          },
          grid: {
            color: 'rgba(30, 130, 170, 0.12)',
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: '#e8f7ff',
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(5, 25, 36, 0.92)',
          borderColor: 'rgba(94, 210, 255, 0.25)',
          borderWidth: 1,
          titleColor: '#e8f7ff',
          bodyColor: '#cce9ff',
          displayColors: false,
        },
      },
    },
  });
};

const renderVolatilityChart = () => {
  const { labels, data } = buildSmoothSeries();
  const ctx = document.getElementById('volatilityChart');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: '#2cd3b8',
          backgroundColor: 'rgba(44, 211, 184, 0.18)',
          borderWidth: 2.5,
          pointRadius: 0,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: '#6fb4d6',
            maxTicksLimit: 8,
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            color: '#6fb4d6',
            callback: (value) => `${value.toFixed(1)}%`,
          },
          grid: {
            color: 'rgba(30, 130, 170, 0.12)',
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(5, 25, 36, 0.92)',
          borderColor: 'rgba(94, 210, 255, 0.25)',
          borderWidth: 1,
          titleColor: '#e8f7ff',
          bodyColor: '#cce9ff',
          callbacks: {
            label: (context) => `波动率：${context.parsed.y.toFixed(2)}%`,
          },
        },
      },
    },
  });
};

renderKlineChart();
renderVolatilityChart();
