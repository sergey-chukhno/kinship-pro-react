import { BadgeAPI } from '../../types';
import {
  isMetiersDeLaMerSeries,
  isSeriesWithAxesCompetenceSelection,
} from '../../utils/badgeAssignmentCompetenceSelection';
import { validateAxesSeriesCompetencies } from '../../utils/badgeAssignmentValidation';

// Validation rules for level 1 badges (exported for BadgeExplorer)
export interface BadgeValidationRule {
  mandatoryCompetencies: string[]; // Exact names of mandatory competencies
  minRequired: number; // Minimum number of competencies to select
  hintText: string; // Text to display next to label
}

const BADGE_VALIDATION_RULES: Record<string, BadgeValidationRule> = {
  'Adaptabilité': {
    mandatoryCompetencies: ['Identifie un problème (ses caractéristiques, ses conséquences) dans un projet ou une situation.'],
    minRequired: 1,
    hintText: 'Validation minimum de la compétence obligatoire ci-dessous:'
  },
  'Communication': {
    mandatoryCompetencies: [
      'Écoute et prend en compte ses interlocuteurs.',
      "Parle et argumente à l'oral de façon claire et organisée"
    ],
    minRequired: 2,
    hintText: 'Validation obligatoire des 2 compétences ci-dessous :'
  },
  'Engagement': {
    mandatoryCompetencies: ['Aller au bout de son projet, de son engagement.'],
    minRequired: 1,
    hintText: 'Validation minimum de la compétence obligatoire ci-dessous :'
  },
  'Esprit critique': {
    mandatoryCompetencies: ['Vérifie la validité d\'une information.'],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous dont la compétence obligatoire :'
  },
  'Gestion de projet': {
    mandatoryCompetencies: ['Met en œuvre une action dans un projet'],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous :'
  },
  'Formation': {
    mandatoryCompetencies: ['Aide celui qui ne sait pas.'],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous :'
  },
  'Coopération': {
    mandatoryCompetencies: ['Travaille en équipe en variant sa place et son rôle dans le groupe en tant que participant.'],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous :'
  },
  'Sociabilité': {
    mandatoryCompetencies: [],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous :'
  },
  'Organisation Opérationnelle': {
    mandatoryCompetencies: ['Se projette dans le temps.'],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous :'
  },
  'Informatique & Numérique': {
    mandatoryCompetencies: [],
    minRequired: 2,
    hintText: 'Validation minimum de 2 des 3 compétences ci-dessous :'
  },
  'Créativité': {
    mandatoryCompetencies: ['Mobilise son imagination et sa créativité pour proposer une idée.'],
    minRequired: 1,
    hintText: 'Validation minimum de la compétence obligatoire ci-dessous :'
  },
  'Étape 1 : IMPLICATION INITIALE': {
    mandatoryCompetencies: [
      "Dispose d'une connaissance de soi, ses aptitudes et sa motivation",
      "Dispose d'une connaissance concrète d'un ensemble de métiers pouvant correspondre à ses capacités"
    ],
    minRequired: 2,
    hintText: 'Validation des 2 compétences ci-dessous :'
  },
  'Étape 2: ENGAGEMENT ENCADRÉ': {
    mandatoryCompetencies: [
      "S'approprie les résultats détaillés de la phase d'investigation",
      "Construit son projet professionnel et en vérifie la pertinence"
    ],
    minRequired: 3,
    hintText: 'Validation minimum de 3 des 5 compétences ci-dessous :'
  },
  'ACTING': {
    // Level 1: 2 of 3, none mandatory
    // Level 2: 2 of 3, 1 mandatory - handled in validateCompetencies function
    mandatoryCompetencies: [
      "Maîtriser les fondamentaux du jeu d'acteur (improvisation, analyse de texte, construction de personnage)"
    ],
    minRequired: 2,
    hintText: 'Validation de 2 des 3 compétences ci-dessous :'
  },
  'ORGANISATION-LOGISTIQUE': {
    mandatoryCompetencies: [],
    minRequired: 2,
    hintText: 'Validation de 2 des 3 compétences ci-dessous :'
  },
  'IMAGE': {
    mandatoryCompetencies: [
      "Scénariser ou conceptualiser un projet audiovisuel",
      "Tourner des images, monter des images"
    ],
    minRequired: 2,
    hintText: 'Validation de 2 des 4 compétences ci-dessous dont les 2 compétences obligatoires :'
  },
  'SON': {
    mandatoryCompetencies: [],
    minRequired: 2,
    hintText: 'Validation de 2 des 3 compétences ci-dessous :'
  },
  'ORGANISATION-ARTISTIQUE': {
    mandatoryCompetencies: [],
    minRequired: 1,
    hintText: 'Validation d\'une des 2 compétences ci-dessous :'
  },
  // Série Audiovisuelle - Level 2
  'PRODUCTION': {
    mandatoryCompetencies: [
      "Se familiariser avec les différents métiers du secteur audiovisuel et les rôles de chacun, coordonner une équipe de tournage"
    ],
    minRequired: 2,
    hintText: 'Validation de 2 des 3 compétences ci-dessous dont la compétence obligatoire :'
  },
  'REGIE': {
    mandatoryCompetencies: [
      "Assurer la sécurité et l'organisation logistique d'un tournage"
    ],
    minRequired: 2,
    hintText: 'Validation de 2 des 5 compétences ci-dessous dont la compétence obligatoire :'
  },
  'MISE EN SCENE': {
    mandatoryCompetencies: [
      "Sélectionner (casting) puis diriger des acteurs"
    ],
    minRequired: 2,
    hintText: 'Validation de 2 des 4 compétences ci-dessous dont la compétence obligatoire :'
  },
  'PRISE IMAGE & LUMIERE': {
    mandatoryCompetencies: [
      "Faire un découpage technique et tourner des images (en plateau ou en extérieur) via des caméras professionnelles",
      "Connaître les mouvements de caméra et les maîtriser via du matériel professionnel"
    ],
    minRequired: 2,
    hintText: 'Validation des 2 compétences obligatoires ci-dessous :'
  },
  'POSTPRODUCTION IMAGE ET VFX': {
    mandatoryCompetencies: [],
    minRequired: 1,
    hintText: 'Validation d\'une des 3 compétences ci-dessous :'
  },
  'PRISE DE SON': {
    mandatoryCompetencies: [],
    minRequired: 1,
    hintText: 'Validation d\'une des 3 compétences ci-dessous :'
  },
  'POST PRODUCTION SON': {
    mandatoryCompetencies: [
      "Mixer et post-produire un type de projets audiovisuels et/ou cinématographiques (reportage, clip, short-comédie, publicité, court-métrage) via des logiciels professionnels adaptés"
    ],
    minRequired: 2,
    hintText: 'Validation de 2 des 4 compétences ci-dessous dont la compétence obligatoire :'
  },
  'DECO & SFX': {
    mandatoryCompetencies: [
      "Accessoirier un décor, une scène"
    ],
    minRequired: 2,
    hintText: 'Validation de 2 des 4 compétences ci-dessous dont la compétence obligatoire :'
  },
  'STYLISME& HMC': {
    mandatoryCompetencies: [
      "Connaître les différents corps de métiers : styliste, costumier, habilleur, maquilleur, coiffeur, posticheur…"
    ],
    minRequired: 1,
    hintText: 'Validation d\'une des 2 compétences ci-dessous dont la compétence obligatoire :'
  },
  // Série Parcours professionnel
  'PARCOURS DE DÉCOUVERTE - COLLÈGE': {
    mandatoryCompetencies: [
      "A mené son stage jusqu'à son terme et a respecté la cadre fixé"
    ],
    minRequired: 1,
    hintText: 'Validation de la compétence obligatoire ci-dessous :'
  },
  'PARCOURS DE FORMATION - LYCÉE': {
    mandatoryCompetencies: [
      "A mené son stage, sa PFMP ou sa période en entreprise jusqu'à son terme, en respectant le cadre professionnel."
    ],
    minRequired: 1,
    hintText: 'Validation de la compétence obligatoire ci-dessous :'
  },
  'PARCOURS DE PROFESSIONNALISATION - POST-BAC': {
    mandatoryCompetencies: [
      "A mené son stage, son contrat d'alternance ou son expérience professionnalisante jusqu'à son terme, dans le respect du cadre professionnel."
    ],
    minRequired: 1,
    hintText: 'Validation de la compétence obligatoire ci-dessous :'
  },
  'EXPÉRIENCES PROFESSIONNELLES': {
    mandatoryCompetencies: [
      "A exercé une activité professionnelle jusqu'à son terme, en respectant les obligations, les règles et les attentes du milieu professionnel."
    ],
    minRequired: 1,
    hintText: 'Validation de la compétence obligatoire ci-dessous :'
  }
};

