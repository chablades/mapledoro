"use client";

import { panelStyle, ItemIcon } from "./pitched-boss-ui";
import { useEffect, useState, type ComponentType } from "react";
import type { AppTheme } from "../../../components/themes";
import { PITCHED_ITEMS_BY_ID } from "./pitched-items";

type LineChartComponent = ComponentType<{
  data: unknown;
  options: unknown;
}>;

interface PitchedBossDrop {
  id: string;
  characterId: string;
  characterName: string;
  itemId: string;
  channel: number;
  date: string;
  timestamp: number;
}

const CHART_COLORS = [
  "#e07840",
  "#40b040",
  "#7c6aff",
  "#e05a5a",
  "#40b8ff",
  "#d4a02a",
  "#d460a0",
  "#60a060",
  "#a090dd",
  "#c08060",
];

function getLastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return months;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} '${y.slice(2)}`;
}

function DropCountBarChart({
  theme,
  drops,
}: {
  theme: AppTheme;
  drops: PitchedBossDrop[];
}) {
  const counts = new Map<string, number>();
  for (const drop of drops) {
    counts.set(drop.itemId, (counts.get(drop.itemId) ?? 0) + 1);
  }

  const entries = Array.from(counts.entries())
    .flatMap(([itemId, count]) => {
      const item = PITCHED_ITEMS_BY_ID.get(itemId);
      return item ? [{ item, count }] : [];
    })
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...entries.map((e) => e.count), 1);

  return (
    <div style={panelStyle(theme)}>
      <div
        style={{
          fontWeight: 700,
          color: theme.text,
          marginBottom: "1rem",
          fontSize: "0.95rem",
        }}
      >
        Drops by Item
      </div>
      {entries.map(({ item, count }, i) => (
        <div key={item.id} style={{ marginBottom: "0.6rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.78rem",
              marginBottom: 3,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 5, color: theme.text, fontWeight: 600 }}>
              <ItemIcon src={item.icon} />
              {item.name}
            </span>
            <span style={{ color: theme.muted, fontWeight: 700 }}>{count}</span>
          </div>
          <div
            style={{
              width: "100%",
              height: 18,
              background: theme.timerBg,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background: CHART_COLORS[i % CHART_COLORS.length],
                borderRadius: 6,
                transform: `scaleX(${Math.max(0.02, count / maxCount)})`,
                transformOrigin: "left",
                transition: "transform 0.3s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyTimeSeriesChart({
  theme,
  drops,
}: {
  theme: AppTheme;
  drops: PitchedBossDrop[];
}) {
  const [Line, setLine] = useState<LineChartComponent | null>(null);
  const months = getLastNMonths(6);
  const labels = months.map(formatMonth);
  const charNames = Array.from(new Set(drops.map((d) => d.characterName)));

  const datasets = charNames.map((name, i) => ({
    label: name,
    data: months.map(
      (month) => drops.filter((d) => d.characterName === name && d.date.startsWith(month)).length,
    ),
    borderColor: CHART_COLORS[i % CHART_COLORS.length],
    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
    tension: 0.25,
    pointRadius: 4,
    pointHoverRadius: 6,
    borderWidth: 2.5,
  }));

  const chartData = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "bottom" as const, labels: { color: theme.muted, font: { size: 12, weight: 600 as const } } },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: { ticks: { color: theme.muted }, grid: { color: theme.border } },
      y: {
        beginAtZero: true,
        ticks: { color: theme.muted, stepSize: 1 },
        grid: { color: theme.border },
      },
    },
  };

  useEffect(() => {
    let mounted = true;

    async function loadChart() {
      const [chartModule, lineModule] = await Promise.all([
        import("chart.js"),
        import("react-chartjs-2"),
      ]);
      chartModule.Chart.register(
        chartModule.CategoryScale,
        chartModule.LinearScale,
        chartModule.PointElement,
        chartModule.LineElement,
        chartModule.Tooltip,
        chartModule.Legend,
      );
      if (mounted) setLine(() => lineModule.Line as LineChartComponent);
    }

    loadChart();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={panelStyle(theme)}>
      <div style={{ fontWeight: 700, color: theme.text, marginBottom: "1rem", fontSize: "0.95rem" }}>
        Monthly Drops by Character
      </div>
      {Line ? <Line data={chartData} options={options} /> : null}
    </div>
  );
}

export default function PitchedBossCharts({
  theme,
  drops,
}: {
  theme: AppTheme;
  drops: PitchedBossDrop[];
}) {
  return (
    <>
      <DropCountBarChart theme={theme} drops={drops} />
      <MonthlyTimeSeriesChart theme={theme} drops={drops} />
    </>
  );
}
