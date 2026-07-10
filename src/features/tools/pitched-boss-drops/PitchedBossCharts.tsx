"use client";

import { panelStyle } from "./pitched-boss-styles";
import { useEffect, useState, type ComponentType } from "react";
import type { AppTheme } from "../../../components/themes";
import { chartSeriesColor } from "../../../components/chartColors";
import { DROP_ITEMS_BY_ID } from "./pitched-items";

type ChartComponent = ComponentType<{ data: unknown; options: unknown }>;

interface PitchedBossDrop {
  id: string;
  characterId: string;
  characterName: string;
  itemId: string;
  channel: number;
  date: string;
  timestamp: number;
  note?: string;
}

function getLastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} '${y.slice(2)}`;
}

/* ------------------------------------------------------------------ */
/*  Chart data builders                                                */
/* ------------------------------------------------------------------ */

function buildItemBarData(drops: PitchedBossDrop[], theme: AppTheme) {
  const counts = new Map<string, number>();
  for (const drop of drops) {
    counts.set(drop.itemId, (counts.get(drop.itemId) ?? 0) + 1);
  }
  const entries = Array.from(counts.entries())
    .flatMap(([itemId, count]) => {
      const item = DROP_ITEMS_BY_ID.get(itemId);
      return item ? [{ itemId, name: item.name, count }] : [];
    })
    .sort((a, b) => b.count - a.count);

  return {
    labels: entries.map((e) => e.name),
    datasets: [
      {
        label: "Drops",
        data: entries.map((e) => e.count),
        // Keyed by item identity, not rank, so a bar keeps its color as counts shift.
        backgroundColor: entries.map((e) => chartSeriesColor(theme, e.itemId)),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };
}

function buildMonthlyData(drops: PitchedBossDrop[], theme: AppTheme) {
  const months = getLastNMonths(6);
  const labels = months.map(formatMonth);
  const charNames = Array.from(new Set(drops.map((d) => d.characterName)));

  const datasets = charNames.map((name) => {
    const color = chartSeriesColor(theme, name);
    return {
      label: name,
      data: months.map(
        (month) => drops.filter((d) => d.characterName === name && d.date.startsWith(month)).length,
      ),
      borderColor: color,
      backgroundColor: color,
      tension: 0.25,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2.5,
    };
  });

  return { labels, datasets };
}

/* ------------------------------------------------------------------ */
/*  Chart options                                                      */
/* ------------------------------------------------------------------ */

function barOptions(theme: AppTheme) {
  return {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { intersect: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: theme.muted, stepSize: 1, precision: 0 },
        grid: { color: theme.border },
      },
      y: { ticks: { color: theme.text, font: { size: 12, weight: 600 as const } }, grid: { display: false } },
    },
  };
}

function lineOptions(theme: AppTheme) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "bottom" as const, labels: { color: theme.muted, font: { size: 12, weight: 600 as const } } },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: { ticks: { color: theme.muted }, grid: { color: theme.border } },
      y: { beginAtZero: true, ticks: { color: theme.muted, stepSize: 1 }, grid: { color: theme.border } },
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const chartTitleStyle = (theme: AppTheme): React.CSSProperties => ({
  fontWeight: 700,
  color: theme.text,
  margin: "0 0 0.85rem",
  fontSize: "0.95rem",
});

export default function PitchedBossCharts({
  theme,
  drops,
}: {
  theme: AppTheme;
  drops: PitchedBossDrop[];
}) {
  const [charts, setCharts] = useState<{ Bar: ChartComponent; Line: ChartComponent } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const [chartModule, reactChart] = await Promise.all([
        import("chart.js"),
        import("react-chartjs-2"),
      ]);
      chartModule.Chart.register(
        chartModule.CategoryScale,
        chartModule.LinearScale,
        chartModule.BarElement,
        chartModule.PointElement,
        chartModule.LineElement,
        chartModule.Tooltip,
        chartModule.Legend,
      );
      if (active) {
        setCharts({
          Bar: reactChart.Bar as ChartComponent,
          Line: reactChart.Line as ChartComponent,
        });
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  if (!charts) return null;
  const { Bar, Line } = charts;
  const barHeight = Math.max(140, new Set(drops.map((d) => d.itemId)).size * 34 + 20);

  return (
    <>
      <div style={panelStyle(theme)}>
        <h2 style={chartTitleStyle(theme)}>Drops by Item</h2>
        <div style={{ height: barHeight }}>
          <Bar data={buildItemBarData(drops, theme)} options={barOptions(theme)} />
        </div>
      </div>
      <div style={panelStyle(theme)}>
        <h2 style={chartTitleStyle(theme)}>Monthly Drops by Character</h2>
        <Line data={buildMonthlyData(drops, theme)} options={lineOptions(theme)} />
      </div>
    </>
  );
}