// Level-specific validation rules (e.g. Série Soft Skills 4LAB / TouKouLeur level 2)
const BADGE_VALIDATION_RULES_BY_LEVEL: Record<string, Record<string, BadgeValidationRule>> = {
  'Adaptabilité': {
    level_2: {
      mandatoryCompetencies: ["Identifie un problème (ses caractéristiques, ses conséquences) dans un projet ou une situation."],
      minRequired: 2,
      hintText: "Validation minimum de 2 des 4 compétences ci-dessous dont la compétence obligatoire"
    }
  },
  'Communication': {
    level_2: {
      mandatoryCompetencies: [],
      minRequired: 3,
      hintText: "Validation minimum de 3 des 4 compétences ci-dessous :"
    }
  },
  'Coopération': {
    level_2: {
      mandatoryCompetencies: ["Travaille en équipe en variant sa place et son rôle dans le groupe en tant que porteur de projet, responsable équipe. (Obligatoire)"],
      minRequired: 2,
      hintText: "Validation minimum de 2 des 3 compétences ci-dessous :"
    }
  },
  'Créativité': {
    level_2: {
      mandatoryCompetencies: ["Mobilise son imagination et sa créativité au service d'un projet personnel ou collectif. (obligatoire)"],
      minRequired: 2,
      hintText: "Validation minimum de 2 des 3 compétences ci-dessous :"
    }
  },
  'Engagement': {
    level_2: {
      mandatoryCompetencies: ["Aller au bout de son projet, de son engagement. (Obligatoire)"],
      minRequired: 2,
      hintText: "Validation minimum de 2 des 3 compétences ci-dessous dont la compétence obligatoire :"
    }
  },
  'Esprit critique': {
    level_2: {
      mandatoryCompetencies: ["Vérifie la validité d'une information (obligatoire)"],
      minRequired: 2,
      hintText: "Validation minimum de 2 des 4 compétences ci-dessous dont la compétence obligatoire :"
    }
  },
  'Formation': {
    level_2: {
      mandatoryCompetencies: [],
      minRequired: 2,
      hintText: "Validation minimum de 2 des 4 compétences ci-dessous :"
    }
  },
  'Gestion de projet': {
    level_2: {
      mandatoryCompetencies: ["Apprend à gérer un projet et évalue l'atteinte des objectifs. (Obligatoire)"],
      minRequired: 2,
      hintText: "Validation minimum de 2 des 4 compétences ci-dessous :"
    }
  },
  'Informatique & Numérique': {
    level_2: {
      mandatoryCompetencies: [],
      minRequired: 2,
      hintText: "Validation minimum de 2 des 4 compétences ci-dessous :"
    }
  },
  'Organisation Opérationnelle': {
    level_2: {
      mandatoryCompetencies: ["Anticipe et planifie ses tâches. (Obligatoire)"],
      minRequired: 2,
      hintText: "Validation minimum de 2 des 4 compétences ci-dessous :"
    }
  },
  'Sociabilité': {
    level_2: {
      mandatoryCompetencies: ["Distingue son intérêt particulier de l'intérêt général. (Obligatoire)"],
      minRequired: 2,
      hintText: "Validation minimum de 2 des 4 compétences ci-dessous :"
    }
  }
};

