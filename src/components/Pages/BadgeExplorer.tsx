import React, { useEffect, useMemo, useState } from 'react';
import { getBadges } from '../../api/Badges';
import { BadgeAPI, BadgeSkillAPI } from '../../types';
import { getLevelLabel } from '../../utils/badgeLevelLabels';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import BadgeInfoModal from '../Modals/BadgeInfoModal';
import { getBadgeDisplayName } from '../Modals/BadgeAssignmentModal';
import './BadgeExplorer.css';

interface BadgeExplorerProps {
  onBack: () => void;
}

// Series entry: display name, optional DB name (null if à venir), comingSoon flag, description
// staticSeriesId: when set, badge list uses local static data (no API)
// axes: optional list of axes to show on parcours-detail instead of description (exact titles/descriptions)
interface SeriesEntry {
  displayName: string;
  dbName: string | null;
  comingSoon: boolean;
  description: string;
  staticSeriesId?: string;
  axes?: { title: string; description: string }[];
}

// Parcours theme color key (dashboard colors in CSS)
type ParcoursColorKey = 'green' | 'pink' | 'yellow' | 'blue';

// Optional "Cadre et légitimité" block (paragraphs with **bold** convention)
// Optional "Démarche reconnue" block (two lines)
interface Parcours {
  id: string;
  title: string;
  objectif: string;
  series: SeriesEntry[];
  colorKey: ParcoursColorKey;
  icon: string; // FA class e.g. 'fa-shapes', or image path
  iconType: 'fa' | 'img';
  cadreLegitimite?: string[];
  demarcheReconnue?: { line1: string; line2: string };
}

// Render text with **bold** segments as <strong>
function formatBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return p;
  });
}

// Series name used for static "Compétences à s'orienter - Collège" (local-only until API supports it)
export const COMPETENCES_ORIENTER_COLLEGE_SERIES = "Série Compétences à s'orienter - Collège";

// Representative badge (name, level) per series dbName for series icon on parcours-detail view
const SERIES_REPRESENTATIVE_BADGE: Record<string, { name: string; level: string }> = {
  'Série TouKouLeur': { name: 'Adaptabilité', level: '1' },
  'Série Parcours des possibles': { name: 'Étape 1 : IMPLICATION INITIALE', level: '1' },
  'Série Parcours professionnel': { name: 'PARCOURS DE DÉCOUVERTE - COLLÈGE', level: '1' },
  'Série Audiovisuelle': { name: 'IMAGE', level: '1' },
  [COMPETENCES_ORIENTER_COLLEGE_SERIES]: { name: "Compétence 1 – Chercher et trier l'information", level: '1' }
};

// Single source of truth: Parcours and their series (display names, DB names, descriptions)
const PARCOURS: Parcours[] = [
  {
    id: '1',
    title: 'Parcours de créativité',
    objectif: "Identifier, reconnaître et valoriser les compétences transversales mobilisées par les jeunes dans la vie collective, l'autonomie, les projets scolaires et extrascolaires, ainsi que dans la construction de leur insertion professionnelle.",
    colorKey: 'green',
    icon: 'fa-people-group',
    iconType: 'fa',
    series: [
      {
        displayName: 'Série Soft Skills 4LAB',
        dbName: 'Série TouKouLeur',
        comingSoon: false,
        description: "Les badges de la série Soft Skills 4LAB reconnaissent et valorisent les compétences transversales mobilisées par les jeunes dans le cadre de projets individuels ou collectifs (coopération, communication, créativité, engagement, gestion de projet...)"
      }
    ],
    cadreLegitimite: [
      "Le Parcours de créativité est issu d'une expérimentation éducative de terrain conduite initialement au sein de l'Éducation nationale, puis reprise et structurée par l'association TouKouLeur.",
      "Cette expérimentation s'appuie sur plus de **500 projets** menés auprès de plus de **12 000 élèves**, dans des contextes scolaires et extrascolaires variés.",
      "Le parcours repose sur des compétences inspirées des référentiels du **LSU**, regroupées, testées et validées en situation réelle, dans le respect des cadres éducatifs existants."
    ],
    demarcheReconnue: {
      line1: "Démarche éducative distinguée par plusieurs prix",
      line2: "TOP 30 Éducation nationale 2020 • Prix JAP 2021"
    }
  },
  {
    id: '2',
    title: 'Parcours — Compétences Psychosociales (CPS)',
    objectif: 'Renforcer les capacités émotionnelles, relationnelles et décisionnelles des jeunes pour favoriser leur bien-être et leur autonomie.',
    colorKey: 'pink',
    icon: 'fa-heart-pulse',
    iconType: 'fa',
    series: [
      {
        displayName: 'Série CPS – Compétences Psychosociales (à venir)',
        dbName: null,
        comingSoon: true,
        description: "Valorise les compétences liées à la gestion des émotions, aux relations sociales et à la prise de décision responsable, en cohérence avec le référentiel de l'Organisation Mondiale de la Santé (OMS)."
      }
    ]
  },
  {
    id: '3',
    title: "Parcours 3 – Parcours Avenir (Orientation & projection)",
    objectif: "Accompagner les jeunes dans la construction de leur projet personnel et professionnel.",
    colorKey: 'yellow',
    icon: 'fa-compass',
    iconType: 'fa',
    series: [
      {
        displayName: 'Série Parcours des possibles',
        dbName: 'Série Parcours des possibles',
        comingSoon: false,
        description: "La série du Centre des possibles permet de valoriser les compétences et talents des jeunes, pour les guider au mieux dans leur choix de développement de soi, de leurs compétences et de leur connaissance des métiers"
      },
      {
        displayName: "Série Compétences à s'orienter - Collège",
        dbName: null,
        comingSoon: false,
        description: "Les **compétences à s'orienter** permettent aux élèves de mieux se connaître, de comprendre le monde qui les entoure et de se projeter dans des parcours possibles.\n\nCe parcours s'appuie sur le **référentiel officiel « Compétences à s'orienter »** et valorise les compétences mobilisées dans des situations concrètes tout au long de la scolarité.",
        staticSeriesId: 'competences_orienter_college',
        axes: [
          { title: "Axe 1 — Connaître et s'informer sur le monde", description: "Découverte des environnements scolaires, professionnels, économiques et sociaux." },
          { title: "Axe 2 — Se découvrir et s'affirmer", description: "Identification de soi, de ses intérêts, de ses compétences, de ses valeurs." },
          { title: "Axe 3 — Se construire et se projeter", description: "Élaboration progressive de choix, projection dans des parcours possibles." }
        ]
      },
      {
        displayName: "Série Compétences à s'orienter - Lycée (à venir)",
        dbName: null,
        comingSoon: true,
        description: ''
      }
    ]
  },
  {
    id: '4',
    title: 'Parcours – Métiers & compétences professionnelles',
    objectif: "Permettre aux jeunes d'acquérir des compétences techniques et de découvrir des secteurs professionnels à travers des expériences concrètes.",
    colorKey: 'blue',
    icon: 'fa-briefcase',
    iconType: 'fa',
    series: [
      {
        displayName: 'Série Parcours professionnel',
        dbName: 'Série Parcours professionnel',
        comingSoon: false,
        description: "Valorise les compétences mobilisées dans des situations professionnelles réelles (stages, jobs, CDD, CDI, alternance...)"
      },
      {
        displayName: 'Série Audiovisuelle & Cinéma',
        dbName: 'Série Audiovisuelle',
        comingSoon: false,
        description: "Reconnaît les compétences techniques et créatives liées aux métiers de l'audiovisuel."
      },
      {
        displayName: "Série Métiers de la mer (à venir)",
        dbName: null,
        comingSoon: true,
        description: ''
      }
    ]
  }
];

