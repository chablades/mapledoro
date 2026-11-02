import type { AppTheme } from "../../../components/themes";

// Shared by View a Character's drop area and Party Scouter's picker. Its frame and QR corners
// carry the classes viewer-card-outline and viewer-qr-finders, which each place styles (the
// frame's colour, and the corners' pulse while a file is read).

/** The exported card's layout in outline, measured off the real 750x1050 card at 1/7.5 scale:
 *  the art panel (wordmark and date along its top, the avatar, the name tag, the "Import at"
 *  band along its bottom), then Level / Class / World, the Scouter figure beside the class art,
 *  and the QR with its caption. It shows what to bring rather than decorating the page. */
export default function CardOutline({ theme }: { theme: AppTheme }) {
  const block = { fill: theme.muted, fillOpacity: 0.16 };
  const faint = { fill: theme.muted, fillOpacity: 0.08 };
  const bar = (x: number, y: number, w: number, h = 2.6) => <rect x={x} y={y} width={w} height={h} rx={h / 2} {...block} />;
  return (
    <svg viewBox="0 0 100 140" aria-hidden="true">
      <rect className="viewer-card-outline" x={1} y={1} width={98} height={138} rx={6} fill="none" strokeWidth={1.4} strokeDasharray="4 3" />
      {/* Art panel, with the band as its bottom strip. */}
      <rect x={5.5} y={5.5} width={89} height={85} rx={3.5} {...faint} />
      <path d="M5.5 84.5 H94.5 V87.2 A3.5 3.5 0 0 1 91 90.7 H9 A3.5 3.5 0 0 1 5.5 87.2 Z" {...block} />
      {bar(38, 86.4, 24, 2)}
      <circle cx={12.4} cy={12.3} r={2.6} {...block} />
      {bar(16.6, 11, 15)}
      {bar(75.5, 11, 15)}
      <rect x={36.5} y={29} width={27} height={40} rx={11} {...block} />
      <rect x={38.2} y={75} width={23.6} height={5.6} rx={2.8} {...block} fillOpacity={0.3} />
      {/* Level, Class, World. */}
      {bar(5.5, 95, 9, 2.2)}
      {bar(5.5, 99.4, 10, 4.4)}
      {bar(36.3, 95, 9, 2.2)}
      {bar(36.3, 99.4, 15, 4.4)}
      {bar(67, 95, 9, 2.2)}
      {bar(67, 99.4, 14, 4.4)}
      {/* Scouter, the class art beside it, and the QR with its caption. */}
      {bar(5.5, 109, 21, 2.2)}
      {bar(5.5, 113.5, 26, 6)}
      <rect x={36.5} y={107} width={22} height={28} rx={8} {...faint} />
      <rect x={67} y={106.7} width={27.6} height={27.6} rx={2.5} {...faint} />
      <g className="viewer-qr-finders" fill="none" stroke={theme.muted} strokeOpacity={0.55} strokeWidth={1.3}>
        <rect x={69.5} y={109.2} width={6} height={6} rx={1} />
        <rect x={85.6} y={109.2} width={6} height={6} rx={1} />
        <rect x={69.5} y={125.3} width={6} height={6} rx={1} />
      </g>
      {bar(71, 135.6, 20, 1.6)}
    </svg>
  );
}