// Canonical badge name for lookups (API may send "Information & Numérique" or "Information Numérique")
const BADGE_NAME_ALIASES: Record<string, string> = {
  'Information & Numérique': 'Informatique & Numérique',
  'Information Numérique': 'Informatique & Numérique',
};

// Helper function to get display name for badge (exported for BadgeExplorer)
// Display title should be "Information & Numérique" for this badge; match case-insensitively and with/without "&"
export const getBadgeDisplayName = (name: string): string => {
  const trimmed = name?.trim() ?? '';
  // Same normalization as normalizeBadgeNameForMatching so "INFORMATION NUMÉRIQUE" / "Informatique & Numérique" match
  const normalized = trimmed.toLowerCase().replace(/\s*&\s*/g, ' ').replace(/\s+/g, ' ').replace(/informatique/g, 'information').trim();
  if (normalized === 'information numérique') return 'Information & Numérique';
  const displayNameMap: Record<string, string> = {
    'Informatique & Numérique': 'Information & Numérique',
    'Information Numérique': 'Information & Numérique',
    'Information & Numérique': 'Information & Numérique',
  };
  return displayNameMap[trimmed] ?? trimmed;
};

// Helper function to normalize badge names for matching
// Handles variations like "Informatique & Numérique" vs "Information Numérique"
const normalizeBadgeNameForMatching = (name: string): string => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, ' ') // Replace "&" with space
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/informatique/g, 'information') // Handle "Informatique" vs "Information"
    .trim();
};