// Static badges for "Série Compétences à s'orienter - Collège" (local-only; images in public/badges_competences_a_sorienter_au_college)
const STATIC_COMPETENCES_ORIENTER_BADGES: { name: string; imageFileBase: string }[] = [
  { name: "Compétence 1 – Chercher et trier l'information", imageFileBase: 'chercher_et_trier_linformation' },
  { name: "Compétence 2 – Connaitre les personnes, lieux, ressources qui peuvent m'aider", imageFileBase: 'connaitre_personnes_qui_peuvent_aider' },
  { name: "Compétence 3 – Apprendre à découvrir les parcours de formation", imageFileBase: 'apprendre_a_decovrir_les_parcours' },
  { name: "Compétence 4 – Apprendre à découvrir les métiers et le monde du travail", imageFileBase: 'apprendre_a_decouvrir_les_metiers_et_le_monde_du_travail' },
  { name: "Compétence 5 – M'interroger sur les clichés", imageFileBase: 'minterroger_sur_les_cliches' }
];

// Competencies for "Compétence 1 – Chercher et trier l'information" by level (for BadgeInfoModal)
const COMPETENCE_1_CHERCHER_TRIER_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -101, name: "Découvrir les différentes sources que peut avoir une information", category: 'expertise' },
    { id: -102, name: "Découvrir les informations essentielles d'une information (par exemple : source, titre, auteur, résumé, date…)", category: 'expertise' }
  ],
  level_2: [
    { id: -201, name: "Identifier les différentes sources d'information consultables ou mobilisables (par exemple : sites Internet, lieux, personnes…) pour effectuer ma recherche", category: 'expertise' },
    { id: -202, name: "Identifier les sources d'information les plus fiables pour m'informer (par exemple le site de l'Onisep)", category: 'expertise' },
    { id: -203, name: "Comprendre comment extraire, décoder, assimiler, trier, classer et synthétiser l'information", category: 'expertise' },
    { id: -204, name: "Comprendre les différentes étapes pour rechercher de l'information", category: 'expertise' },
    { id: -205, name: "Identifier plusieurs méthodes pour rassembler et organiser des informations (par exemple : recherche suivant des critères, organisation des informations sous la forme d'un tableau…)", category: 'expertise' }
  ],
  level_3: [
    { id: -301, name: "Planifier les étapes à suivre dans une recherche d'information", category: 'expertise' },
    { id: -302, name: "Utiliser les différentes sources d'information", category: 'expertise' },
    { id: -303, name: "Utiliser plusieurs méthodes pour rechercher de l'information (par exemple : sites Internet, lieux, personnes…)", category: 'expertise' },
    { id: -304, name: "Analyser les différents paramètres d'une information (par exemple : émetteur, contenu, fiabilité, structure…)", category: 'expertise' },
    { id: -305, name: "Croiser, mettre en lien et confronter les différentes sources d'information (par exemple comparer deux informations provenant de sites différents)", category: 'expertise' },
    { id: -306, name: "Évaluer la fiabilité d'une information (par exemple : date, source, cohérence…)", category: 'expertise' },
    { id: -307, name: "Présenter sous une forme adaptée la synthèse des informations recueillies (par exemple : tableau, schéma, carte mentale…)", category: 'expertise' }
  ],
  level_4: [
    { id: -401, name: "Utiliser les sources d'information les plus adaptées à ce que je recherche", category: 'expertise' },
    { id: -402, name: "Demander de l'aide dans mes recherches d'information quand c'est nécessaire", category: 'expertise' },
    { id: -403, name: "Développer un sens critique vis-à-vis des informations recueillies", category: 'expertise' },
    { id: -404, name: "Conduire des recherches d'information de manière autonome", category: 'expertise' },
    { id: -405, name: "Comprendre si les informations recueillies ont un intérêt pour moi", category: 'expertise' },
    { id: -406, name: "Évaluer ce que je sais déjà sur un sujet et si l'information dont je dispose est suffisante", category: 'expertise' },
    { id: -407, name: "Actualiser les informations dont je dispose", category: 'expertise' },
    { id: -408, name: "Évaluer le temps dont j'ai besoin pour mener une recherche d'information", category: 'expertise' },
    { id: -409, name: "Conserver et réutiliser les informations extraites lors de mes démarches", category: 'expertise' },
    { id: -410, name: "Expliciter les résultats de mes recherches et les partager avec autrui", category: 'expertise' },
    { id: -411, name: "Réutiliser les informations extraites dans ses démarches", category: 'expertise' },
    { id: -412, name: "Savoir rassembler et organiser l'information dans un espace personnel dynamique", category: 'expertise' },
    { id: -413, name: "Savoir expliciter les résultats de mes recherches et les partager avec autrui", category: 'expertise' },
    { id: -414, name: "Réfléchir sur les démarches possibles pour optimiser davantage mes recherches d'information", category: 'expertise' }
  ]
};

