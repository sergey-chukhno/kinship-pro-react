import React, { useCallback, useRef, useState } from 'react';
import { ParcoursFriseJalon } from '../../types/parcoursProof';
import { PARCOURS_GOLD } from '../../utils/parcoursProofStyle';

interface ParcoursProofFriseProps {
  jalons: ParcoursFriseJalon[];
  start: string;
  end: string;
  hasDiploma: boolean;
}

const TYPE_COLORS: Record<'PP' | 'PS', string> = {
  PP: '#0369a1',
  PS: '#166534',
};

const ParcoursProofFrise: React.FC<ParcoursProofFriseProps> = ({
  jalons,
  start,
  end,
  hasDiploma,
}) => {
  const [openLabels, setOpenLabels] = useState<Record<number, boolean>>({});
  const [tip, setTip] = useState<{ x: number; y: number; jalon: ParcoursFriseJalon } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const toggleLabel = (index: number) => {
    setOpenLabels((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const showTip = useCallback((e: React.MouseEvent, jalon: ParcoursFriseJalon) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ x: rect.left + rect.width / 2, y: rect.top, jalon });
  }, []);

  const hideTip = useCallback(() => setTip(null), []);

  const tipStyle = tip
    ? (() => {
        const tw = tipRef.current?.offsetWidth ?? 190;
        const tx = Math.max(8, Math.min(tip.x - tw / 2, window.innerWidth - tw - 8));
        const th = tipRef.current?.offsetHeight ?? 80;
        return { left: tx, top: tip.y - th - 14 + window.scrollY };
      })()
    : undefined;

  return (
    <div className="pa-frise">
      <div className="frise-ends">
        <span>{start}</span>
        <span>{end}</span>
      </div>
      <div className="frise-track">
        <div className="frise-axis" />

        {jalons.map((jalon, i) => {
          const above = i % 2 === 0;

          if (jalon.type === 'PD') {
            return (
              <React.Fragment key={`${jalon.pct}-${jalon.title}`}>
                <div className="frise-hex-wrap" style={{ left: `${jalon.pct}%` }}>
                  <svg width="20" height="20" viewBox="0 0 56 56" aria-hidden="true">
                    <polygon
                      points="28,2 54,15 54,41 28,54 2,41 2,15"
                      fill={PARCOURS_GOLD}
                      stroke="#B87E06"
                      strokeWidth="3"
                    />
                    <text x="28" y="33" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">
                      K
                    </text>
                  </svg>
                </div>
                <div className="frise-pd-card" style={{ left: `${jalon.pct}%` }}>
                  <div className="frise-pd-card-title">BTS</div>
                  <div className="frise-pd-card-sub">Nice · 2026</div>
                </div>
              </React.Fragment>
            );
          }

          const color = TYPE_COLORS[jalon.type];
          const dotClass = jalon.type === 'PP' ? 'pp' : 'ps';

          return (
            <React.Fragment key={`${jalon.pct}-${jalon.title}`}>
              <div
                className={`frise-dot ${dotClass}`}
                style={{ left: `${jalon.pct}%` }}
                onMouseEnter={(e) => showTip(e, jalon)}
                onMouseLeave={hideTip}
                onClick={() => toggleLabel(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleLabel(i);
                  }
                }}
                aria-label={jalon.title}
              />
              <div
                className={`frise-date ${above ? 'above' : 'below'}`}
                style={{ left: `${jalon.pct}%` }}
              >
                {jalon.date}
              </div>
              <div
                className={`frise-lbl-toggle ${above ? 'above' : 'below'} ${openLabels[i] ? 'on' : ''}`}
                style={{ left: `${jalon.pct}%`, color, border: `1px solid ${color}` }}
              >
                {jalon.title}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div
        ref={tipRef}
        className={`frise-tip ${tip ? 'visible' : ''}`}
        style={tipStyle}
        aria-hidden={!tip}
      >
        {tip && (
          <>
            <div className="frise-tip-title">{tip.jalon.title}</div>
            <div className="frise-tip-org">{tip.jalon.org}</div>
            <div className="frise-tip-period">{tip.jalon.period}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default ParcoursProofFrise;
