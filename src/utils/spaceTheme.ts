import { ShowingPageType } from '../types';

/**
 * Couleur d'espace Kinship — suit l'ESPACE, pas la page (KIN_UX_TOTP V1.1.2).
 * Variable CSS : --couleur-espace
 */
export const SPACE_COLORS: Record<
  ShowingPageType,
  { couleurEspace: string; hover: string; primary?: string; hoverPrimary?: string }
> = {
  of: {
    couleurEspace: '#115E59', // bleu-vert pétrole — espace OF / formateur
    hover: '#0f4f4a',
    primary: '#115E59',
    hoverPrimary: '#0f4f4a',
  },
  user: {
    couleurEspace: '#30387A', // indigo — espace participant
    hover: '#262e66',
    // --primary historique (rose) conservé pour l'UI existante du dashboard user
    primary: '#db087cff',
    hoverPrimary: '#b20666ff',
  },
  pro: {
    couleurEspace: '#5570F1',
    hover: '#4c63d2',
    primary: '#5570F1',
    hoverPrimary: '#4c63d2',
  },
  edu: {
    couleurEspace: '#10b981',
    hover: '#0f9f6d',
    primary: '#10b981',
    hoverPrimary: '#0f9f6d',
  },
  teacher: {
    couleurEspace: '#ffa600ff',
    hover: '#e59400ff',
    primary: '#ffa600ff',
    hoverPrimary: '#e59400ff',
  },
};

export const NEUTRAL_SPACE = {
  couleurEspace: '#6b7280',
  hover: '#4b5563',
};

/** Applique --couleur-espace (+ --primary synchronisé) sur :root */
export function applySpaceTheme(showingPageType: ShowingPageType | null | undefined): void {
  const root = document.documentElement;
  const theme = showingPageType ? SPACE_COLORS[showingPageType] : null;

  if (!theme) {
    root.style.setProperty('--couleur-espace', NEUTRAL_SPACE.couleurEspace);
    root.style.setProperty('--couleur-espace-hover', NEUTRAL_SPACE.hover);
    root.style.setProperty('--primary', NEUTRAL_SPACE.couleurEspace);
    root.style.setProperty('--hover-primary', NEUTRAL_SPACE.hover);
    return;
  }

  root.style.setProperty('--couleur-espace', theme.couleurEspace);
  root.style.setProperty('--couleur-espace-hover', theme.hover);
  root.style.setProperty('--primary', theme.primary ?? theme.couleurEspace);
  root.style.setProperty('--hover-primary', theme.hoverPrimary ?? theme.hover);
}