// Competencies for "Compétence 2 – Connaitre les personnes, lieux, ressources qui peuvent m'aider" by level (for BadgeInfoModal)
const COMPETENCE_2_CONNAITRE_PERSONNES_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -501, name: "Découvrir les personnes, les lieux et les acronymes de mon collège (par exemple : CDI, psy-EN, CPE, PP…)", category: 'expertise' },
    { id: -502, name: "Découvrir les rôles et les fonctions des personnes dans mon collège qui peuvent m'accompagner pour m'informer et m'orienter", category: 'expertise' },
    { id: -503, name: "Découvrir les ressources institutionnelles qui peuvent m'accompagner pour m'informer et m'orienter (par exemple : ENT, Onisep, brochures…)", category: 'expertise' },
    { id: -504, name: "Découvrir les différents événements qui peuvent m'aider à m'informer et à m'orienter (par exemple : mini-stages, salons de l'orientation, forums des métiers, journées portes ouvertes)", category: 'expertise' }
  ],
  level_2: [
    { id: -601, name: "Connaître et savoir comment consulter les personnes et les lieux, dans mon collège, qui peuvent m'aider à m'informer et à m'orienter (par exemple savoir comment prendre rendez-vous avec le ou la psy-EN)", category: 'expertise' },
    { id: -602, name: "Connaître et savoir utiliser les principales ressources institutionnelles qui peuvent m'aider à m'informer et à m'orienter (par exemple le Kiosque Onisep)", category: 'expertise' },
    { id: -603, name: "Apprendre à explorer les sites Internet qui apportent une aide dans mon orientation", category: 'expertise' },
    { id: -604, name: "Apprendre à identifier les bonnes temporalités pour solliciter et mobiliser des personnes, des lieux et des ressources", category: 'expertise' },
    { id: -605, name: "Identifier les personnes, les lieux et les ressources les plus adaptés par rapport à mes besoins en lien avec l'orientation", category: 'expertise' },
    { id: -606, name: "Repérer les différents lieux de proximité qui peuvent m'aider à m'informer et à m'orienter (par exemple : CIO, point information jeunesse…)", category: 'expertise' }
  ],
  level_3: [
    { id: -701, name: "Utiliser les sites Internet qui m'apportent une aide dans mon orientation", category: 'expertise' },
    { id: -702, name: "Identifier ce que les personnes, les lieux et les ressources peuvent m'apporter en termes d'aide à l'information et à l'orientation, et identifier leurs limites (par exemple : vision parcellaire d'un métier)", category: 'expertise' },
    { id: -703, name: "Intégrer les temporalités de l'orientation et anticiper le temps nécessaire à la mobilisation de personnes, de lieux et de ressources", category: 'expertise' },
    { id: -704, name: "Savoir comment prendre contact et comment mobiliser les personnes, les lieux et les ressources qui peuvent m'aider à m'informer et à m'orienter", category: 'expertise' },
    { id: -705, name: "Savoir comment et quand solliciter les bonnes personnes et les bonnes ressources qui peuvent m'aider à m'informer et à m'orienter", category: 'expertise' },
    { id: -706, name: "Mettre en place des démarches structurées et hiérarchisées dans la mobilisation des personnes, des lieux et des ressources (par exemple consulter d'abord le professeur principal/la professeure principale au sujet des procédures d'affectation, plutôt que de solliciter en premier lieu le chef/la cheffe d'établissement)", category: 'expertise' }
  ],
  level_4: [
    { id: -801, name: "Choisir les sites Internet les plus adaptés pour m'aider dans mon orientation", category: 'expertise' },
    { id: -802, name: "Croiser et mettre en perspective les informations provenant de deux sources différentes", category: 'expertise' },
    { id: -803, name: "Savoir comment et quand solliciter les bonnes personnes et les bonnes ressources qui peuvent m'aider à m'informer et à m'orienter au moment où j'en ai besoin", category: 'expertise' },
    { id: -804, name: "Savoir ce que chaque personne, chaque lieu et chaque ressource peuvent m'apporter comme aide à m'informer et à m'orienter", category: 'expertise' },
    { id: -805, name: "Savoir expliquer et justifier mes démarches (par exemple : Quelles personnes ont été contactées ? Pourquoi avoir consulté ce site Internet ?...)", category: 'expertise' },
    { id: -806, name: "Identifier les possibilités de me déplacer vers les personnes que je souhaite rencontrer, dans des lieux précis (par exemple : demander à mes parents, utiliser les transports en commun…)", category: 'expertise' },
    { id: -807, name: "Être à l'écoute et faire preuve de curiosité, tout en manifestant du discernement et un esprit critique face aux informations, aux conseils et aux suggestions (par exemple : réseaux sociaux, Internet, avis de quelqu'un, discours promotionnel…)", category: 'expertise' }
  ]
};

