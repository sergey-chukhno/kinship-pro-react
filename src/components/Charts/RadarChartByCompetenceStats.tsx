import React, { useState } from 'react';

function wrapRadarLabelStats(label: string, maxCharsPerLine = 22): string[] {
  if (!label || label.length <= maxCharsPerLine) return [label];
  const parts = label.split(/\s*-\s*/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const part of parts) {
    const next = current ? `${current}-${part}` : part;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      if (part.length > maxCharsPerLine) {
        const words = part.split(/\s+/);
        let line = '';
        for (const w of words) {
          const candidate = line ? `${line} ${w}` : w;
          if (candidate.length <= maxCharsPerLine) {
            line = candidate;
          } else {
            if (line) lines.push(line);
            line = w;
          }
        }
        current = line;
      } else {
        current = part;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [label];
}

export type RadarSeriesItem = { level: string; values: number[]; color: string };

type Props = {
  axes: string[];
  series: RadarSeriesItem[];
};

export const RadarChartByCompetenceStats: React.FC<Props> = ({ axes, series }) => {
  const [hoveredSeries, setHoveredSeries] = useState<RadarSeriesItem | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const centerX = 50;
  const centerY = 50;
  const maxRadius = 38;
  const n = axes.length;
  if (n === 0) return <div className="radar-chart-empty">Aucune compétence</div>;
  const angleStep = (2 * Math.PI) / n;
  const maxVal = Math.max(1, ...series.flatMap((s) => s.values));
  return (
    <div className="radar-chart">
      <svg width="100%" height="100%" className="radar-svg" viewBox="0 0 100 110" preserveAspectRatio="xMidYMid meet">
        {[0.25, 0.5, 0.75, 1.0].map((scale, i) => (
          <circle key={i} cx={centerX} cy={centerY} r={maxRadius * scale} fill="none" stroke="#f0f0f0" strokeWidth="0.3" />
        ))}
        {axes.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x2 = centerX + maxRadius * Math.cos(angle);
          const y2 = centerY + maxRadius * Math.sin(angle);
          return <line key={i} x1={centerX} y1={centerY} x2={x2} y2={y2} stroke="#f0f0f0" strokeWidth="0.3" />;
        })}
        {series.map((s) => {
          const points = s.values.map((val, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = maxVal > 0 ? (val / maxVal) * maxRadius : 0;
            return { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
          });
          const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
          return (
            <g key={s.level}>
              <polygon points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill={`${s.color}20`} stroke="none" />
              <path
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                onMouseEnter={(e) => { setHoveredSeries(s); setMousePosition({ x: e.clientX, y: e.clientY }); }}
                onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHoveredSeries(null)}
                style={{ cursor: 'pointer' }}
              />
            </g>
          );
        })}
        {axes.map((label, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const dist = maxRadius + 12;
          const x = centerX + dist * Math.cos(angle);
          const y = centerY + dist * Math.sin(angle);
          const lines = wrapRadarLabelStats(label);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="radar-label" fontSize="2.9" fill="#6b7280">
              {lines.map((line, j) => (
                <tspan key={j} x={x} dy={j === 0 ? `${(lines.length - 1) * -0.6}em` : '1.2em'}>{line}</tspan>
              ))}
            </text>
          );
        })}
      </svg>
      <div className="radar-legend">
        {series.map((s, i) => (
          <span key={i} className="radar-legend-item" style={{ color: s.color }}>
            <span className="radar-legend-dot" style={{ backgroundColor: s.color }} /> {s.level}
          </span>
        ))}
      </div>
      {hoveredSeries && (
        <div className="chart-tooltip" style={{ left: mousePosition.x + 10, top: mousePosition.y - 10 }}>
        <div className="tooltip-title">{hoveredSeries.level}</div>
        <div className="tooltip-value">{hoveredSeries.values.reduce((a, b) => a + b, 0)} badges</div>
        </div>
      )}
    </div>
  );
};