// Helper to find badge key in level-specific map (case-insensitive; resolves "Information & Numérique" / "INFORMATION NUMÉRIQUE" -> "Informatique & Numérique")
const findBadgeKey = (badgeName: string, map: Record<string, unknown>): string | undefined => {
  const trimmed = badgeName.trim();
  const nameToUse = BADGE_NAME_ALIASES[trimmed] ?? trimmed;
  if (map[nameToUse] !== undefined) return nameToUse;
  const lower = nameToUse.toLowerCase();
  let key = Object.keys(map).find(k => k.toLowerCase() === lower);
  if (key) return key;
  // Flexible match: "INFORMATION NUMÉRIQUE" vs "Informatique & Numérique"
  const flexible = normalizeBadgeNameForMatching(trimmed);
  key = Object.keys(map).find(k => normalizeBadgeNameForMatching(k) === flexible);
  return key;
};

// Helper function to get validation rules for a badge (exported for BadgeExplorer)
// When level is provided, level-specific rules take precedence (e.g. Adaptabilité Niveau 2)
export const getBadgeValidationRules = (badgeName: string, level?: string): BadgeValidationRule | null => {
  // Level-specific rules first (e.g. Adaptabilité level_2); match badge name case-insensitively
  if (level) {
    const key = findBadgeKey(badgeName, BADGE_VALIDATION_RULES_BY_LEVEL);
    if (key && BADGE_VALIDATION_RULES_BY_LEVEL[key]?.[level]) {
      return BADGE_VALIDATION_RULES_BY_LEVEL[key][level];
    }
  }
  
  // Try exact match first
  if (BADGE_VALIDATION_RULES[badgeName]) {
    return BADGE_VALIDATION_RULES[badgeName];
  }
  
  // Try case-insensitive match
  const normalizedBadgeName = badgeName.trim().toLowerCase();
  let matchingKey = Object.keys(BADGE_VALIDATION_RULES).find(
    key => key.toLowerCase() === normalizedBadgeName
  );
  
  if (matchingKey) {
    return BADGE_VALIDATION_RULES[matchingKey];
  }
  
  // Try flexible matching (handles "Informatique & Numérique" vs "Information Numérique")
  const flexibleNormalized = normalizeBadgeNameForMatching(badgeName);
  matchingKey = Object.keys(BADGE_VALIDATION_RULES).find(
    key => normalizeBadgeNameForMatching(key) === flexibleNormalized
  );
  
  return matchingKey ? BADGE_VALIDATION_RULES[matchingKey] : null;
};