// Competencies for "Compétence 3 – Apprendre à découvrir les parcours de formation" by level (for BadgeInfoModal)
const COMPETENCE_3_APPRENDRE_DECOUVRIR_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -901, name: "Découvrir l'intérêt de faire des études", category: 'expertise' },
    { id: -902, name: "Découvrir le vocabulaire et les acronymes (par exemple : « voies d'accès », « procédures », « passerelles », « PFMP »…)", category: 'expertise' },
    { id: -903, name: "Découvrir les principaux paliers d'orientation et les temporalités dans lesquels ceux-ci s'inscrivent", category: 'expertise' },
    { id: -904, name: "Découvrir les dispositifs particuliers au collège (par exemple : prépa-métiers, enseignement agricole…)", category: 'expertise' },
    { id: -905, name: "Découvrir les voies d'orientation post-3e", category: 'expertise' },
    { id: -906, name: "Découvrir les poursuites d'études après le lycée", category: 'expertise' }
  ],
  level_2: [
    { id: -1001, name: "Utiliser les bons mots du vocabulaire associé aux études", category: 'expertise' },
    { id: -1002, name: "Connaître les conditions d'accès aux dispositifs particuliers au collège", category: 'expertise' },
    { id: -1003, name: "Connaître les conditions d'accès aux différentes voies d'orientation post-3e", category: 'expertise' },
    { id: -1004, name: "Connaître les conditions d'accès aux différentes poursuites d'études après le lycée", category: 'expertise' },
    { id: -1005, name: "Connaître les étapes à suivre pour construire un parcours de formation", category: 'expertise' },
    { id: -1006, name: "Apprendre à explorer les informations disponibles sur une formation", category: 'expertise' },
    { id: -1007, name: "Identifier plusieurs sources permettant de m'informer sur une formation", category: 'expertise' }
  ],
  level_3: [
    { id: -1101, name: "Savoir expliquer les mots du vocabulaire associé aux études", category: 'expertise' },
    { id: -1102, name: "Apprendre à combiner les différentes voies d'orientation pour construire un parcours de formation (par exemple liens entre les voies proposées au lycée et les formations dans l'enseignement supérieur)", category: 'expertise' },
    { id: -1103, name: "Explorer les attendus d'une formation", category: 'expertise' },
    { id: -1104, name: "Appliquer plusieurs méthodes pour m'informer sur une formation (par exemple : consulter une brochure, interroger des anciens élèves…)", category: 'expertise' },
    { id: -1105, name: "Comparer les contenus de plusieurs formations", category: 'expertise' },
    { id: -1106, name: "Identifier vers quels métiers et domaines professionnels conduit une formation", category: 'expertise' },
    { id: -1107, name: "Identifier les différentes voies et les passerelles possibles pour accéder à une formation", category: 'expertise' },
    { id: -1108, name: "Apprendre à réaliser une fiche de synthèse sur une formation", category: 'expertise' }
  ],
  level_4: [
    { id: -1201, name: "Mener des démarches autonomes qui permettent d'explorer les formations", category: 'expertise' },
    { id: -1202, name: "Explorer, identifier et comprendre un parcours de formation qui m'intéresse", category: 'expertise' },
    { id: -1203, name: "Restituer ce que je sais d'une formation", category: 'expertise' },
    { id: -1204, name: "Évaluer ce que je sais d'une formation et ce qu'il me reste à découvrir", category: 'expertise' },
    { id: -1205, name: "Expliquer ce qui m'intéresse dans une formation", category: 'expertise' },
    { id: -1206, name: "Prendre en considération les attendus d'une formation qui m'intéresse pour construire mon parcours", category: 'expertise' },
    { id: -1207, name: "Identifier vers quels métiers et domaines professionnels conduit une formation qui m'intéresse", category: 'expertise' },
    { id: -1208, name: "Développer un esprit critique sur le lien formation-emploi (par exemple non-linéarité des parcours)", category: 'expertise' },
    { id: -1209, name: "Comprendre que je dois continuer de m'informer sur les possibilités d'études", category: 'expertise' }
  ]
};

// Competencies for "Compétence 4 – Apprendre à découvrir les métiers et le monde du travail" by level (for BadgeInfoModal)
const COMPETENCE_4_APPRENDRE_DECOUVRIR_METIERS_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -1301, name: "Découvrir le vocabulaire associé aux métiers et au monde du travail", category: 'expertise' },
    { id: -1302, name: "Découvrir les métiers qui m'entourent", category: 'expertise' },
    { id: -1303, name: "Découvrir un métier au travers de ses différentes caractéristiques (par exemple : tâches, impact social…)", category: 'expertise' },
    { id: -1304, name: "Découvrir les relations qui existent entre les métiers (par exemple les interactions entre l'architecte, l'ingénieur civil/l'ingénieure civile et l'urbaniste dans un projet de construction)", category: 'expertise' },
    { id: -1305, name: "Découvrir la diversité des métiers, les lieux d'exercice et les conditions de travail", category: 'expertise' },
    { id: -1306, name: "Découvrir la diversité des statuts professionnels (par exemple : salariat, fonctionnariat…)", category: 'expertise' }
  ],
  level_2: [
    { id: -1401, name: "Explorer un métier (par exemple : compétences, lieu d'exercice, débouchés…)", category: 'expertise' },
    { id: -1402, name: "Décrire un métier grâce à ses différentes caractéristiques", category: 'expertise' },
    { id: -1403, name: "Découvrir de nouveaux métiers au-delà de ceux qui m'entourent", category: 'expertise' },
    { id: -1404, name: "Classer les métiers en secteurs d'activité et en familles de métiers", category: 'expertise' },
    { id: -1405, name: "Associer des métiers à des situations ou des besoins spécifiques (par exemple : quels métiers peuvent aider à guérir si on est malade ? quels métiers pour réparer une voiture ?...)", category: 'expertise' },
    { id: -1406, name: "Identifier différents moyens de me former à un métier (par exemple : statut scolaire, apprentissage…)", category: 'expertise' },
    { id: -1407, name: "Faire des liens entre formations et métiers", category: 'expertise' },
    { id: -1408, name: "Identifier différentes démarches pour m'informer sur un métier (par exemple : visite, enquête, entretien, recherche documentaire…)", category: 'expertise' }
  ],
  level_3: [
    { id: -1501, name: "Mettre en place une activité de découverte des métiers (par exemple : visite, enquête, entretien, recherche documentaire…)", category: 'expertise' },
    { id: -1502, name: "Décrire un métier dans ses différentes caractéristiques", category: 'expertise' },
    { id: -1503, name: "Comparer plusieurs métiers", category: 'expertise' },
    { id: -1504, name: "Prendre contact avec des professionnels", category: 'expertise' },
    { id: -1505, name: "Interroger des professionnels sur leurs expériences", category: 'expertise' },
    { id: -1506, name: "Appréhender un métier en termes de compétences (savoirs, savoir-faire, savoir-être)", category: 'expertise' },
    { id: -1507, name: "Identifier les évolutions des métiers et les transformations du monde du travail", category: 'expertise' },
    { id: -1508, name: "Comprendre comment changer de métier pour construire son parcours professionnel", category: 'expertise' },
    { id: -1509, name: "Identifier les lieux ou les professionnels susceptibles de m'intéresser pour faire un stage", category: 'expertise' }
  ],
  level_4: [
    { id: -1601, name: "Mener des démarches autonomes qui permettent d'explorer les métiers et le monde du travail", category: 'expertise' },
    { id: -1602, name: "Explorer, identifier et comprendre un métier qui m'intéresse", category: 'expertise' },
    { id: -1603, name: "Restituer ce que je sais d'un métier", category: 'expertise' },
    { id: -1604, name: "Évaluer ce que je sais d'un métier et ce qu'il me reste à découvrir", category: 'expertise' },
    { id: -1605, name: "Expliquer ce qui m'intéresse dans un métier", category: 'expertise' },
    { id: -1606, name: "Être capable de lier un nouveau métier que je découvre aux caractéristiques des métiers que je connais déjà (par exemple associer le métier de conducteur de train à d'autres métiers du transport ferroviaire)", category: 'expertise' },
    { id: -1607, name: "Prendre en considération les attendus d'un métier qui m'intéresse pour construire mon parcours", category: 'expertise' },
    { id: -1608, name: "Identifier les diplômes, les filières et les voies de formation permettant d'accéder à un métier", category: 'expertise' },
    { id: -1609, name: "Développer un esprit critique vis-à-vis du lien formation-emploi (par exemple non-linéarité des parcours)", category: 'expertise' },
    { id: -1610, name: "Comprendre que je dois continuer de m'informer sur les métiers et le monde du travail", category: 'expertise' }
  ]
};

