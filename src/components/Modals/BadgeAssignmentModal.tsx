import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BadgeAttribution, BadgeAPI } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { getBadges, assignBadge, getProjectBadges } from '../../api/Badges';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import AvatarImage from '../UI/AvatarImage';
import './Modal.css';
import './BadgeAssignmentModal.css';
import { useToast } from '../../hooks/useToast';

interface BadgeAssignmentModalProps {
  onClose: () => void;
  onAssign: (badgeData: BadgeAttribution) => void;
  participants: {
    id: string;
    memberId: string;
    name: string;
    avatar: string;
    organization?: string;
  }[];
  preselectedParticipant?: string | null;
  projectId?: string;
  projectTitle?: string;
  availableOrganizations?: Array<{
    id: number;
    name: string;
    type: 'School' | 'Company';
    role?: string;
  }>;
}

interface Badge {
  title: string;
  image: string;
}

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

// Validation function
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

const BadgeAssignmentModal: React.FC<BadgeAssignmentModalProps> = ({ 
  onClose, 
  onAssign, 
  participants, 
  preselectedParticipant,
  projectId,
  projectTitle,
  availableOrganizations
}) => {
  const { state, addBadgeAttribution } = useAppContext();
  const { showWarning: showWarningToast, showError: showErrorToast, showSuccess: showSuccessToast } = useToast();
  const [series, setSeries] = useState('');
  const [level, setLevel] = useState('1'); // Default to level 1, disabled for other levels
  const [title, setTitle] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(preselectedParticipant ? [preselectedParticipant] : []); // Multiple selection
  const [participantsSearchTerm, setParticipantsSearchTerm] = useState('');
  const [participantsDisplayCount, setParticipantsDisplayCount] = useState(20);
  const participantsListRef = useRef<HTMLDivElement | null>(null);
  const [domaine, setDomaine] = useState('');
  const [selectedExpertises, setSelectedExpertises] = useState<number[]>([]); // Multiple selection
  const [commentaire, setCommentaire] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | undefined>(undefined);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    badgeTitle: string;
    badgeImage: string;
  } | null>(null);
  
  // API data states
  const [badges, setBadges] = useState<BadgeAPI[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeAPI | null>(null);
  
  const displaySeries = useCallback((seriesName: string) => {
    return seriesName.toLowerCase().includes('toukouleur') ? 'Série Soft Skills 4LAB' : seriesName;
  }, []);
  
  // Determine preview image (backend URL > local mapping > fallback)
  const previewImage = useMemo(() => {
    if (selectedBadge?.image_url) return selectedBadge.image_url;
    const local = getLocalBadgeImage(selectedBadge?.name, selectedBadge?.level, selectedBadge?.series);
    return local || undefined; // no image until a badge is selected
  }, [selectedBadge]);

  // Update selected participants when preselectedParticipant changes
  useEffect(() => {
    if (preselectedParticipant) {
      setSelectedParticipants([preselectedParticipant]);
    }
  }, [preselectedParticipant]);

  // Load badges from API (all levels)
  useEffect(() => {
    const fetchBadges = async () => {
      setLoadingBadges(true);
      try {
        // Fetch all badges (no level filter) to support multiple levels
        const badgesData = await getBadges();
        setBadges(badgesData);
      } catch (error) {
        console.error('Error fetching badges:', error);
        showErrorToast('Erreur lors du chargement des badges');
      } finally {
        setLoadingBadges(false);
      }
    };
    
    fetchBadges();
  }, []);

  // Determine available organizations for selection
  const organizationsForSelection = useMemo(() => {
    if (!availableOrganizations || availableOrganizations.length === 0) {
      // Extract from user's available_contexts
      const contexts = state.user?.available_contexts;
      const orgs: Array<{ id: number; name: string; type: 'School' | 'Company'; role?: string }> = [];
      
      if (contexts?.schools) {
        contexts.schools.forEach((school: any) => {
          // Only include schools where user has badge permissions
          const badgeRoles = ['superadmin', 'admin', 'referent', 'référent', 'intervenant'];
          if (badgeRoles.includes(school.role?.toLowerCase() || '')) {
            orgs.push({ id: school.id, name: school.name || 'École', type: 'School', role: school.role });
          }
        });
      }
      
      if (contexts?.companies) {
        contexts.companies.forEach((company: any) => {
          // Only include companies where user has badge permissions
          const badgeRoles = ['superadmin', 'admin', 'referent', 'référent', 'intervenant'];
          if (badgeRoles.includes(company.role?.toLowerCase() || '')) {
            orgs.push({ id: company.id, name: company.name || 'Organisation', type: 'Company', role: company.role });
          }
        });
      }
      
      return orgs;
    }
    
    return availableOrganizations;
  }, [availableOrganizations, state.user?.available_contexts]);

  // Check if user has permission to assign TouKouLeur level 3 badges for selected organization
  const canAssignTouKouLeurLevel3 = useMemo(() => {
    if (selectedBadge?.series !== 'Série TouKouLeur' || selectedBadge?.level !== 'level_3') {
      return true; // Not applicable
    }
    
    if (!selectedOrganizationId) {
      return true; // Will be validated on submit
    }
    
    const selectedOrg = organizationsForSelection.find(org => org.id === selectedOrganizationId);
    if (!selectedOrg) {
      return true; // Will be validated on submit
    }
    
    // Role may be present when orgs come from available_contexts; optional when from availableOrganizations prop
    const orgWithRole = selectedOrg as { id: number; name: string; type: 'School' | 'Company'; role?: string };
    const role = orgWithRole.role?.toLowerCase() || '';
    
    // Check role for the selected organization
    if (selectedOrg.type === 'School') {
      // Must be superadmin or admin
      return role === 'superadmin' || role === 'admin';
    } else if (selectedOrg.type === 'Company') {
      // Must be superadmin
      return role === 'superadmin';
    }
    
    return true; // Default to true if unknown type
  }, [selectedBadge, selectedOrganizationId, organizationsForSelection]);

  // Set default organization if only one available
  useEffect(() => {
    if (organizationsForSelection.length === 1) {
      setSelectedOrganizationId(organizationsForSelection[0].id);
    }
  }, [organizationsForSelection]);

  // Organize badges by series
  const badgesBySeries = useMemo(() => {
    const organized: { [series: string]: BadgeAPI[] } = {};
    badges.forEach((badge) => {
      if (!organized[badge.series]) {
        organized[badge.series] = [];
      }
      organized[badge.series].push(badge);
    });
    return organized;
  }, [badges]);

  // Get available series
  const availableSeries = useMemo(() => {
    return Object.keys(badgesBySeries);
  }, [badgesBySeries]);

  // Get badges for selected series and level
  const badgesForSeries = useMemo(() => {
    if (!series) return [];
    let filtered = (badgesBySeries[series] || []).filter((b) => b.name !== 'Test Badge');
    // Filter by level if level is selected
    if (level) {
      const levelKey = `level_${level}`;
      filtered = filtered.filter((b) => {
        const matches = b.level === levelKey;
        return matches;
      });
    }
    return filtered;
  }, [series, level, badgesBySeries]);

  // Update selected badge when title changes
  useEffect(() => {
    if (series && title) {
      const badge = badgesForSeries.find((b) => b.name === title);
      if (badge) {
        setSelectedBadge(badge);
      }
    }
  }, [series, title, badgesForSeries]);

  // Participants: filter by search, exclude selected, window for infinite scroll
  const filteredParticipants = useMemo(() => {
    const term = participantsSearchTerm.trim().toLowerCase();
    if (!term) return participants;
    return participants.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.organization || '').toLowerCase().includes(term)
    );
  }, [participants, participantsSearchTerm]);

  const availableParticipants = useMemo(
    () => filteredParticipants.filter((p) => !selectedParticipants.includes(p.memberId)),
    [filteredParticipants, selectedParticipants]
  );

  const visibleParticipants = useMemo(
    () => availableParticipants.slice(0, participantsDisplayCount),
    [availableParticipants, participantsDisplayCount]
  );

  const hasMoreParticipants = availableParticipants.length > participantsDisplayCount;

  const handleParticipantSelect = useCallback(
    (memberId: string) => {
      if (preselectedParticipant) return;
      setSelectedParticipants((prev) =>
        prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
      );
    },
    [preselectedParticipant]
  );

  const handleParticipantsScroll = useCallback(() => {
    const el = participantsListRef.current;
    if (!el || !hasMoreParticipants) return;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 100) {
      setParticipantsDisplayCount((prev) => prev + 20);
    }
  }, [hasMoreParticipants]);

  const handleParticipantsSearchChange = useCallback((value: string) => {
    setParticipantsSearchTerm(value);
    setParticipantsDisplayCount(20);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFichier(file);
      setFileName(file.name);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedBadge) {
      showWarningToast('Veuillez sélectionner un badge');
      return;
    }
    
    if (selectedParticipants.length === 0) {
      showWarningToast('Veuillez sélectionner au moins un participant');
      return;
    }
    
    if (!projectId) {
      showErrorToast('ID du projet manquant');
      return;
    }

    // Organization selection is required if multiple organizations available
    if (organizationsForSelection.length > 1 && !selectedOrganizationId) {
      showWarningToast('Veuillez sélectionner une organisation');
      return;
    }

    // Validate competencies for level 1 and level 2 badges (for "Série Parcours des possibles" and "Série Audiovisuelle")
    // Also validate all levels for "Série Parcours professionnel"
    const isParcoursProfessionnel = selectedBadge.series === 'Série Parcours professionnel';
    const isTouKouLeurLevel2 = selectedBadge.series === 'Série TouKouLeur' && selectedBadge.level === 'level_2';
    if (selectedBadge.level === 'level_1' || 
        (selectedBadge.level === 'level_2' && (selectedBadge.series === 'Série Parcours des possibles' || selectedBadge.series === 'Série Audiovisuelle' || selectedBadge.series === 'Série TouKouLeur')) ||
        isParcoursProfessionnel) {
      const competencies = getBadgeCompetencies(selectedBadge);
      if (competencies.length > 0) {
        const validation = validateCompetencies(
          selectedExpertises,
          selectedBadge,
          competencies
        );
        
        if (!validation.isValid && validation.errorMessage) {
          showWarningToast(validation.errorMessage);
          return;
        }
      }
    }

    // Validate documents and comment for level 3 and 4 badges in "Série Audiovisuelle"
    if (selectedBadge.series === 'Série Audiovisuelle' && (selectedBadge.level === 'level_3' || selectedBadge.level === 'level_4')) {
      if (!fichier) {
        showWarningToast('Vous devez joindre au moins un document (preuve) pour les badges niveau 3 et 4 de la Série Audiovisuelle');
        return;
      }
      if (!commentaire || commentaire.trim() === '') {
        showWarningToast('Le commentaire est obligatoire pour les badges niveau 3 et 4 de la Série Audiovisuelle');
        return;
      }
    }

    // Validate documents and comment for level 3 badges in "Série TouKouLeur"
    if (selectedBadge.series === 'Série TouKouLeur' && selectedBadge.level === 'level_3') {
      if (!fichier) {
        showWarningToast('Vous devez joindre au moins un document (preuve) pour les badges niveau 3 de la Série Soft Skills 4LAB');
        return;
      }
      if (!commentaire || commentaire.trim() === '') {
        showWarningToast('Le commentaire est obligatoire pour les badges niveau 3 de la Série Soft Skills 4LAB');
        return;
      }
      if (commentaire.trim().length < 100) {
        showWarningToast('Le commentaire doit contenir au moins 100 caractères pour les badges niveau 3 de la Série Soft Skills 4LAB');
        return;
      }
    }

    // Level 1 only - file is optional
    // Comment is optional for level 1

    try {
      // Prepare recipient IDs (convert string IDs to numbers)
      const recipientIds = selectedParticipants
        .map((participantId) => {
          const participant = participants.find((p) => p.memberId === participantId);
          return participant ? parseInt(participant.memberId) : null;
        })
        .filter((id): id is number => id !== null);

      if (recipientIds.length === 0) {
        showErrorToast('Aucun participant valide sélectionné');
        return;
      }

      // Prepare badge skill IDs (expertises)
      // Filter out negative IDs (fallback competencies that don't exist in backend)
      const validExpertiseIds = selectedExpertises.filter(id => id > 0);
      const badgeSkillIds = validExpertiseIds.length > 0 ? validExpertiseIds : undefined;

      // Prepare files array
      const files = fichier ? [fichier] : undefined;

      // Call API
      const response = await assignBadge(
        parseInt(projectId),
        {
          badge_id: selectedBadge.id,
          recipient_ids: recipientIds,
          badge_skill_ids: badgeSkillIds,
          comment: commentaire || undefined,
          domaine_engagement: domaine || undefined,
          organization_id: selectedOrganizationId,
        },
        files
      );

      // Show success message
      showSuccessToast(
        `Badge "${selectedBadge.name}" attribué avec succès à ${response.assigned_count} participant(s)`
      );

      // Refresh badge list by calling onAssign (which should trigger a refresh)
      // Create a mock BadgeAttribution for backward compatibility
      const selectedParticipant = participants.find((p) => p.memberId === selectedParticipants[0]);
      if (selectedParticipant) {
        const attribution: BadgeAttribution = {
          id: `badge-${Date.now()}`,
          badgeId: selectedBadge.id.toString(),
          badgeTitle: selectedBadge.name,
          badgeSeries: selectedBadge.series,
          badgeLevel: '1',
          badgeImage: '/TouKouLeur-Jaune.png', // Will be replaced by actual badge image from API
          participantId: selectedParticipant.memberId,
          participantName: selectedParticipant.name,
          participantAvatar: selectedParticipant.avatar,
          participantOrganization: selectedParticipant.organization || 'Non spécifiée',
          attributedBy: state.user?.id?.toString() || '',
          attributedByName: state.user?.name || '',
          attributedByAvatar: state.user?.avatar || '',
          attributedByOrganization: state.user?.organization || 'Non spécifiée',
          projectId: projectId,
          projectTitle: projectTitle || '',
          domaineEngagement: domaine || '',
          commentaire: commentaire || undefined,
          preuve: fichier
            ? {
                name: fichier.name,
                type: fichier.type,
                size: `${(fichier.size / 1024).toFixed(1)} KB`,
              }
            : undefined,
          dateAttribution: new Date().toISOString(),
        };
        onAssign(attribution);
      }

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error assigning badge:', error);
      const apiMessage = error.response?.data?.message || error.response?.data?.error;
      let friendlyMessage = apiMessage || error.message || "Erreur lors de l'attribution du badge";

      if (apiMessage?.toLowerCase().includes('active contract')) {
        friendlyMessage = 'Vous devez avoir un contrat actif pour attribuer des badges';
      } else if (apiMessage?.toLowerCase().includes('unable to determine organization')) {
        friendlyMessage = 'Organisation inconnue ou non autorisee pour attribuer des badges';
      } else if (apiMessage?.includes('niveau 2 de la Série Audiovisuelle') || 
                 apiMessage?.includes('joindre une preuve')) {
        // Use the specific message from backend for Level 2 Série Audiovisuelle document requirement
        friendlyMessage = apiMessage;
      } else if (apiMessage?.includes('Série Soft Skills 4LAB') || 
                 apiMessage?.includes('superadmin ou admin')) {
        // Use the specific message from backend for TouKouLeur level 3 role check
        friendlyMessage = apiMessage;
      }

      showErrorToast(friendlyMessage);
    }
  };

  const showSavoirFaires = series === 'universelle' && (level === '1' || level === '2') && title;
  const showCommentaireRequired = level === '3' || level === '4';
  const showFichierRequired = parseInt(level) >= 2;

  return (
    <div className="badge-assignment-modal-overlay" onClick={onClose}>
      <div className="badge-assignment-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="badge-assignment-modal-header">
          <h2>Attribuer un badge</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="badge-assignment-modal-body">
          {/* Badge Preview Section */}
          <div className="badge-display-section">
            <div className="badge-icon-large">
                {previewImage ? (
                  <img 
                    src={previewImage} 
                    alt={selectedBadge?.name || 'Badge'} 
                    className="badge-image-large" 
                  />
                ) : (
                  <img 
                    src="/4lab-logo.png" 
                    alt="4Lab" 
                    className="badge-image-large badge-default-logo" 
                  />
                )}
            </div>
            <div className="badge-preview-info">
                <h3>{selectedBadge ? getBadgeDisplayName(selectedBadge.name) : 'Sélectionnez un badge'}</h3>
              <p className="badge-series-level">
                  {selectedBadge ? (() => {
                    const levelNum = selectedBadge.level?.replace('level_', '') || '1';
                    let levelLabel = `Niveau ${levelNum}`;
                    if (selectedBadge.series === 'Série Parcours des possibles') {
                      levelLabel = `Niveau ${levelNum}`;
                    } else if (selectedBadge.series === 'Série Audiovisuelle') {
                      if (levelNum === '1') levelLabel = 'Niveau 1: Observable';
                      else if (levelNum === '2') levelLabel = 'Niveau 2: Preuve';
                      else if (levelNum === '3') levelLabel = 'Niveau 3: Universitaire ou Associatif';
                      else if (levelNum === '4') levelLabel = 'Niveau 4: Expérience professionnelle';
                      else levelLabel = `Niveau ${levelNum}`;
                    } else if (selectedBadge.series === 'Série Parcours professionnel') {
                      if (levelNum === '1') levelLabel = 'Niveau 1: Découverte';
                      else if (levelNum === '2') levelLabel = 'Niveau 2: Formation';
                      else if (levelNum === '3') levelLabel = 'Niveau 3: Professionnalisation';
                      else if (levelNum === '4') levelLabel = 'Niveau 4: Expériences Professionnelles';
                      else levelLabel = `Niveau ${levelNum}`;
                    } else {
                      if (levelNum === '1') levelLabel = 'Niveau 1: Découverte';
                      else if (levelNum === '2') levelLabel = 'Niveau 2: Application';
                      else if (levelNum === '3') levelLabel = 'Niveau 3: Maîtrise';
                      else if (levelNum === '4') levelLabel = 'Niveau 4: Expertise';
                    }
                    return `${displaySeries(selectedBadge.series)} - ${levelLabel}`;
                  })() : 'Sélectionnez une série et un badge'}
              </p>
              {selectedBadge?.description && (
                <div className="badge-info-detail">
                  <p><strong>Description:</strong> {selectedBadge.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className="badge-assignment-form">
            {/* Organization selection - only if multiple organizations available */}
            {organizationsForSelection.length > 1 && (
              <div className="form-group">
                <label htmlFor="organization">Organisation</label>
                <select
                  id="organization"
                  className="form-select"
                  value={selectedOrganizationId || ''}
                  onChange={(e) => setSelectedOrganizationId(parseInt(e.target.value))}
                >
                  <option value="">Sélectionner une organisation</option>
                  {organizationsForSelection.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.type === 'School' ? 'École' : 'Entreprise'})
                    </option>
                  ))}
                </select>
                {selectedBadge?.series === 'Série TouKouLeur' && selectedBadge?.level === 'level_3' && selectedOrganizationId && !canAssignTouKouLeurLevel3 && (
                  <div style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.75rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.375rem',
                    color: '#991b1b',
                    fontSize: '0.875rem'
                  }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                    Vous devez être superadmin ou admin d'école, ou superadmin d'organisation pour attribuer un badge niveau 3 de la Série Soft Skills 4LAB.
                  </div>
                )}
              </div>
            )}

            {loadingBadges ? (
              <div className="form-group">
                <p>Chargement des badges...</p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="badgeSeries">Série de badge</label>
                  <select
                    id="badgeSeries"
                    className="form-select"
                    value={series}
                    onChange={(e) => {
                      setSeries(e.target.value);
                      setTitle('');
                      setSelectedBadge(null);
                      // Reset level to 1 when series changes
                      setLevel('1');
                    }}
                  >
                    <option value="">Sélectionner une série</option>
                    {availableSeries.map((s) => (
                      <option key={s} value={s}>
                        {displaySeries(s)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level selection - Dynamic based on series */}
                {series && (
                  <div className="form-group">
                    <label htmlFor="badgeLevel">Niveau</label>
                    <select
                      id="badgeLevel"
                      className="form-select"
                      value={level}
                      onChange={(e) => {
                        setLevel(e.target.value);
                        setTitle('');
                        setSelectedBadge(null);
                      }}
                      disabled={!series}
                    >
                      <option value="1">
                        {series === 'Série Parcours des possibles' 
                          ? 'Niveau 1' 
                          : series === 'Série Audiovisuelle'
                          ? 'Niveau 1: Observable'
                          : series === 'Série Parcours professionnel'
                          ? 'Niveau 1: Découverte'
                          : 'Niveau 1: Découverte'}
                      </option>
                      <option 
                        value="2" 
                        disabled={series !== 'Série Parcours des possibles' && series !== 'Série Audiovisuelle' && series !== 'Série Parcours professionnel' && series !== 'Série TouKouLeur'}
                      >
                        {series === 'Série Parcours des possibles' 
                          ? 'Niveau 2' 
                          : series === 'Série Audiovisuelle'
                          ? 'Niveau 2: Preuve'
                          : series === 'Série Parcours professionnel'
                          ? 'Niveau 2: Formation'
                          : series === 'Série TouKouLeur'
                          ? 'Niveau 2: Application'
                          : 'Niveau 2: Application (non disponible)'}
                      </option>
                      <option 
                        value="3" 
                        disabled={series !== 'Série Audiovisuelle' && series !== 'Série Parcours professionnel' && series !== 'Série TouKouLeur'}
                      >
                        {series === 'Série Parcours des possibles' 
                          ? 'Niveau 3 (non disponible)' 
                          : series === 'Série Audiovisuelle'
                          ? 'Niveau 3: Universitaire ou Associatif'
                          : series === 'Série Parcours professionnel'
                          ? 'Niveau 3: Professionnalisation'
                          : series === 'Série TouKouLeur'
                          ? 'Niveau 3: Maîtrise'
                          : 'Niveau 3: Maîtrise (non disponible)'}
                      </option>
                      <option 
                        value="4" 
                        disabled={series !== 'Série Audiovisuelle' && series !== 'Série Parcours professionnel'}
                      >
                        {series === 'Série Parcours des possibles' 
                          ? 'Niveau 4 (non disponible)' 
                          : series === 'Série Audiovisuelle'
                          ? 'Niveau 4: Expérience professionnelle'
                          : series === 'Série Parcours professionnel'
                          ? 'Niveau 4: Expériences Professionnelles'
                          : 'Niveau 4: Expertise (non disponible)'}
                      </option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="badgeTitle">Titre du badge</label>
                  <select
                    id="badgeTitle"
                    className="form-select"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      const badge = badgesForSeries.find((b) => b.name === e.target.value);
                      setSelectedBadge(badge || null);
                    }}
                    disabled={!series || !level}
                  >
                    <option value="">Sélectionner un badge</option>
                    {badgesForSeries.map((badge) => (
                      <option key={badge.id} value={badge.name}>
                        {getBadgeDisplayName(badge.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="participants">Participants (sélection multiple)</label>
              <div className="compact-selection">
                <div className="search-input-container">
                  <i className="fas fa-search search-icon"></i>
                  <input
                    type="text"
                    id="participants"
                    className="form-input"
                    placeholder="Rechercher des participants..."
                    value={participantsSearchTerm}
                    onChange={(e) => handleParticipantsSearchChange(e.target.value)}
                    disabled={!!preselectedParticipant}
                  />
                </div>
                {selectedParticipants.length > 0 && (
                  <div className="selected-items">
                    {selectedParticipants.map((memberId) => {
                      const p = participants.find((x) => x.memberId === memberId);
                      if (!p) return null;
                      return (
                        <div key={p.memberId} className="selected-member">
                          <AvatarImage
                            src={p.avatar || undefined}
                            alt={p.name}
                            className="selected-avatar"
                          />
                          <div className="selected-info">
                            <div className="selected-name">{p.name}</div>
                            {p.organization && (
                              <div className="selected-role" style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
                                Organisation : {p.organization}
                              </div>
                            )}
                          </div>
                          {!preselectedParticipant && (
                            <button
                              type="button"
                              className="remove-selection"
                              onClick={() => handleParticipantSelect(p.memberId)}
                              aria-label={`Retirer ${p.name}`}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div
                  className="selection-list"
                  ref={participantsListRef}
                  onScroll={handleParticipantsScroll}
                  style={{ maxHeight: 280, overflowY: 'auto' }}
                >
                  {visibleParticipants.length === 0 ? (
                    <div className="no-members-message" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                      <i className="fas fa-users" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}></i>
                      <p>
                        {availableParticipants.length === 0 && filteredParticipants.length > 0
                          ? 'Tous les participants correspondants sont déjà sélectionnés'
                          : participantsSearchTerm.trim()
                            ? 'Aucun participant ne correspond à la recherche'
                            : 'Aucun participant disponible'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {visibleParticipants.map((p) => (
                        <div
                          key={p.memberId}
                          className="selection-item"
                          onClick={() => handleParticipantSelect(p.memberId)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleParticipantSelect(p.memberId);
                            }
                          }}
                        >
                          <AvatarImage
                            src={p.avatar || undefined}
                            alt={p.name}
                            className="item-avatar"
                          />
                          <div className="item-info">
                            <div className="item-name">{p.name}</div>
                            {p.organization && (
                              <div className="item-org" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                Organisation : {p.organization}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {hasMoreParticipants && (
                        <div style={{ padding: '0.5rem', textAlign: 'center', color: '#6b7280' }}>
                          <span>Faites défiler pour charger plus</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              {selectedParticipants.length > 0 && (
                <small className="field-comment">
                  {selectedParticipants.length} participant(s) sélectionné(s)
                </small>
              )}
            </div>

            {/* Domaine d'engagement field */}
            <div className="form-group">
              <label htmlFor="domaineEngagement">Domaine d'engagement</label>
              <select
                id="domaineEngagement"
                className="form-select"
                value={domaine}
                onChange={(e) => setDomaine(e.target.value)}
              >
                <option value="">Sélectionner un domaine</option>
                <option value="professionnel">Activité professionnelle (CDI, CDD, contrat d'alternance, job d'été,...)</option>
                <option value="scolaire">Cadre scolaire (projet, études,...)</option>
                <option value="associatif">Cadre associatif ou sportif (Projet, séjours)</option>
                <option value="experience">Expérience professionnelle (Formation, Stage en entreprise...)</option>
              </select>
            </div>

            {/* Compétences (sélection multiple) */}
            {selectedBadge && (selectedBadge.level === 'level_1' || 
              (selectedBadge.level === 'level_2' && (selectedBadge.series === 'Série Parcours des possibles' || selectedBadge.series === 'Série Audiovisuelle' || selectedBadge.series === 'Série TouKouLeur')) ||
              selectedBadge.series === 'Série Parcours professionnel') && (
              <div className="form-group">
                <div className="competencies-label-container">
                  <label htmlFor="expertises">Compétences (sélection multiple)</label>
                  {(() => {
                    const rules = getBadgeValidationRules(selectedBadge.name, selectedBadge.level);
                    if (rules) {
                      return (
                        <span className="competencies-hint-text">{rules.hintText}</span>
                      );
                    }
                    return null;
                  })()}
                </div>
                
                {(() => {
                  // Get competencies (from API or fallback)
                  const competencies = getBadgeCompetencies(selectedBadge);
                  
                  // Show message if no competencies available at all
                  if (competencies.length === 0) {
                    return (
                      <div className="competencies-list-empty" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                        <span>Les compétences ne sont pas encore disponibles pour ce badge.</span>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      {/* Selected competencies as chips */}
                      {selectedExpertises.length > 0 && (
                        <div className="selected-competencies-chips">
                          {selectedExpertises.map((expertiseId) => {
                            const expertise = competencies.find((e: any) => e.id === expertiseId);
                            if (!expertise) return null;
                            const isParcoursProfessionnel = selectedBadge.series === 'Série Parcours professionnel';
                            const rulesForChips = (selectedBadge.level === 'level_1' || 
                              (selectedBadge.level === 'level_2' && (selectedBadge.series === 'Série Parcours des possibles' || selectedBadge.series === 'Série Audiovisuelle' || selectedBadge.series === 'Série TouKouLeur')) ||
                              isParcoursProfessionnel) 
                              ? getBadgeValidationRules(selectedBadge.name, selectedBadge.level) : null;
                            // Use normalized comparison to check if competency is mandatory
                            const normalizedExpertiseName = normalizeCompetencyName(expertise.name);
                            const normalizedMandatory = rulesForChips?.mandatoryCompetencies.map(normalizeCompetencyName) || [];
                            const isMandatory = normalizedMandatory.includes(normalizedExpertiseName);
                            return (
                              <div key={expertiseId} className={`competency-chip ${isMandatory ? 'competency-chip-mandatory' : ''}`}>
                                <span className="competency-chip-text">{getCompetencyDisplayName(expertise.name, isMandatory)}</span>
                                {isMandatory && <span className="competency-chip-mandatory-badge">(Obligatoire)</span>}
                                <button
                                  type="button"
                                  className="competency-chip-remove"
                                  onClick={() => {
                                    setSelectedExpertises(selectedExpertises.filter(id => id !== expertiseId));
                                  }}
                                  aria-label={`Retirer ${expertise.name}`}
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Available competencies list */}
                      <div className="competencies-list-container">
                        {(() => {
                          const availableExpertises = competencies.filter(
                            (expertise: any) => !selectedExpertises.includes(expertise.id)
                          );
                          
                          if (availableExpertises.length === 0) {
                            return (
                              <div className="competencies-list-empty">
                                <i className="fas fa-check-circle"></i>
                                <span>Toutes les compétences ont été sélectionnées</span>
                              </div>
                            );
                          }
                          
                            const isParcoursProfessionnel = selectedBadge.series === 'Série Parcours professionnel';
                            const rulesForList = (selectedBadge.level === 'level_1' || 
                              (selectedBadge.level === 'level_2' && (selectedBadge.series === 'Série Parcours des possibles' || selectedBadge.series === 'Série Audiovisuelle' || selectedBadge.series === 'Série TouKouLeur')) ||
                              isParcoursProfessionnel) 
                              ? getBadgeValidationRules(selectedBadge.name, selectedBadge.level) : null;
                          
                          return availableExpertises.map((expertise: any) => {
                            // Use normalized comparison to check if competency is mandatory
                            const normalizedExpertiseName = normalizeCompetencyName(expertise.name);
                            const normalizedMandatory = rulesForList?.mandatoryCompetencies.map(normalizeCompetencyName) || [];
                            const isMandatory = normalizedMandatory.includes(normalizedExpertiseName);
                            return (
                              <button
                                key={expertise.id}
                                type="button"
                                className={`competency-item ${isMandatory ? 'competency-item-mandatory' : ''}`}
                                onClick={() => {
                                  setSelectedExpertises([...selectedExpertises, expertise.id]);
                                }}
                              >
                                <span className="competency-item-text">
                                  {getCompetencyDisplayName(expertise.name, isMandatory)}
                                  {isMandatory && <span className="competency-mandatory-indicator"> (Obligatoire)</span>}
                                </span>
                                <i className="fas fa-plus competency-item-icon"></i>
                              </button>
                            );
                          });
                        })()}
                      </div>
                      
                      {selectedExpertises.length === 0 && competencies.length > 0 && (
                        <small className="field-comment">
                          Cliquez sur une compétence pour l'ajouter à votre sélection
                        </small>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Commentaire - required for level 3 and 4 in Série Audiovisuelle, and level 3 in Série TouKouLeur */}
            <div className="form-group">
              <label htmlFor="commentaire">
                Commentaire
                {selectedBadge?.series === 'Série TouKouLeur' && selectedBadge?.level === 'level_3'
                  ? ' (obligatoire, minimum 100 caractères)'
                  : selectedBadge?.series === 'Série Audiovisuelle' && (selectedBadge?.level === 'level_3' || selectedBadge?.level === 'level_4')
                  ? ' (obligatoire pour niveau 3 et 4)'
                  : ' (optionnel)'}
              </label>
              <textarea
                id="commentaire"
                className="form-textarea"
                rows={3}
                placeholder="Ajoutez un commentaire..."
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
              />
              {selectedBadge?.series === 'Série TouKouLeur' && selectedBadge?.level === 'level_3' && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  fontSize: '0.875rem',
                  color: commentaire.trim().length >= 100 ? '#10b981' : '#ef4444',
                  fontWeight: commentaire.trim().length >= 100 ? 'normal' : '500'
                }}>
                  {commentaire.trim().length}/100 caractères
                </div>
              )}
            </div>

            {/* Fichier - required for level 3 and 4 in Série Audiovisuelle, and level 3 in Série TouKouLeur */}
            <div className="form-group">
              <label htmlFor="badgeFile">
                Fichier (preuve)
                {selectedBadge?.series === 'Série TouKouLeur' && selectedBadge?.level === 'level_3'
                  ? ' (obligatoire)'
                  : selectedBadge?.series === 'Série Audiovisuelle' && (selectedBadge?.level === 'level_3' || selectedBadge?.level === 'level_4')
                  ? ' (obligatoire pour niveau 3 et 4)'
                  : selectedBadge?.level === 'level_1'
                  ? ' (optionnel pour le niveau 1)'
                  : ' (obligatoire)'}
              </label>
              <div className="file-upload-container">
                <input
                  type="file"
                  id="badgeFile"
                  className="file-input"
                  accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov,.doc,.docx"
                  onChange={handleFileChange}
                />
                <label htmlFor="badgeFile" className="file-upload-label">
                  <i className="fas fa-upload"></i>
                  <span>Choisir un fichier</span>
                </label>
                {fileName && <div className="file-name">{fileName}</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="badge-assignment-modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Attribuer
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && successData && (
        <div className="badge-success-overlay">
          <div className="badge-success-modal">
            <div className="badge-success-content">
              <div className="badge-success-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="badge-success-badge">
                <img src={successData.badgeImage} alt={successData.badgeTitle} />
              </div>
              <h3>Badge attribué avec succès !</h3>
              <p>Le badge <strong>{successData.badgeTitle}</strong> a été attribué avec succès.</p>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowSuccess(false);
                  onClose();
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeAssignmentModal;
