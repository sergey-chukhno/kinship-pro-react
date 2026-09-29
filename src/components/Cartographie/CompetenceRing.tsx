import React, { useMemo } from 'react';
import { CARTO_GRIS_ETEINT, CARTO_INK, getNiveauColor } from '../../constants/cartographieColors';

/**
 * Anneau de compétence — spec KIN_UX_CARTOGRAPHIE_V1_1 §2.
 * Un cran par item, les niveaux se partagent des parts ÉGALES de l'anneau
 * (2 niveaux = 2 moitiés, 4 niveaux = 4 quarts, 1 niveau = anneau plein),
 * chaque part subdivisée en autant de crans que d'items dans ce niveau.
 * Dégradé : une seule couleur (celle de l'axe), du plus clair (niveau 1) au plus
 * soutenu. Fil intérieur : un anneau fin, affiché seulement si le cran a déjà
 * été rempli en entier au moins une fois (jamais plus d'un fil, quel que soit
 * le nombre de fois où il a été complété).
 *
 * Nuance non implémentée pour l'instant (gap connu) : la distinction cran
 * "clair" (constaté une fois précédente) / "plein" (constaté à l'instant) —
 * c'est une notion de session (juste après une attestation), pas un état
 * permanent des données. Ici tout item déjà constaté est rendu "plein".
 */

export interface RingItem {
  id: string;
  name: string;
  lit: boolean;
}

export interface RingNiveau {
  /** Clé du niveau (ex. "level_1") ou nom de la CPS spécifique */
  key: string;
  items: RingItem[];
}

export interface CompetenceRingProps {
  niveaux: RingNiveau[];
  axeColor: string;
  /** Taille en pixels — 120 (grille), 230 (ouverte), 96 (catalogue) — n'importe quelle valeur fonctionne (SVG vectoriel). */
  size?: number;
  /** Contenu du centre quand au moins un item est constaté (ex. "5/6"). */
  centerLabel?: string;
  /** Icône/illustration du centre quand rien n'est constaté (jamais de "0"). */
  centerIcon?: React.ReactNode;
  showThread?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSegmentPath(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number) {
  const startOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const startInner = polarToCartesian(cx, cy, innerR, startAngle);
  const endInner = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

interface Segment {
  id: string;
  path: string;
  color: string;
  lit: boolean;
}

const CX = 50;
const CY = 50;
const OUTER_R = 46;
const INNER_R = 31;
const NIVEAU_GAP_DEG = 6;
const ITEM_GAP_DEG = 1.4;

export const CompetenceRing: React.FC<CompetenceRingProps> = ({
  niveaux,
  axeColor,
  size = 120,
  centerLabel,
  centerIcon,
  showThread = false,
  onClick,
  title,
  className,
}) => {
  const { segments, litCount, totalCount } = useMemo(() => {
    const niveauCount = niveaux.length || 1;
    const gap = niveauCount > 1 ? NIVEAU_GAP_DEG : 0;
    const anglePerNiveau = (360 - niveauCount * gap) / niveauCount;
    const segs: Segment[] = [];
    let lit = 0;
    let total = 0;
    let cursor = 0;
    niveaux.forEach((niveau, ni) => {
      const itemCount = niveau.items.length;
      const usableAngle = itemCount > 1 ? anglePerNiveau - ITEM_GAP_DEG * itemCount : anglePerNiveau;
      const anglePerItem = itemCount > 0 ? usableAngle / itemCount : 0;
      let itemCursor = cursor;
      const niveauColor = getNiveauColor(axeColor, ni, niveauCount);
      niveau.items.forEach((item) => {
        const start = itemCursor;
        const end = itemCursor + anglePerItem;
        segs.push({
          id: item.id,
          path: donutSegmentPath(CX, CY, INNER_R, OUTER_R, start, end),
          color: item.lit ? niveauColor : CARTO_GRIS_ETEINT,
          lit: item.lit,
        });
        if (item.lit) lit += 1;
        total += 1;
        itemCursor = end + ITEM_GAP_DEG;
      });
      cursor += anglePerNiveau + gap;
    });
    return { segments: segs, litCount: lit, totalCount: total };
  }, [niveaux, axeColor]);

  const fontSize = size >= 200 ? 13 : size >= 110 ? 11 : 9;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`carto-ring${onClick ? ' carto-ring-clickable' : ''}${className ? ` ${className}` : ''}`}
      role={onClick ? 'button' : 'img'}
      aria-label={title}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {/* Piste de fond pleine (même gris que les crans éteints) : comble les petits
          interstices entre crans et entre niveaux pour qu'aucun blanc de la page ne
          transparaisse dans l'anneau. */}
      <circle
        cx={CX}
        cy={CY}
        r={(INNER_R + OUTER_R) / 2}
        fill="none"
        stroke={CARTO_GRIS_ETEINT}
        strokeWidth={OUTER_R - INNER_R}
      />
      {segments.map((seg) => (
        <path key={seg.id} d={seg.path} fill={seg.color} />
      ))}
      {showThread && (
        <circle cx={CX} cy={CY} r={INNER_R - 3} fill="none" stroke={axeColor} strokeWidth={0.8} opacity={0.55} />
      )}
      {litCount === 0 ? (
        <foreignObject x={CX - 20} y={CY - 20} width={40} height={40}>
          <div className="carto-ring-center-empty">
            <div className="carto-ring-center-icon">{centerIcon ?? <i className="fas fa-star" aria-hidden="true"></i>}</div>
          </div>
        </foreignObject>
      ) : centerLabel ? (
        <text x={CX} y={CY + fontSize / 3} textAnchor="middle" fontSize={fontSize} fontWeight={800} fill={CARTO_INK}>
          {centerLabel}
        </text>
      ) : (
        <text textAnchor="middle" fontWeight={800} fill={CARTO_INK}>
          <tspan x={CX} y={CY - 6} fontSize={fontSize + 9}>
            {litCount}
          </tspan>
          <tspan x={CX} y={CY + 13} fontSize={Math.max(fontSize - 3, 7)} fontWeight={700} opacity={0.7}>
            {`SUR ${totalCount}`}
          </tspan>
        </text>
      )}
    </svg>
  );
};

export default CompetenceRing;