// Competencies for "Compétence 5 – M'interroger sur les clichés" by level (for BadgeInfoModal)
const COMPETENCE_5_MINTERROGER_CLICHES_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -1701, name: "Découvrir à travers des exemples ce qu'est une représentation, à l'égard des formations, des métiers, des domaines professionnels, des établissements scolaires et des personnes", category: 'expertise' },
    { id: -1702, name: "Découvrir et prendre conscience de l'existence des clichés", category: 'expertise' },
    { id: -1703, name: "Découvrir les effets des représentations dans les attitudes et les comportements", category: 'expertise' },
    { id: -1704, name: "Découvrir les différentes formes d'inégalité et les principes de non-discrimination dans l'accès à une formation, un stage ou un métier", category: 'expertise' }
  ]
};

const COMPETENCE_1_NAME = "Compétence 1 – Chercher et trier l'information";
const COMPETENCE_2_NAME = "Compétence 2 – Connaitre les personnes, lieux, ressources qui peuvent m'aider";
const COMPETENCE_3_NAME = "Compétence 3 – Apprendre à découvrir les parcours de formation";
const COMPETENCE_4_NAME = "Compétence 4 – Apprendre à découvrir les métiers et le monde du travail";
const COMPETENCE_5_NAME = "Compétence 5 – M'interroger sur les clichés";

function buildStaticBadgesCompetencesOrienterCollege(): BadgeAPI[] {
  const levels: BadgeAPI['level'][] = ['level_1', 'level_2', 'level_3', 'level_4'];
  const badges: BadgeAPI[] = [];
  let id = 1;
  STATIC_COMPETENCES_ORIENTER_BADGES.forEach(({ name }) => {
    levels.forEach((level) => {
      let expertises: BadgeSkillAPI[] = [];
      if (name === COMPETENCE_1_NAME && COMPETENCE_1_CHERCHER_TRIER_EXPERTISES[level]) {
        expertises = COMPETENCE_1_CHERCHER_TRIER_EXPERTISES[level];
      } else if (name === COMPETENCE_2_NAME && COMPETENCE_2_CONNAITRE_PERSONNES_EXPERTISES[level]) {
        expertises = COMPETENCE_2_CONNAITRE_PERSONNES_EXPERTISES[level];
      } else if (name === COMPETENCE_3_NAME && COMPETENCE_3_APPRENDRE_DECOUVRIR_EXPERTISES[level]) {
        expertises = COMPETENCE_3_APPRENDRE_DECOUVRIR_EXPERTISES[level];
      } else if (name === COMPETENCE_4_NAME && COMPETENCE_4_APPRENDRE_DECOUVRIR_METIERS_EXPERTISES[level]) {
        expertises = COMPETENCE_4_APPRENDRE_DECOUVRIR_METIERS_EXPERTISES[level];
      } else if (name === COMPETENCE_5_NAME && COMPETENCE_5_MINTERROGER_CLICHES_EXPERTISES[level]) {
        expertises = COMPETENCE_5_MINTERROGER_CLICHES_EXPERTISES[level];
      }
      badges.push({
        id: id++,
        name,
        description: '',
        level,
        series: COMPETENCES_ORIENTER_COLLEGE_SERIES,
        domains: [],
        expertises
      });
    });
  });
  return badges;
}

// Axe 1 section for badge list view (3 badges under this axis; 2 more to be added later)
const STATIC_COMPETENCES_ORIENTER_AXE1_TITLE = "Axe 1 – CONNAITRE ET SAVOIR S'INFORMER SUR LE MONDE : Découverte des environnements scolaires, professionnels, économiques et sociaux";

