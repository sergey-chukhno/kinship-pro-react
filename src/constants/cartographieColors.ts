/**
 * Cartographie V1.1 — table de couleurs réelle (spec KIN_UX_CARTOGRAPHIE_V1_1, §10).
 * Une couleur par axe (jamais par compétence). Sources : Charte TouKouLeur 2022,
 * Référentiel Avenir(s)/Onisep, icônes Métiers de la mer, Santé publique France.
 * Ne pas inventer de couleur ici : si un axe manque, ajouter sa vraie couleur, pas un placeholder.
 */

export const CARTO_AXE_COLORS: Record<string, string> = {
  // Compétences transversales — Charte TouKouLeur 2022
  'Relationnel': '#FF616F',
  'Personnel': '#F0A03C',
  'Méthode': '#48A78D',
  'Création': '#783A7F',

  // Compétences à s'orienter — Référentiel Avenir(s) / Onisep
  "Connaître et savoir s'informer sur le monde": '#EE7203',
  "Se découvrir et s'affirmer": '#AF1C62',
  'Se construire et se projeter dans un monde en mouvement': '#00A5AE',

  // Métiers de la mer — fournies avec les icônes
  'Vie en collectivité': '#0FA099',
  'Expérience de la mer et sécurité': '#F9B234',
  'Engagement et construction du projet professionnel': '#164FA0',

  // Compétences psychosociales — Santé publique France
  'Cognitives': '#153F93',
  'Émotionnelles': '#E60058',
  'Sociales': '#782182',
};

/** Encre / texte (§10) */
export const CARTO_INK = '#30387A';
/** Gris des crans jamais constatés (§10) */
export const CARTO_GRIS_ETEINT = '#DCDAD4';
/** Bleu ciel — réservé à une série à venir, ne jamais l'utiliser ailleurs (§10) */
export const CARTO_BLEU_RESERVE = '#49B6D7';

/** Couleur de repli quand l'axe n'est pas (encore) dans la table ci-dessus — jamais le bleu réservé. */
export const CARTO_FALLBACK_COLOR = '#8f8da0';

/**
 * Nom d'affichage d'un axe — retire un éventuel préfixe "Axe N: " / "Axe N – "
 * porté par les données (ex. Métiers de la mer, Compétences à s'orienter).
 * Jamais utilisé pour le regroupement (qui reste sur le titre brut de badgeAxes.ts),
 * uniquement pour le texte affiché et la résolution de couleur ci-dessous.
 */
export function displayAxeTitle(axeTitle: string | null | undefined): string {
  if (!axeTitle) return '';
  return axeTitle.replace(/^Axe\s*\d+\s*[:\-\u2013\u2014]\s*/i, '').trim();
}

export function getAxeColor(axeTitle: string | null | undefined): string {
  if (!axeTitle) return CARTO_FALLBACK_COLOR;
  if (CARTO_AXE_COLORS[axeTitle]) return CARTO_AXE_COLORS[axeTitle];
  const normalized = displayAxeTitle(axeTitle);
  return CARTO_AXE_COLORS[normalized] ?? CARTO_FALLBACK_COLOR;
}

/**
 * Nom d'affichage d'une compétence — retire un éventuel préfixe "Niveau N - "
 * porté par le nom brut (ex. Série Métiers de la mer, où chaque badge est nommé
 * "Niveau 1 - Respect des autres"). Jamais utilisé pour le regroupement/dédoublonnage
 * (qui reste sur le nom brut), uniquement pour le texte affiché sur la tuile.
 */
export function displayCompetenceName(name: string): string {
  return name.replace(/^(Niveau|Comp\u00e9tence)\s*\d+\s*[-\u2013\u2014]\s*/i, '').trim();
}

/**
 * Teinte un hex avec du blanc (mix) — utilisé pour le dégradé clair→foncé par niveau
 * (niveau 1 = plus clair) et pour l'état "clair" d'un cran.
 * ratio 0 = couleur pure, 1 = blanc pur.
 */
export function tintWithWhite(hex: string, ratio: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (channel: number) => clamp(channel + (255 - channel) * ratio);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

/** Couleur d'un niveau donné dans un dégradé à N niveaux (niveau 1 = le plus clair). */
export function getNiveauColor(axeColor: string, niveauIndex: number, niveauCount: number): string {
  if (niveauCount <= 1) return axeColor;
  // niveau 1 → ~45% de blanc mélangé, dernier niveau → couleur pure.
  const maxTint = 0.45;
  const ratio = maxTint * (1 - niveauIndex / (niveauCount - 1));
  return tintWithWhite(axeColor, ratio);
}