// Helper function to normalize competency names for comparison (exported for BadgeExplorer)
// Removes leading/trailing whitespace and normalizes the string
export const normalizeCompetencyName = (name: string): string => {
  return name.trim();
};

// When showing the mandatory "(Obligatoire)" indicator, strip it from the name to avoid duplication
export const getCompetencyDisplayName = (name: string, isMandatory: boolean): string => {
  if (!isMandatory) return name;
  return name.replace(/\s*\([oO]bligatoire\)\s*$/, '').trim();
};

// Fallback competencies for badges that don't have them in the API
// This is a temporary solution until the backend is updated
const FALLBACK_COMPETENCIES: Record<string, Array<{ id: number; name: string }>> = {
  'Sociabilité': [
    { id: -1, name: 'Prend sa place dans le groupe en étant attentif aux autres' },
    { id: -2, name: 'Est attentif à la portée de ses paroles ou de ses actes.' },
    { id: -3, name: 'Respecte les opinions d\'autrui.' }
  ]
};

// Level-specific fallback competencies (e.g. Série Soft Skills 4LAB / TouKouLeur level 2)
const FALLBACK_COMPETENCIES_BY_LEVEL: Record<string, Record<string, Array<{ id: number; name: string }>>> = {
  'Adaptabilité': {
    level_2: [
      { id: -101, name: "Identifie un problème (ses caractéristiques, ses conséquences) dans un projet ou une situation." },
      { id: -102, name: "S'engage dans une démarche de résolution." },
      { id: -103, name: "Améliore sa performance personnelle ou collective en fonction des contraintes pour progresser et se perfectionner" },
      { id: -104, name: "Tient compte des contraintes, des matériaux et des process de production." }
    ]
  },
  'Communication': {
    level_2: [
      { id: -201, name: "Argumente à l'oral de façon claire et organisé." },
      { id: -202, name: "Adapte son niveau de langue et son discours en fonction de ses interlocuteurs (professeurs, partenaires, jeunes...)" },
      { id: -203, name: "S'exprime à l'écrit pour raconter, décrire, expliquer ou argumenter de façon claire et précise" },
      { id: -204, name: "Lit, interprète ou produit des schémas, tableaux, diagrammes, graphiques, fiches ..." }
    ]
  },
  'Coopération': {
    level_2: [
      { id: -301, name: "Travaille en équipe en variant sa place et son rôle dans le groupe en tant que porteur de projet, responsable équipe. (Obligatoire)" },
      { id: -302, name: "Négocie et recherche un accord, un compromis si besoin." },
      { id: -303, name: "S'engage dans un dialogue constructif." }
    ]
  },
  'Créativité': {
    level_2: [
      { id: -401, name: "Mobilise son imagination et sa créativité au service d'un projet personnel ou collectif. (obligatoire)" },
      { id: -402, name: "Met en œuvre des démarches et des techniques de création pour ses productions de natures diverses." },
      { id: -403, name: "Imagine, conçoit ou réalise des productions diverses de natures diverses y compris littéraires et artistiques." }
    ]
  },
  'Engagement': {
    level_2: [
      { id: -501, name: "Aller au bout de son projet, de son engagement. (Obligatoire)" },
      { id: -502, name: "Connait l'importance d'un comportement responsable vis-à-vis de l'environnement." },
      { id: -503, name: "Comprend ses responsabilités individuelles et collectives." }
    ]
  },
  'Esprit critique': {
    level_2: [
      { id: -601, name: "Analyse et exploite les erreurs." },
      { id: -602, name: "Met à l'essai plusieurs solutions." },
      { id: -603, name: "Vérifie la validité d'une information (obligatoire)" },
      { id: -604, name: "Remet en cause ses jugements initiaux après un débat argumenté." }
    ]
  },
  'Formation': {
    level_2: [
      { id: -701, name: "Met en œuvre l'attention, la mémorisation, la mobilisation des ressources pour acquérir des connaissances." },
      { id: -702, name: "Demande de l'aide pour apprendre de ses pairs." },
      { id: -703, name: "Cherche ou expérimente une ou des nouvelles techniques pertinentes." },
      { id: -704, name: "Sollicite les connaissances scientifiques, technologiques et artistiques pertinentes." }
    ]
  },
  'Gestion de projet': {
    level_2: [
      { id: -801, name: "Apprend à gérer un projet et évalue l'atteinte des objectifs. (Obligatoire)" },
      { id: -802, name: "Négocie et recherche un consensus." },
      { id: -803, name: "Tient compte des contraintes." },
      { id: -804, name: "Met en œuvre son projet après avoir évalué les conséquences de son action." }
    ]
  },
  'Informatique & Numérique': {
    level_2: [
      { id: -901, name: "Mobilise différents outils numériques pour créer des documents intégrant divers médias." },
      { id: -902, name: "Met en forme ses recherches avec des logiciels de mise en page." },
      { id: -903, name: "Utilise des outils numériques pour s'organiser, échanger et collaborer (tableur, mails, application...)." },
      { id: -904, name: "Utilise les outils (imprimantes 3D, logiciels numériques, parc informatique...) des espaces collaboratifs (tiers-lieu, FabLab...)" }
    ]
  },
  'Organisation Opérationnelle': {
    level_2: [
      { id: -1001, name: "Partage les tâches pour la mise en place d'une action." },
      { id: -1002, name: "Met en place des règles communes (en fonction du lieu et/ou de fonctionnement de l'équipe...)" },
      { id: -1003, name: "Anticipe et planifie ses tâches. (Obligatoire)" },
      { id: -1004, name: "Recherche et utilise des techniques pertinentes en fonction de son projet ou de son rôle dans celui-ci." }
    ]
  },
  'Sociabilité': {
    level_2: [
      { id: -1101, name: "Distingue son intérêt particulier de l'intérêt général. (Obligatoire)" },
      { id: -1102, name: "Sait s'engager dans un dialogue constructif." },
      { id: -1103, name: "Met à distance préjugés et stéréotypes." },
      { id: -1104, name: "Fais preuve de diplomatie dans ces propositions (accepte de les négocier si besoin)." }
    ]
  }
};