function getStaticBadgesByAxis(): { title: string; groups: { name: string; description: string; levels: BadgeAPI[] }[] }[] {
  const allBadges = buildStaticBadgesCompetencesOrienterCollege();
  const groups: { name: string; description: string; levels: BadgeAPI[] }[] = [];
  STATIC_COMPETENCES_ORIENTER_BADGES.forEach(({ name }) => {
    const levelBadges = allBadges.filter((b) => b.name === name).sort(
      (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
    );
    groups.push({ name, description: '', levels: levelBadges });
  });
  return [{ title: STATIC_COMPETENCES_ORIENTER_AXE1_TITLE, groups }];
}

const INTRO_MESSAGE = "Explorez les parcours Kinship et les badges associés, qui permettent d'identifier et de valoriser les compétences développées par les jeunes à travers des projets, des expériences et des parcours métiers.";

const LEVEL_ORDER = ['level_1', 'level_2', 'level_3', 'level_4'] as const;

type ViewMode = 'cards' | 'parcours-detail' | 'badge-list';

const BadgeExplorer: React.FC<BadgeExplorerProps> = ({ onBack }) => {
  const [view, setView] = useState<ViewMode>('cards');
  const [selectedParcours, setSelectedParcours] = useState<Parcours | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<SeriesEntry | null>(null);
  const [selectedSeriesDbName, setSelectedSeriesDbName] = useState<string | null>(null);

  const [badges, setBadges] = useState<BadgeAPI[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Filter on badge list: "Tous les badges" or specific badge id
  const [badgeFilter, setBadgeFilter] = useState<string>('all');
  // Badge shown in the "Voir les infos du badge" modal (single level badge)
  const [badgeInfoModalBadge, setBadgeInfoModalBadge] = useState<BadgeAPI | null>(null);

  // Fetch badges only when on badge-list view with a valid series (or use static data for local-only series)
  useEffect(() => {
    if (view !== 'badge-list' || !selectedSeriesDbName) {
      setBadges([]);
      return;
    }
    if (selectedSeriesDbName === COMPETENCES_ORIENTER_COLLEGE_SERIES) {
      setBadges(buildStaticBadgesCompetencesOrienterCollege());
      setError(null);
      setIsLoading(false);
      return;
    }
    const fetchBadges = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedBadges = await getBadges({ series: selectedSeriesDbName });
        setBadges(fetchedBadges);
      } catch (err: any) {
        console.error('Error fetching badges:', err);
        setError('Erreur lors du chargement des badges');
        setBadges([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBadges();
  }, [view, selectedSeriesDbName]);

  // Cards → Parcours detail
  const handleExplorerCeParcours = (parcours: Parcours) => {
    setSelectedParcours(parcours);
    setView('parcours-detail');
  };

  // Parcours detail → Badge list (for a series)
  const handleExplorerSeries = (series: SeriesEntry) => {
    if (series.comingSoon) return;
    if (series.staticSeriesId) {
      setSelectedSeries(series);
      setSelectedSeriesDbName(COMPETENCES_ORIENTER_COLLEGE_SERIES);
      setBadgeFilter('all');
      setView('badge-list');
      return;
    }
    if (!series.dbName) return;
    setSelectedSeries(series);
    setSelectedSeriesDbName(series.dbName);
    setBadgeFilter('all');
    setView('badge-list');
  };

  // Back from badge list → Parcours detail
  const handleBackFromBadgeList = () => {
    setView('parcours-detail');
    setSelectedSeries(null);
    setSelectedSeriesDbName(null);
    setBadges([]);
    setBadgeFilter('all');
  };

  // Back from Parcours detail → Cards
  const handleBackFromParcoursDetail = () => {
    setView('cards');
    setSelectedParcours(null);
  };

  // Representative image for a series (for parcours-detail list)
  const getSeriesIconUrl = (series: SeriesEntry): string | undefined => {
    if (series.comingSoon) return undefined;
    if (series.staticSeriesId === 'competences_orienter_college') {
      const rep = SERIES_REPRESENTATIVE_BADGE[COMPETENCES_ORIENTER_COLLEGE_SERIES];
      if (!rep) return undefined;
      const levelKey = rep.level.includes('level_') ? rep.level : `level_${rep.level}`;
      return getLocalBadgeImage(rep.name, levelKey, COMPETENCES_ORIENTER_COLLEGE_SERIES);
    }
    if (!series.dbName) return undefined;
    const rep = SERIES_REPRESENTATIVE_BADGE[series.dbName];
    if (!rep) return undefined;
    const levelKey = rep.level.includes('level_') ? rep.level : `level_${rep.level}`;
    return getLocalBadgeImage(rep.name, levelKey, series.dbName);
  };

  // Filter badges by "Tous les badges" selection (all or specific badge by name)
  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'all') return badges;
    // Single-row series: filter by series when the selected option is the display title
    if (selectedSeriesDbName === 'Série Parcours des possibles' && badgeFilter === 'Parcours des possibles') {
      return badges.filter(b => b.series === 'Série Parcours des possibles');
    }
    if (selectedSeriesDbName === 'Série Parcours professionnel' && badgeFilter === 'Parcours professionnel') {
      return badges.filter(b => b.series === 'Série Parcours professionnel');
    }
    return badges.filter(b => b.name === badgeFilter);
  }, [badges, badgeFilter, selectedSeriesDbName]);

  // Group badges by title (name), one row per badge; description from level 1 only; levels sorted
  // For "Série Parcours des possibles" and "Série Parcours professionnel": one row with display title, all levels
  interface BadgeGroup {
    name: string;
    description: string;
    levels: BadgeAPI[];
  }
  const badgesByName = useMemo(() => {
    if (selectedSeriesDbName === COMPETENCES_ORIENTER_COLLEGE_SERIES) {
      return getStaticBadgesByAxis()[0]?.groups ?? [];
    }
    if (selectedSeriesDbName === 'Série Parcours des possibles') {
      const seriesBadges = filteredBadges.filter(b => b.series === 'Série Parcours des possibles');
      if (seriesBadges.length === 0) return [];
      const sorted = [...seriesBadges].sort((a, b) =>
        LEVEL_ORDER.indexOf(a.level as any) - LEVEL_ORDER.indexOf(b.level as any)
      );
      const level1 = sorted.find(b => b.level === 'level_1');
      const description = (level1?.description?.trim() ?? '') || '';
      return [{ name: 'Parcours des possibles', description, levels: sorted }];
    }
    if (selectedSeriesDbName === 'Série Parcours professionnel') {
      const seriesBadges = filteredBadges.filter(b => b.series === 'Série Parcours professionnel');
      if (seriesBadges.length === 0) return [];
      const sorted = [...seriesBadges].sort((a, b) =>
        LEVEL_ORDER.indexOf(a.level as any) - LEVEL_ORDER.indexOf(b.level as any)
      );
      const level1 = sorted.find(b => b.level === 'level_1');
      const description = (level1?.description?.trim() ?? '') || '';
      return [{ name: 'Parcours professionnel', description, levels: sorted }];
    }
    const byName = new Map<string, BadgeAPI[]>();
    filteredBadges.forEach(badge => {
      const list = byName.get(badge.name) || [];
      list.push(badge);
      byName.set(badge.name, list);
    });
    const groups: BadgeGroup[] = [];
    byName.forEach((levelBadges, name) => {
      const sorted = [...levelBadges].sort((a, b) =>
        LEVEL_ORDER.indexOf(a.level as any) - LEVEL_ORDER.indexOf(b.level as any)
      );
      const level1 = sorted.find(b => b.level === 'level_1');
      const description = (level1?.description?.trim() ?? '') || '';
      groups.push({ name, description, levels: sorted });
    });
    groups.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    return groups;
  }, [filteredBadges, selectedSeriesDbName]);

  // For static series (Compétences à s'orienter): render by axes (section title + groups)
  const contentAxes = useMemo(() => {
    if (selectedSeriesDbName === COMPETENCES_ORIENTER_COLLEGE_SERIES) return getStaticBadgesByAxis();
    return null;
  }, [selectedSeriesDbName]);

  // For stats: unique badge count and level count (from full badges)
  const badgesByLevel = useMemo(() => {
    const grouped: Record<string, BadgeAPI[]> = {
      level_1: [], level_2: [], level_3: [], level_4: []
    };
    badges.forEach(badge => {
      if (badge.level && grouped[badge.level]) grouped[badge.level].push(badge);
    });
    return grouped;
  }, [badges]);

  const renderBadgeRow = (group: BadgeGroup) => {
    const series = group.levels[0]?.series ?? selectedSeriesDbName ?? '';
    return (
      <div key={group.name} className="badge-explorer-by-title-row">
        <div className="badge-explorer-row-main">
          <div className="badge-explorer-row-left">
            <h3 className="badge-explorer-row-title">{getBadgeDisplayName(group.name)}</h3>
            {group.description && series !== 'Série Parcours des possibles' && series !== 'Série Parcours professionnel' ? (
              <div className="badge-explorer-row-description-wrap">
                <strong className="badge-explorer-row-description-label">Description :</strong>
                <p className="badge-explorer-row-description">{group.description}</p>
              </div>
            ) : null}
          </div>
          <div className="badge-explorer-row-right">
            <div className="badge-explorer-level-images">
              {group.levels.map((levelBadge) => {
                const imageUrl = getLocalBadgeImage(levelBadge.name, levelBadge.level, levelBadge.series);
                const levelNum = levelBadge.level?.replace('level_', '') || '1';
                let levelLabel = getLevelLabel(series, levelNum);
                if (series === 'Série Parcours des possibles') {
                  const suffix = levelBadge.name.replace(/^Étape\s*\d+\s*[:\s]*/i, '').trim() || `Étape ${levelNum}`;
                  levelLabel = `Niveau ${levelNum} - ${suffix}`;
                } else if (series === 'Série Parcours professionnel' && levelBadge.name.includes(' - ')) {
                  levelLabel = `${levelLabel} - ${levelBadge.name.split(' - ')[1]}`;
                }
                return (
                  <div key={`${levelBadge.name}-${levelBadge.level}`} className="badge-explorer-level-image-item">
                    {imageUrl ? (
                      <img src={imageUrl} alt={`${getBadgeDisplayName(group.name)} ${levelLabel}`} className="badge-explorer-level-img" />
                    ) : (
                      <div className="badge-explorer-level-img-placeholder" />
                    )}
                    <span className="badge-explorer-level-label">{levelLabel}</span>
                    <button
                      type="button"
                      className="btn badge-explorer-info-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setBadgeInfoModalBadge(levelBadge);
                      }}
                    >
                      Voir les infos du badge
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // —— Cards view (landing) ——
  if (view === 'cards') {
    return (
      <div className="badge-explorer-page">
        <div className="explorer-step-header">
          <button
            className="back-button"
            onClick={onBack}
            title="Revenir à la cartographie"
            type="button"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="badge-explorer-page-title">Explorer les parcours Kinship</h1>
        </div>
        <p className="badge-explorer-intro">{INTRO_MESSAGE}</p>
        <div className="badge-explorer-cards-grid">
          {PARCOURS.map((parcours) => {
            const isAllComingSoon = parcours.series.every(s => s.comingSoon);
            return (
              <div
                key={parcours.id}
                className={`badge-explorer-parcours-card parcours-${parcours.colorKey}`}
              >
                <div className="parcours-card-header">
                  {parcours.iconType === 'fa' ? (
                    <i className={`fas ${parcours.icon} parcours-card-icon`} aria-hidden />
                  ) : (
                    <img src={parcours.icon} alt="" className="parcours-card-icon-img" />
                  )}
                  <h2 className="parcours-card-title">{parcours.title}</h2>
                </div>
                <div className="parcours-card-body">
                  <p className="parcours-card-objectif"><strong>Objectif :</strong> {parcours.objectif}</p>
                  {parcours.cadreLegitimite && parcours.cadreLegitimite.length > 0 && (
                    <details className="parcours-card-cadre">
                      <summary className="parcours-card-cadre-summary">
                        <i className="fas fa-info-circle parcours-card-cadre-icon" aria-hidden />
                        <span>Cadre et légitimité du parcours</span>
                      </summary>
                      <div className="parcours-card-cadre-content">
                        {parcours.cadreLegitimite.map((para, idx) => (
                          <p key={idx} className="parcours-card-cadre-para">{formatBold(para)}</p>
                        ))}
                      </div>
                    </details>
                  )}
                  <h3 className="parcours-card-series-heading">
                    {parcours.series.length === 1 ? 'Série associée' : 'Séries associées'}
                  </h3>
                  <ul className="parcours-card-series-list">
                    {parcours.series.map((s) => {
                      const seriesIconUrl = getSeriesIconUrl(s);
                      return (
                        <li key={s.displayName} className="parcours-card-series-item">
                          <div className="parcours-card-series-item-row">
                            {seriesIconUrl ? (
                              <img src={seriesIconUrl} alt="" className="parcours-card-series-item-icon" />
                            ) : (
                              <i className="fas fa-medal parcours-card-series-item-icon-fa" aria-hidden />
                            )}
                            <span className="parcours-card-series-name">{s.displayName}</span>
                          </div>
                          {s.description && (
                            <span className="parcours-card-series-desc">{formatBold(s.description)}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {parcours.demarcheReconnue && (
                    <div className="parcours-card-demarche">
                      <h3 className="parcours-card-demarche-heading">
                        <i className="fas fa-trophy parcours-card-demarche-icon" aria-hidden />
                        <span>Démarche reconnue</span>
                      </h3>
                      <p className="parcours-card-demarche-line">
                        <i className="fas fa-trophy parcours-card-demarche-line-icon" aria-hidden />
                        {parcours.demarcheReconnue.line1}
                      </p>
                      <p className="parcours-card-demarche-line">
                        <i className="fas fa-trophy parcours-card-demarche-line-icon" aria-hidden />
                        {parcours.demarcheReconnue.line2}
                      </p>
                    </div>
                  )}
                  <div className="parcours-card-actions">
                    <button
                      type="button"
                      className={`btn parcours-card-btn ${isAllComingSoon ? 'parcours-card-btn-disabled' : ''}`}
                      onClick={() => handleExplorerCeParcours(parcours)}
                    >
                      Explorer ce parcours
                    </button>
                    {isAllComingSoon && (
                      <p className="parcours-card-construction">
                        {parcours.id === '2' ? '👉 Parcours en cours de construction' : 'Parcours en construction'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // —— Parcours detail view (list of series) ——
  if (view === 'parcours-detail' && selectedParcours) {
    return (
      <div className="badge-explorer-page">
        <div className="explorer-step-header">
          <button
            className="back-button"
            onClick={handleBackFromParcoursDetail}
            title="Retour aux parcours"
            type="button"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 className="badge-explorer-page-title">{selectedParcours.title}</h1>
        </div>
        <div className="parcours-detail-series-list">
          {selectedParcours.series.map((series) => {
            const seriesIconUrl = getSeriesIconUrl(series);
            return (
              <div key={series.displayName} className="parcours-detail-series-item">
                <div className="parcours-detail-series-icon">
                  {seriesIconUrl ? (
                    <img src={seriesIconUrl} alt="" className="parcours-detail-series-icon-img" />
                  ) : (
                    <i className="fas fa-medal parcours-detail-series-icon-placeholder" aria-hidden />
                  )}
                </div>
                <div className="parcours-detail-series-content">
                  <h3 className="parcours-detail-series-name">{series.displayName}</h3>
                  {series.axes && series.axes.length > 0 ? (
                    <div className="parcours-detail-series-axes">
                      {series.axes.map((axis, idx) => (
                        <div key={idx} className="parcours-detail-series-axis">
                          <strong className="parcours-detail-series-axis-title">{axis.title}</strong>
                          <p className="parcours-detail-series-axis-desc">👉 {axis.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : series.description ? (
                    <p className="parcours-detail-series-desc">{series.description}</p>
                  ) : null}
                  <button
                    type="button"
                    className={`btn parcours-detail-series-btn ${series.comingSoon ? 'parcours-detail-series-btn-disabled' : ''}`}
                    onClick={() => handleExplorerSeries(series)}
                    disabled={series.comingSoon}
                  >
                    {series.comingSoon ? 'À venir' : 'Explorer les badges de la série'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // —— Badge list view (series badges + "Tous les badges" filter) ——
  return (
    <div className="badge-explorer-page">
      <div className="badge-explorer-header">
        <div className="explorer-header-top">
          <div className="explorer-header-left">
            <button
              className="back-button"
              onClick={handleBackFromBadgeList}
              title="Retour à la liste des séries"
              type="button"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1>{selectedSeries?.displayName ?? 'Série'}</h1>
          </div>
        </div>
        {selectedSeries?.description && (
          <p className="series-description">{selectedSeries.description}</p>
        )}
        {!isLoading && !error && badges.length > 0 && (
          <div className="badge-explorer-header-row">
            <div className="series-stats">
              <div className="stat-item">
                <i className="fas fa-medal"></i>
                <span>{badgesByName.length} badge{badgesByName.length > 1 ? 's' : ''}</span>
              </div>
              <div className="stat-item">
                <i className="fas fa-chart-line"></i>
                <span>{Object.keys(badgesByLevel).filter(k => (badgesByLevel[k]?.length ?? 0) > 0).length} niveau{(Object.keys(badgesByLevel).filter(k => (badgesByLevel[k]?.length ?? 0) > 0).length) > 1 ? 'x' : ''}</span>
              </div>
            </div>
            <div className="badge-list-filter-wrap">
              <label htmlFor="badgeFilter" className="badge-list-filter-label">Tous les badges</label>
              <select
                id="badgeFilter"
                className="badge-list-filter-select"
                value={badgeFilter}
                onChange={(e) => setBadgeFilter(e.target.value)}
              >
                <option value="all">Tous les badges</option>
                {badgesByName.map((g) => (
                  <option key={g.name} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="badge-explorer-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Chargement des badges...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-text">{error}</p>
          </div>
        ) : badgesByName.length === 0 ? (
          <div className="empty-level-message">
            <p>Aucun badge disponible pour cette série</p>
          </div>
        ) : contentAxes ? (
          <div className="badge-explorer-by-title-list">
            {contentAxes.map((axis, idx) => (
              <section key={idx} className="badge-explorer-axis-section">
                <h3 className="badge-explorer-axis-title">{axis.title}</h3>
                {axis.groups.map((group) => renderBadgeRow(group))}
              </section>
            ))}
          </div>
        ) : (
          <div className="badge-explorer-by-title-list">
            {badgesByName.map((group) => renderBadgeRow(group))}
          </div>
        )}
      </div>
      {badgeInfoModalBadge && (
        <BadgeInfoModal
          badge={badgeInfoModalBadge}
          onClose={() => setBadgeInfoModalBadge(null)}
        />
      )}
    </div>
  );
};

export default BadgeExplorer;
