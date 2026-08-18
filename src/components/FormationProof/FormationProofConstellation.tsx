import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormationProofData } from '../../types/formationProof';
import '../ProjectProof/ProjectProof.css';

interface ActorNode {
  id: string;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  label?: string[];
  labelColor?: string;
  labelSubColor?: string;
  initials?: string;
  initialsColor?: string;
}

interface AnimatedSelection {
  cx: number;
  cy: number;
  r: number;
  ringScale: number;
  opacity: number;
}

interface TipPosition {
  x: number;
  y: number;
  placement: 'right' | 'left';
}

const SVG_W = 600;
const SVG_H = 400;
const ANIM_DURATION = 380;

const NODES: ActorNode[] = [
  {
    id: 'formation',
    cx: 300,
    cy: 200,
    r: 60,
    fill: '#fff',
    stroke: '#003189',
    strokeWidth: 1.5,
    label: ['FORMATION'],
    labelColor: '#003189',
    labelSubColor: '#9ca3af',
  },
  {
    id: 'of',
    cx: 150,
    cy: 110,
    r: 40,
    fill: '#FF616F',
    label: ['Atelier', 'Numérique'],
  },
  {
    id: 'lea',
    cx: 92,
    cy: 60,
    r: 20,
    fill: '#feeaec',
    stroke: '#FF616F',
    strokeWidth: 1.5,
    initials: 'LF',
    initialsColor: '#FF616F',
  },
  {
    id: 'dutto',
    cx: 455,
    cy: 115,
    r: 40,
    fill: '#fff',
    stroke: '#2A8A9F',
    strokeWidth: 2,
    label: ['Cabinet', 'Dutto'],
    labelColor: '#2A8A9F',
    labelSubColor: '#2A8A9F',
  },
];

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function nodeToTipPosition(cx: number, cy: number, r: number): TipPosition {
  const placeOnRight = cx <= SVG_W / 2 + 16;
  const gap = 20;
  const edgeOffset = r + gap;
  const centerX = (cx / SVG_W) * 100;
  const centerY = (cy / SVG_H) * 100;
  const offsetXPct = (edgeOffset / SVG_W) * 100;

  return {
    x: placeOnRight ? centerX + offsetXPct : centerX - offsetXPct,
    y: centerY,
    placement: placeOnRight ? 'right' : 'left',
  };
}

function useAnimatedSelection(target: ActorNode | null) {
  const frameRef = useRef<number | undefined>(undefined);
  const currentRef = useRef<AnimatedSelection>({
    cx: 300,
    cy: 200,
    r: 60,
    ringScale: 1,
    opacity: 0,
  });
  const [anim, setAnim] = useState<AnimatedSelection>(currentRef.current);
  const [tipPos, setTipPos] = useState<TipPosition | null>(null);

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    if (!target) {
      const from = currentRef.current;
      const start = performance.now();

      const fadeOut = (now: number) => {
        const t = Math.min((now - start) / 220, 1);
        const next = { ...from, opacity: 1 - t, ringScale: 1 - t * 0.15 };
        currentRef.current = next;
        setAnim(next);
        if (t < 1) frameRef.current = requestAnimationFrame(fadeOut);
      };

      frameRef.current = requestAnimationFrame(fadeOut);
      setTipPos(null);
      return () => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };
    }

    const from = currentRef.current;
    const to = { cx: target.cx, cy: target.cy, r: target.r };
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / ANIM_DURATION, 1);
      const move = easeOutCubic(t);
      const pop = easeOutBack(Math.min(t * 1.35, 1));

      const next: AnimatedSelection = {
        cx: from.cx + (to.cx - from.cx) * move,
        cy: from.cy + (to.cy - from.cy) * move,
        r: from.r + (to.r - from.r) * move,
        ringScale: 0.78 + pop * 0.22,
        opacity: Math.max(from.opacity, Math.min(t * 2.5, 1)),
      };

      currentRef.current = next;
      setAnim(next);
      setTipPos(nodeToTipPosition(next.cx, next.cy, next.r));

      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target?.id, target?.cx, target?.cy, target?.r]);

  return { anim, tipPos };
}

interface FormationProofConstellationProps {
  proof: FormationProofData;
}