// Helper function to get competencies for a badge (exported for BadgeExplorer; API data or fallback)
export const getBadgeCompetencies = (badge: BadgeAPI | null): Array<{ id: number; name: string }> => {
  if (!badge) return [];
  
  // Level-specific fallback takes precedence (e.g. Adaptabilité Niveau 2 – corrected list); match badge name case-insensitively
  if (badge.level) {
    const key = findBadgeKey(badge.name, FALLBACK_COMPETENCIES_BY_LEVEL);
    const byLevel = key && FALLBACK_COMPETENCIES_BY_LEVEL[key][badge.level];
    if (byLevel) return byLevel;
  }
  
  // If badge has expertises from API, use them
  if (badge.expertises && badge.expertises.length > 0) {
    return badge.expertises;
  }
  
  // Otherwise, check for fallback competencies
  const fallback = FALLBACK_COMPETENCIES[badge.name];
  if (fallback) {
    return fallback;
  }
  
  return [];
};

const validateCompetencies = (
  selectedExpertiseIds: number[],
  badge: BadgeAPI | null,
  allExpertises: Array<{ id: number; name: string }>
): { isValid: boolean; errorMessage: string | null } => {
  // Validate level 1 and level 2 badges (for Série Parcours des possibles, level 2 also needs validation)
  // Also validate all levels for Série Parcours professionnel
  if (!badge) {
    return { isValid: true, errorMessage: null };
  }

  const axesValidation = validateAxesSeriesCompetencies(selectedExpertiseIds, badge);
  if (axesValidation !== null) {
    return axesValidation;
  }

  const isParcoursProfessionnel = badge.series === 'Série Parcours professionnel';
  const isTouKouLeurLevel2 = badge.series === 'Série TouKouLeur' && badge.level === 'level_2';
  const shouldValidate = badge.level === 'level_1' || 
                         (badge.level === 'level_2' && (badge.series === 'Série Parcours des possibles' || badge.series === 'Série Audiovisuelle')) ||
                         isParcoursProfessionnel ||
                         isTouKouLeurLevel2;
  
  if (!shouldValidate) {
    return { isValid: true, errorMessage: null }; // No validation for other badges
  }

  const rules = getBadgeValidationRules(badge.name, badge.level);
  console.log('=== Validation Check ===');
  console.log('Badge name:', badge.name);
  console.log('Found rules:', rules ? 'YES' : 'NO');
  if (!rules) {
    console.warn(`No validation rules found for badge: "${badge.name}"`);
    return { isValid: true, errorMessage: null }; // No rules = no validation
  }

  // Special handling for ACTING: level 1 has no mandatory, level 2 has 1 mandatory
  let effectiveMandatoryCompetencies = rules.mandatoryCompetencies;
  if (badge.name === 'ACTING' && badge.level === 'level_1') {
    effectiveMandatoryCompetencies = [];
  }

  // Get selected competency names and normalize them
  const selectedCompetencyNames = selectedExpertiseIds
    .map(id => allExpertises.find(e => e.id === id)?.name)
    .filter((name): name is string => name !== undefined)
    .map(normalizeCompetencyName);

  // Normalize mandatory competency names for comparison
  const normalizedMandatoryCompetencies = effectiveMandatoryCompetencies.map(normalizeCompetencyName);

  // Debug logging to help identify mismatches
  if (rules.mandatoryCompetencies.length > 0) {
    console.log('=== Competency Validation Debug ===');
    console.log('Badge:', badge.name);
    console.log('All available expertises:', allExpertises.map(e => ({ id: e.id, name: e.name })));
    console.log('Selected expertise IDs:', selectedExpertiseIds);
    console.log('Selected competency names (normalized):', selectedCompetencyNames);
    console.log('Mandatory competencies (from rules):', rules.mandatoryCompetencies);
    console.log('Mandatory competencies (normalized):', normalizedMandatoryCompetencies);
  }

  // Check mandatory competencies using normalized comparison
  const missingMandatory = normalizedMandatoryCompetencies.filter(
    mandatory => !selectedCompetencyNames.includes(mandatory)
  );

  if (missingMandatory.length > 0) {
    // Find the original (non-normalized) names for the error message
    const missingOriginalNames = missingMandatory.map(normalizedName => {
      const originalIndex = normalizedMandatoryCompetencies.indexOf(normalizedName);
      return effectiveMandatoryCompetencies[originalIndex];
    });
    const mandatoryList = missingOriginalNames.map(c => `"${c}"`).join(', ');
    return {
      isValid: false,
      errorMessage: `Compétence(s) obligatoire(s) manquante(s) : ${mandatoryList}`
    };
  }

  // Check minimum required
  if (selectedCompetencyNames.length < rules.minRequired) {
    return {
      isValid: false,
      errorMessage: `Vous devez sélectionner au moins ${rules.minRequired} compétence(s). Vous en avez sélectionné ${selectedCompetencyNames.length}.`
    };
  }

  return { isValid: true, errorMessage: null };
};