const FormationProofConstellation: React.FC<FormationProofConstellationProps> = ({ proof }) => {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = NODES.find((n) => n.id === selectedId) ?? null;
  const { anim, tipPos } = useAnimatedSelection(selectedNode);

  const handleNodeClick = useCallback((node: ActorNode, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedId((prev) => (prev === node.id ? null : node.id));
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!zoneRef.current?.contains(target)) return;
      if (!target.closest('.constellation-node-circle') && !target.closest('.constellation-tip')) {
        setSelectedId(null);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const selectedTip = selectedId ? proof.actorTips[selectedId] : null;

  return (
    <div className="constellation" ref={zoneRef}>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        role="img"
        aria-label={`Réseau de co-attestation : ${proof.orgName} (émettrice), Cabinet Dutto (co-attestant), 1 formatrice, ${proof.kpis.participants} participants`}
      >
        <g className="constellation-lines">
          <line x1="300" y1="200" x2="150" y2="110" stroke="#FF616F" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.18" />
          <line x1="300" y1="200" x2="455" y2="115" stroke="#2A8A9F" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.18" />
        </g>

        <g className="constellation-orbits">
          <circle cx="150" cy="110" r="62" fill="none" stroke="#FF616F" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.1" />
          <circle cx="455" cy="115" r="62" fill="none" stroke="#2A8A9F" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.1" />
        </g>

        <g className="constellation-nodes">
          {NODES.map((node) => {
            const isSelected = selectedId === node.id;
            const isCenter = node.id === 'formation';

            return (
              <g
                key={node.id}
                className={`constellation-node ${isSelected ? 'constellation-node-selected' : ''}`}
              >
                {isCenter ? (
                  <>
                    <circle
                      className="constellation-node-circle"
                      cx={node.cx}
                      cy={node.cy}
                      r={node.r}
                      fill="rgba(0,49,137,.04)"
                      stroke={node.stroke}
                      strokeWidth={node.strokeWidth}
                      strokeDasharray="5 4"
                      onClick={(e) => handleNodeClick(node, e)}
                    >
                      <title>{proof.actorTips[node.id]?.name ?? node.id}</title>
                    </circle>
                    <text
                      x={node.cx}
                      y={node.cy - 7}
                      textAnchor="middle"
                      fontSize="15"
                      fontWeight="700"
                      fill="#003189"
                      pointerEvents="none"
                    >
                      FORMATION
                    </text>
                    <text
                      x={node.cx}
                      y={node.cy + 12}
                      textAnchor="middle"
                      fontSize="13"
                      fill="#9ca3af"
                      pointerEvents="none"
                    >
                      {proof.kpis.participants} participants
                    </text>
                  </>
                ) : (
                  <circle
                    className="constellation-node-circle"
                    cx={node.cx}
                    cy={node.cy}
                    r={node.r}
                    fill={node.fill}
                    stroke={node.stroke}
                    strokeWidth={node.strokeWidth ?? 0}
                    onClick={(e) => handleNodeClick(node, e)}
                  >
                    <title>{proof.actorTips[node.id]?.name ?? node.id}</title>
                  </circle>
                )}

                {!isCenter && node.initials && (
                  <text
                    x={node.cx}
                    y={node.cy + 4}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="700"
                    fill={node.initialsColor}
                    pointerEvents="none"
                  >
                    {node.initials}
                  </text>
                )}

                {!isCenter && node.label && (
                  <>
                    <text
                      x={node.cx}
                      y={node.cy - (node.label.length > 1 ? 6 : 0)}
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="700"
                      fill={node.labelColor ?? '#fff'}
                      pointerEvents="none"
                    >
                      {node.label[0]}
                    </text>
                    {node.label[1] && (
                      <text
                        x={node.cx}
                        y={node.cy + 10}
                        textAnchor="middle"
                        fontSize="13"
                        fill={node.labelSubColor ?? 'rgba(255,255,255,.7)'}
                        pointerEvents="none"
                      >
                        {node.label[1]}
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}
        </g>

        {anim.opacity > 0.01 && (
          <g className="constellation-selection" pointerEvents="none" opacity={anim.opacity}>
            <g transform={`translate(${anim.cx} ${anim.cy}) scale(${anim.ringScale})`}>
              <circle className="constellation-selection-pulse" cx={0} cy={0} r={anim.r + 12} />
              <circle className="constellation-selection-ring" cx={0} cy={0} r={anim.r + 5} />
            </g>
          </g>
        )}
      </svg>

      {selectedTip && tipPos && anim.opacity > 0.01 && (
        <div
          className={`constellation-tip constellation-tip-${tipPos.placement}`}
          style={{
            left: `${tipPos.x}%`,
            top: `${tipPos.y}%`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div key={selectedId} className="constellation-tip-inner">
            <div className="constellation-tip-name">{selectedTip.name}</div>
            <div className="constellation-tip-meta">{selectedTip.meta}</div>
            {selectedTip.badges && (
              <div className="constellation-tip-badges">{selectedTip.badges}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormationProofConstellation;
