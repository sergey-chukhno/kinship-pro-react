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
          { title: "Axe 3 — Se construire et se projeter dans un monde en mouvement", description: "Élaboration progressive de choix, projection dans des parcours possibles." }
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
// axe: 1 = Axe 1, 2 = Axe 2, 3 = Axe 3 (default 1)
const STATIC_COMPETENCES_ORIENTER_BADGES: { name: string; imageFileBase: string; axe?: number }[] = [
  { name: "Compétence 1 – Chercher et trier l'information", imageFileBase: 'chercher_et_trier_linformation', axe: 1 },
  { name: "Compétence 2 – Connaitre les personnes, lieux, ressources qui peuvent m'aider", imageFileBase: 'connaitre_personnes_qui_peuvent_aider', axe: 1 },
  { name: "Compétence 3 – Apprendre à découvrir les parcours de formation", imageFileBase: 'apprendre_a_decovrir_les_parcours', axe: 1 },
  { name: "Compétence 4 – Apprendre à découvrir les métiers et le monde du travail", imageFileBase: 'apprendre_a_decouvrir_les_metiers_et_le_monde_du_travail', axe: 1 },
  { name: "Compétence 5 – M'interroger sur les clichés", imageFileBase: 'minterroger_sur_les_cliches', axe: 1 },
  { name: "Compétence 1 – Apprendre à me connaitre", imageFileBase: 'apprendre_a_me_connaitre', axe: 2 },
  { name: "Compétence 2 – Définir mes projets en fonction de qui je suis", imageFileBase: 'definir_mes_projets_en_fonction_de_qui_je_suis', axe: 2 },
  { name: "Compétence 3 – M'autoriser à rêver et à avoir des ambitions", imageFileBase: 'mautoriser_rever_et_a_avoir_des_ambitions', axe: 2 },
  { name: "Compétence 4 – Savoir me présenter et m'affirmer", imageFileBase: 'savoir_me_presenter_et_maffirmer', axe: 2 },
  { name: "Compétence 5 – Identifier ce que j'ai appris et ce que je sais faire", imageFileBase: 'identifier_ce_que_jai_appris_et_ce_que_je_sais_faire', axe: 2 },
  { name: "Compétence 1 – Accepter les imprévus et saisir les occasions", imageFileBase: 'accepter_les_imprevus_et_saisir_les_occasions', axe: 3 },
  { name: "Compétence 2 – M'ouvrir au monde et aux autres", imageFileBase: 'mouvrir_au_monde_et_aux_autres', axe: 3 },
  { name: "Compétence 3 – Me préparer aux transitions et aux changements", imageFileBase: 'me_preparer_aux_transitions_et_aux_changements', axe: 3 },
  { name: "Compétence 4 – Me projeter et comprendre les conséquences de mes choix", imageFileBase: 'me_projeter_et_comprendre_les_consequences_de_mes_choix', axe: 3 }
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

// Competencies for Axe 2 "Compétence 1 – Apprendre à me connaitre" by level (for BadgeInfoModal)
const COMPETENCE_AXE2_1_APPRENDRE_ME_CONNAITRE_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -1801, name: "Découvrir les notions et le vocabulaire liés à la connaissance de soi (par exemple : personnalité, intérêts, passions, valeurs, envies, motivations, compétences…)", category: 'expertise' },
    { id: -1802, name: "Découvrir la notion de « connaissance de soi » et sa dynamique dans le temps", category: 'expertise' },
    { id: -1803, name: "Découvrir l'intérêt de la connaissance de soi pour construire mon parcours d'orientation (par exemple choisir un métier qui me plaît)", category: 'expertise' }
  ],
  level_2: [
    { id: -1901, name: "Savoir utiliser les notions et le vocabulaire liés à la connaissance de soi", category: 'expertise' },
    { id: -1902, name: "Explorer les différentes méthodes possibles pour connaître les différentes facettes de soi (par exemple : personnes, ressources, outils, postures…)", category: 'expertise' },
    { id: -1903, name: "Comprendre les aspects dynamiques et potentiellement changeants dans chaque registre de la connaissance de soi (par exemple avoir un intérêt nouveau pour un métier)", category: 'expertise' },
    { id: -1904, name: "Comprendre le rôle des facteurs liés à soi et à des facteurs extérieurs qui peuvent influencer la construction de soi (par exemple les parents transmettent des valeurs à leurs enfants)", category: 'expertise' },
    { id: -1905, name: "Comprendre les paradoxes qui peuvent exister dans la conjugaison des éléments de connaissance de soi (par exemple vouloir aider les autres, mais ne pas être à l'aise face à eux)", category: 'expertise' }
  ],
  level_3: [
    { id: -2001, name: "Développer un regard éclairé sur les méthodes d'exploration de la connaissance de soi (par exemple les réponses obtenues à un quiz portant sur les intérêts professionnels)", category: 'expertise' },
    { id: -2002, name: "Sélectionner, utiliser et combiner plusieurs méthodes pour explorer la connaissance de soi dans ses différents registres", category: 'expertise' },
    { id: -2003, name: "Savoir utiliser, sélectionner et combiner différentes méthodes pour explorer chaque aspect de la connaissance de soi", category: 'expertise' },
    { id: -2004, name: "Hiérarchiser les éléments de connaissance de soi à l'intérieur d'un même registre (classer mes centres d'intérêt par ordre de préférence)", category: 'expertise' },
    { id: -2005, name: "Comprendre comment mes éléments de connaissance de soi ont pu évoluer au cours de mon parcours de vie", category: 'expertise' },
    { id: -2006, name: "Identifier mes propres paradoxes dans les éléments de connaissance de soi (par exemple avoir de très bonnes notes en mathématiques sans pour autant avoir un intérêt pour cette discipline)", category: 'expertise' }
  ],
  level_4: [
    { id: -2101, name: "Affirmer et justifier mes choix en fonction des éléments de connaissance de soi", category: 'expertise' },
    { id: -2102, name: "Me décrire en conjuguant les registres de la connaissance de soi", category: 'expertise' },
    { id: -2103, name: "Interroger et actualiser mes éléments de connaissance de soi", category: 'expertise' },
    { id: -2104, name: "Engager des démarches adaptées pour approfondir la connaissance de soi", category: 'expertise' },
    { id: -2105, name: "Avoir conscience de qui je suis, de comment je fonctionne et être capable de l'expliciter", category: 'expertise' },
    { id: -2106, name: "Concilier mes paradoxes avec mes éléments de connaissance de soi", category: 'expertise' }
  ]
};

// Competencies for Axe 2 "Compétence 2 – Définir mes projets en fonction de qui je suis" by level (for BadgeInfoModal)
const COMPETENCE_AXE2_2_DEFINIR_PROJETS_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -2201, name: "Découvrir la notion de projet dans ses différentes formes (par exemple : projet de formation, projet professionnel, projet de vie…)", category: 'expertise' },
    { id: -2202, name: "Découvrir les notions d'attendus, de prérequis et d'exigences pour accéder à une formation, un stage ou un métier et y réussir", category: 'expertise' },
    { id: -2203, name: "Découvrir la notion d'adéquation dans différents contextes (par exemple : adéquation formation-emploi)", category: 'expertise' }
  ],
  level_2: [
    { id: -2301, name: "Explorer les attendus, les prérequis et les exigences d'une formation, d'un stage ou d'un métier", category: 'expertise' },
    { id: -2302, name: "Comprendre les différentes formes d'adéquations (par exemple : liens entre mon profil et les attendus d'une formation ; formations permettant d'accéder à un métier…)", category: 'expertise' },
    { id: -2303, name: "Analyser les mises en lien possibles entre le profil d'une personne et les attendus, les prérequis et les exigences d'une formation, d'un stage ou d'un métier", category: 'expertise' },
    { id: -2304, name: "Différencier et mettre en lien « pouvoir », « savoir », « vouloir »", category: 'expertise' },
    { id: -2305, name: "Comprendre les articulations possibles entre des choix et des éléments de la connaissance de soi", category: 'expertise' },
    { id: -2306, name: "Identifier les actions à mener pour construire progressivement un projet (par exemple : projet de formation, projet professionnel, projet de vie…)", category: 'expertise' },
    { id: -2307, name: "Identifier les facteurs individuels et environnementaux qui peuvent conduire à faire évoluer un projet", category: 'expertise' },
    { id: -2308, name: "Relier mes choix passés, présents et futurs à des éléments de la connaissance de soi", category: 'expertise' }
  ],
  level_3: [
    { id: -2401, name: "Planifier les actions à mener pour construire progressivement mon projet (par exemple : projet de formation, projet professionnel, projet de vie…)", category: 'expertise' },
    { id: -2402, name: "Identifier les démarches, les méthodes ou les aides possibles pour améliorer l'adéquation entre mon profil et les attendus, les prérequis ou les exigences d'une formation, d'un stage ou d'un métier", category: 'expertise' },
    { id: -2403, name: "Discerner si mon profil correspond aux attendus, aux prérequis ou aux exigences d'une formation, d'un stage ou d'un métier qui m'intéresse", category: 'expertise' },
    { id: -2404, name: "Comprendre et interroger le modèle de l'adéquation (par exemple : lien formation-emploi, relation entre niveau d'étude et salaire…)", category: 'expertise' },
    { id: -2405, name: "Identifier les démarches, les méthodes ou les aides les plus adaptées pour améliorer l'adéquation entre mon profil et les attendus, les prérequis ou les exigences d'une formation, d'un stage ou d'un métier qui m'intéresse", category: 'expertise' },
    { id: -2406, name: "Apprendre à mettre en lien qui je suis, ce que je sais faire, ce que je peux faire et ce que je veux faire", category: 'expertise' }
  ],
  level_4: [
    { id: -2501, name: "Expliciter et argumenter clairement mes choix en articulant qui je suis, ce que je sais de moi et mes ambitions", category: 'expertise' },
    { id: -2502, name: "Adapter mon parcours en fonction de l'évolution des liens entre qui je suis, ce que je sais de moi et mes ambitions", category: 'expertise' },
    { id: -2503, name: "Mettre en place et ajuster les démarches nécessaires pour réduire les écarts entre qui je suis, ce que je sais de moi et mes ambitions", category: 'expertise' },
    { id: -2504, name: "Développer un esprit critique et des capacités réflexives sur la vision adéquationniste du lien formation-emploi (par exemple : limites des tests ou quiz, qui formulent des préconisations de formations ou de métiers basées sur le profil de l'élève)", category: 'expertise' },
    { id: -2505, name: "Trouver l'équilibre qui me correspond entre qui je suis, ce que je sais de moi et mes ambitions", category: 'expertise' }
  ]
};

// Competencies for Axe 2 "Compétence 3 – M'autoriser à rêver et à avoir des ambitions" by level (for BadgeInfoModal)
const COMPETENCE_AXE2_3_MAUTORISER_REVER_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -2601, name: "Découvrir les termes « ambition », « projet », « objectif », « rêves » et « autocensure »", category: 'expertise' },
    { id: -2602, name: "Découvrir les liens entre rêves et réalité dans la construction d'un parcours d'orientation", category: 'expertise' }
  ],
  level_2: [
    { id: -2701, name: "Décrire mes rêves de formation, de métier ou même de style de vie", category: 'expertise' },
    { id: -2702, name: "Découvrir différentes façons d'articuler rêves et réalité (par exemple transformer un projet initial de métier en un projet d'activité de loisir)", category: 'expertise' },
    { id: -2703, name: "Énoncer les métiers, les formations, les personnes et les styles de vie qui m'inspirent et me font rêver", category: 'expertise' },
    { id: -2704, name: "Comprendre les effets de l'autocensure sur les parcours d'orientation", category: 'expertise' },
    { id: -2705, name: "Comprendre et identifier les facteurs personnels et environnementaux qui m'amènent à m'autocensurer dans la construction de mon parcours d'orientation (par exemple : découragement, difficultés scolaires, manque de motivation…)", category: 'expertise' }
  ],
  level_3: [
    { id: -2801, name: "Être capable d'expliciter et de faire évoluer mes rêves", category: 'expertise' },
    { id: -2802, name: "Apprendre à décomposer un rêve en étapes à suivre", category: 'expertise' },
    { id: -2803, name: "Identifier ou inventer des stratégies pour faire face et dépasser mes découragements", category: 'expertise' },
    { id: -2804, name: "Identifier ou inventer des stratégies pour surmonter mes difficultés", category: 'expertise' },
    { id: -2805, name: "Identifier les compromis possibles pour articuler mes rêves et mes réalités", category: 'expertise' },
    { id: -2806, name: "Comprendre et identifier les facteurs personnels et environnementaux qui peuvent m'amener à m'autocensurer dans la construction de mon parcours d'orientation", category: 'expertise' }
  ],
  level_4: [
    { id: -2901, name: "Être capable de décrire mes rêves et d'argumenter clairement sur mes ambitions", category: 'expertise' },
    { id: -2902, name: "Transformer mes rêves en ambitions ou en objectifs, en les rendant concrets et réalisables", category: 'expertise' },
    { id: -2903, name: "Savoir ce que j'ai fait et ce que je dois faire pour atteindre mes ambitions (par exemple : améliorer mon dossier scolaire, évaluer les efforts nécessaires à fournir…)", category: 'expertise' },
    { id: -2904, name: "Réinterroger et faire évoluer mes ambitions en fonction de qui je suis, de mon parcours et de la réalité", category: 'expertise' },
    { id: -2905, name: "Prendre du recul sur mes découragements, les obstacles et les difficultés", category: 'expertise' },
    { id: -2906, name: "Être réaliste dans mes choix d'orientation sans me fermer la porte à des ambitions plus grandes", category: 'expertise' }
  ]
};

// Competencies for Axe 2 "Compétence 4 – Savoir me présenter et m'affirmer" by level (for BadgeInfoModal)
const COMPETENCE_AXE2_4_SAVOIR_PRESENTER_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -3001, name: "Découvrir différentes situations pouvant m'amener à me présenter et à parler de moi", category: 'expertise' },
    { id: -3002, name: "Découvrir la notion de vie privée/vie publique", category: 'expertise' },
    { id: -3003, name: "Découvrir les principaux droits et devoirs en lien avec la présentation de soi et la maîtrise de son image (par exemple : questions interdites ou inappropriées durant un entretien, droit à l'image, gestion des données personnelles…)", category: 'expertise' },
    { id: -3004, name: "Découvrir plusieurs entrées possibles pour me présenter (par exemple : identité, loisirs, projet professionnel, centres d'intérêt, résultats scolaires…)", category: 'expertise' },
    { id: -3005, name: "Découvrir les notions d'image de soi, de réputation et d'identité numérique", category: 'expertise' },
    { id: -3006, name: "Découvrir la distinction et les liens entre l'être et le paraître", category: 'expertise' }
  ],
  level_2: [
    { id: -3101, name: "Savoir exprimer mes idées, mes choix et mes opinions", category: 'expertise' },
    { id: -3102, name: "Identifier et comprendre les codes et les attentes spécifiques pour me présenter et parler de moi (par exemple le vocabulaire à utiliser)", category: 'expertise' },
    { id: -3103, name: "Comprendre les principales attentes présentes lors des différentes situations pouvant m'amener à me présenter et à parler de moi, à l'oral et à l'écrit", category: 'expertise' },
    { id: -3104, name: "Identifier les différents canaux de communication servant à me présenter (par exemple : oral, écrit, vidéos, réseaux sociaux…) et leurs spécificités", category: 'expertise' },
    { id: -3105, name: "Comprendre les principaux droits et devoirs en lien avec la présentation de soi et la maîtrise de son image (par exemple : questions interdites ou inappropriées durant un entretien, droit à l'image, gestion des données personnelles…)", category: 'expertise' },
    { id: -3106, name: "Comprendre mes émotions lorsque je dois me présenter (par exemple le sentiment d'anxiété lors d'une prise de parole)", category: 'expertise' }
  ],
  level_3: [
    { id: -3201, name: "Savoir parler de moi et de mon parcours", category: 'expertise' },
    { id: -3202, name: "Comprendre et expliciter les différents codes pour me présenter et parler de moi", category: 'expertise' },
    { id: -3203, name: "Argumenter, débattre sur mes idées, mes choix et mes opinions", category: 'expertise' },
    { id: -3204, name: "Savoir prendre la parole et m'exprimer", category: 'expertise' },
    { id: -3205, name: "Savoir m'informer et actualiser mes connaissances sur les principaux droits et devoirs en lien avec la présentation de soi et la maîtrise de son image (par exemple : questions interdites ou inappropriées durant un entretien, droit à l'image, gestion des données personnelles…)", category: 'expertise' },
    { id: -3206, name: "Savoir réagir aux questions qui peuvent m'être adressées dans des contextes où je dois me présenter", category: 'expertise' },
    { id: -3207, name: "Savoir comment structurer et rédiger des documents écrits visant à me présenter et à parler de moi (par exemple : CV, lettres de motivation, projets motivés, e-mails…)", category: 'expertise' },
    { id: -3208, name: "Savoir utiliser et maîtriser la communication verbale (par exemple avoir un langage adapté à mon interlocuteur) et non verbale (par exemple : émotions, gestes, postures, gestion de l'espace…) lors de démarches impliquant une présentation de moi-même à l'oral (par exemple : oral du brevet, entretiens, échanges téléphoniques…)", category: 'expertise' },
    { id: -3209, name: "Savoir explorer et appliquer les paramètres de gestion de confidentialité des données sur les réseaux sociaux et les applications Web", category: 'expertise' },
    { id: -3210, name: "Savoir ce que je dois, ce que je veux et ce que je peux dévoiler de moi-même en fonction du contexte (par exemple parler de mon handicap ou de mes problèmes de santé)", category: 'expertise' },
    { id: -3211, name: "Savoir trouver le bon équilibre entre authenticité et valorisation de moi, entre être et paraître", category: 'expertise' }
  ],
  level_4: [
    { id: -3301, name: "Savoir parler de moi et de mon parcours de manière structurée, claire et argumentée (par exemple : mes réalisations, mes réussites, mes échecs…)", category: 'expertise' },
    { id: -3302, name: "Prendre en compte les critiques que je reçois et les opinions différentes des miennes, faire preuve de discernement à leur sujet", category: 'expertise' },
    { id: -3303, name: "Gérer et maîtriser mon identité numérique", category: 'expertise' },
    { id: -3304, name: "M'accepter comme je suis et avoir une vision positive de moi-même", category: 'expertise' },
    { id: -3305, name: "Exprimer et argumenter mon accord ou mon refus", category: 'expertise' },
    { id: -3306, name: "Valoriser mon image et mon parcours à l'oral (par exemple : oral du brevet, entretiens, échanges téléphoniques…) et à l'écrit (par exemple : CV, lettres de motivation, projets motivés, e-mails, messages sur les réseaux sociaux…)", category: 'expertise' },
    { id: -3307, name: "Réfléchir à l'image que je renvoie lorsque je me présente et que je parle de moi à l'oral ou à l'écrit", category: 'expertise' },
    { id: -3308, name: "Identifier les points positifs et les points à améliorer dans ma façon de me présenter et de maîtriser mon image", category: 'expertise' },
    { id: -3309, name: "Savoir appliquer et actualiser les principaux droits et devoirs en lien avec la présentation de soi et la maîtrise de son image (par exemple : questions interdites ou inappropriées durant un entretien, droit à l'image, gestion des données personnelles…)", category: 'expertise' },
    { id: -3310, name: "Anticiper les attentes et choisir les postures les plus adaptées en fonction des interlocuteurs et des contextes (par exemple tenue vestimentaire pour un entretien)", category: 'expertise' }
  ]
};

// Competencies for Axe 2 "Compétence 5 – Identifier ce que j'ai appris et ce que je sais faire" by level (for BadgeInfoModal)
const COMPETENCE_AXE2_5_IDENTIFIER_APPRIS_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -3401, name: "Découvrir la notion d'expériences et son application à différentes sphères de vie, comme les activités sportives ou culturelles, les engagements associatifs ou bénévoles, les voyages, les stages, les expériences d'apprentissage ou toute autre expérience réalisée dans un cadre personnel, scolaire ou professionnel", category: 'expertise' },
    { id: -3402, name: "Découvrir la notion de compétences et les termes associés, comme la décomposition en « savoirs » (connaissances), « savoir-faire » (aptitudes), « savoir-être » (attitudes), les Référentiels des compétences, les approches par compétences dans les situations d'apprentissage, ainsi que les aspects dynamiques, évolutifs, contextuels et transférables d'une compétence", category: 'expertise' },
    { id: -3403, name: "Découvrir les liens entre expériences et compétences", category: 'expertise' }
  ],
  level_2: [
    { id: -3501, name: "Situer la notion de compétences par rapport à des apprentissages, des disciplines scolaires, des activités extrascolaires, des diplômes, des formations, des métiers et des activités professionnelles", category: 'expertise' },
    { id: -3502, name: "Décrire une compétence en utilisant des verbes d'action adaptés", category: 'expertise' },
    { id: -3503, name: "Analyser une expérience dans son contexte et identifier les compétences mobilisées et développées", category: 'expertise' },
    { id: -3504, name: "Analyser une expérience dans son contexte, au-delà des compétences (par exemple : motivations, émotions ressenties…)", category: 'expertise' },
    { id: -3505, name: "Comprendre et identifier différentes possibilités d'acquérir ou de renforcer une compétence", category: 'expertise' },
    { id: -3506, name: "Comprendre et identifier différentes méthodes permettant d'explorer et de mettre à l'épreuve des compétences", category: 'expertise' },
    { id: -3507, name: "Comprendre comment transposer une compétence acquise d'un contexte à l'autre et cerner les enjeux et les limites de la transférabilité des compétences", category: 'expertise' },
    { id: -3508, name: "Identifier et extraire les compétences dans des supports d'information (par exemple des compétences transversales dans le socle commun)", category: 'expertise' },
    { id: -3509, name: "Identifier des outils et des méthodes permettant de documenter et de conserver une trace des expériences et des compétences", category: 'expertise' }
  ],
  level_3: [
    { id: -3601, name: "Analyser mes expériences dans leur contexte, identifier les compétences mobilisées et développées et les compétences non mobilisées et non développées", category: 'expertise' },
    { id: -3602, name: "Identifier mes freins ou mes difficultés à l'acquisition d'une compétence (par exemple le besoin d'entraînement supplémentaire)", category: 'expertise' },
    { id: -3603, name: "M'interroger sur mes motivations à m'engager dans certaines expériences", category: 'expertise' },
    { id: -3604, name: "Décrire mes propres compétences en utilisant des verbes d'action adaptés", category: 'expertise' },
    { id: -3605, name: "Rassembler et organiser mes compétences acquises ou mobilisées dans mon parcours", category: 'expertise' },
    { id: -3606, name: "Faire le lien entre plusieurs expériences de mon parcours ayant permis de mobiliser une même compétence", category: 'expertise' },
    { id: -3607, name: "Identifier différentes possibilités d'acquérir ou de renforcer une compétence nécessaire à mon parcours", category: 'expertise' },
    { id: -3608, name: "Utiliser des outils et des méthodes permettant de documenter et de conserver une trace de mes expériences et de mes compétences", category: 'expertise' },
    { id: -3609, name: "Utiliser différentes méthodes permettant d'identifier mes compétences", category: 'expertise' }
  ],
  level_4: [
    { id: -3701, name: "Expliciter mes compétences et les contextes dans lesquels elles ont été acquises", category: 'expertise' },
    { id: -3702, name: "Expliciter mes progressions dans une compétence au cours du temps", category: 'expertise' },
    { id: -3703, name: "Combiner différentes méthodes permettant d'identifier mes compétences", category: 'expertise' },
    { id: -3704, name: "Savoir échanger avec les autres (par exemple les pairs, les parents) sur mes expériences vécues et mes compétences acquises ou mobilisées", category: 'expertise' },
    { id: -3705, name: "Trouver/créer du lien entre les compétences acquises ou mobilisées dans mon parcours (par exemple : qu'est-ce que cela me permettrait de faire plus tard ?)", category: 'expertise' },
    { id: -3706, name: "Comprendre comment transposer mes compétences acquises d'un contexte à l'autre", category: 'expertise' },
    { id: -3707, name: "Remobiliser de manière adaptée mes compétences acquises d'un contexte à l'autre", category: 'expertise' },
    { id: -3708, name: "Expliciter le sens donné aux expériences et aux situations d'apprentissage vécues dans mon parcours", category: 'expertise' },
    { id: -3709, name: "M'engager dans une démarche adaptée permettant d'acquérir ou de renforcer mes compétences nécessaires à mon parcours", category: 'expertise' },
    { id: -3710, name: "Savoir constituer un portfolio des expériences et des compétences", category: 'expertise' },
    { id: -3711, name: "Identifier si ma maîtrise d'une compétence est suffisante ou s'il est nécessaire de me perfectionner par rapport à mes objectifs", category: 'expertise' },
    { id: -3712, name: "Développer un regard éclairé sur l'évaluation des compétences", category: 'expertise' }
  ]
};

// Competencies for Axe 3 "Compétence 1 – Accepter les imprévus et saisir les occasions" by level (for BadgeInfoModal)
const COMPETENCE_AXE3_1_ACCEPTER_IMPREVUS_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -3801, name: "Découvrir le caractère imprévisible et évolutif des parcours d'orientation", category: 'expertise' },
    { id: -3802, name: "Découvrir les notions d'imprévu, d'opportunité et d'alternative et découvrir leurs implications positives et négatives", category: 'expertise' },
    { id: -3803, name: "Découvrir des notions comme l'adaptation, la prise de risque, la découverte et la sérendipité, appliquées à la construction d'un parcours d'orientation", category: 'expertise' }
  ],
  level_2: [
    { id: -3901, name: "Comprendre et identifier les différents types d'imprévus qui peuvent survenir dans un parcours d'orientation (par exemple : échec à un examen, fermeture soudaine de la formation souhaitée, déménagement, rencontre avec d'anciens élèves, réalisation d'un stage…)", category: 'expertise' },
    { id: -3902, name: "Comprendre, déconstruire et m'approprier les notions de linéarité et de non-linéarité des parcours", category: 'expertise' },
    { id: -3903, name: "Comprendre et identifier les possibilités d'anticiper, gérer ou réduire les imprévus", category: 'expertise' },
    { id: -3904, name: "Analyser un parcours d'orientation en appliquant plusieurs notions (par exemple : imprévu, opportunité, alternative, adaptation, prise de risque, découverte, sérendipité…)", category: 'expertise' },
    { id: -3905, name: "Comprendre et identifier les possibilités de réagir face à l'incertitude et aux événements imprévus (par exemple donner leur place aux émotions)", category: 'expertise' },
    { id: -3906, name: "Comprendre et identifier des stratégies possibles pour créer des opportunités (par exemple : efforts à fournir, aides possibles, rencontres…)", category: 'expertise' }
  ],
  level_3: [
    { id: -4001, name: "Comprendre, identifier et élaborer des stratégies possibles pour me créer des opportunités dans mon environnement (par exemple : visiter une entreprise, participer à un concours, à un événement…)", category: 'expertise' },
    { id: -4002, name: "M'interroger sur mon parcours et y situer les notions d'imprévu, d'opportunité, d'alternative, de résilience, de prise de risque, de découverte, de sérendipité et de créativité", category: 'expertise' },
    { id: -4003, name: "Comprendre les possibilités de transformer des expériences en opportunités à saisir (par exemple, un ou une élève qui obtient un contrat d'apprentissage à la suite d'une discussion avec un professionnel/une professionnelle durant un salon d'orientation)", category: 'expertise' },
    { id: -4004, name: "Comprendre et explorer les implications positives et négatives d'une opportunité ou d'un imprévu dans mon parcours d'orientation (par exemple l'échec à un examen)", category: 'expertise' },
    { id: -4005, name: "Apprendre à gérer ma façon de réagir et d'agir face à l'incertitude et aux événements imprévus qui peuvent survenir dans mon parcours d'orientation", category: 'expertise' }
  ],
  level_4: [
    { id: -4101, name: "Prévoir des alternatives possibles (un plan B) si mon parcours ou mes démarches d'orientation ne se déroulent pas comme prévu (par exemple si je ne trouve pas le stage que je souhaite)", category: 'expertise' },
    { id: -4102, name: "Adapter mon parcours en fonction des imprévus ou des opportunités qui se présentent", category: 'expertise' },
    { id: -4103, name: "Peser le pour et le contre avant de faire un choix face à une opportunité ou à un imprévu", category: 'expertise' },
    { id: -4104, name: "Adopter une attitude curieuse et ouverte face aux imprévus et aux occasions", category: 'expertise' },
    { id: -4105, name: "Prendre du recul face aux alternatives possibles pour faire un choix éclairé dans la construction de mon parcours", category: 'expertise' },
    { id: -4106, name: "Identifier, élaborer et mettre en place des stratégies pour me créer des opportunités (par exemple valoriser mes productions artistiques sur les réseaux sociaux pour montrer mes savoir-faire)", category: 'expertise' },
    { id: -4107, name: "Apprendre et agir pour transformer des expériences en opportunités à saisir (par exemple un ou une élève qui obtient un contrat d'apprentissage à la suite d'une discussion avec un professionnel/une professionnelle durant un salon d'orientation)", category: 'expertise' },
    { id: -4108, name: "Apprendre à tirer profit des imprévus pour réfléchir sur moi et/ou sur mon parcours", category: 'expertise' },
    { id: -4109, name: "Savoir expliciter le cheminement de mon parcours et savoir donner du sens aux imprévus et aux opportunités", category: 'expertise' }
  ]
};

// Competencies for Axe 3 "Compétence 2 – M'ouvrir au monde et aux autres" by level (for BadgeInfoModal)
const COMPETENCE_AXE3_2_MOUVRIR_MONDE_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -4201, name: "Découvrir les notions pour décrire mon environnement proche et les sphères qui le composent (par exemple : sphère familiale, sphère scolaire, commerces de proximité…)", category: 'expertise' },
    { id: -4202, name: "Découvrir ce que mon environnement peut m'apporter", category: 'expertise' },
    { id: -4203, name: "Découvrir ce que je peux apporter au monde et aux autres", category: 'expertise' },
    { id: -4204, name: "Découvrir les moyens de communication pour m'ouvrir au monde", category: 'expertise' },
    { id: -4205, name: "Découvrir la notion de réseau et les différentes formes que peut prendre un réseau", category: 'expertise' }
  ],
  level_2: [
    { id: -4301, name: "Comprendre les relations dynamiques entre les différentes sphères composant mon environnement proche (par exemple les réunions parents-professeurs)", category: 'expertise' },
    { id: -4302, name: "Comprendre les codes pour communiquer (par exemple les marques de politesse dans un courriel)", category: 'expertise' },
    { id: -4303, name: "Identifier les différentes possibilités de m'ouvrir au monde et de m'engager (par exemple : rôle de délégué de classe, lecture de l'actualité…)", category: 'expertise' },
    { id: -4304, name: "Comprendre les liens qui existent entre les personnes (par exemple : « le phénomène du petit monde »)", category: 'expertise' },
    { id: -4305, name: "Identifier les différentes possibilités de recourir à un réseau dans la construction d'un parcours d'orientation", category: 'expertise' }
  ],
  level_3: [
    { id: -4401, name: "M'exprimer/interagir avec aisance à l'oral et à l'écrit (par exemple lors de la rédaction d'un courriel)", category: 'expertise' },
    { id: -4402, name: "Identifier les différents codes en fonction de la situation (par exemple la sphère professionnelle)", category: 'expertise' },
    { id: -4403, name: "Expérimenter et utiliser des modes différents de communication", category: 'expertise' },
    { id: -4404, name: "Identifier les relations entre les personnes de mes réseaux (« qui connaît qui ? »)", category: 'expertise' },
    { id: -4405, name: "Comprendre les implications, les avantages et les inconvénients des réseaux (par exemple : être disponible si une personne de mon réseau me sollicite, la réputation des membres de mon réseau, l'image de soi…)", category: 'expertise' },
    { id: -4406, name: "M'engager dans des activités me permettant de m'ouvrir au monde (par exemple m'engager dans un club au collège)", category: 'expertise' }
  ],
  level_4: [
    { id: -4501, name: "Comprendre le sens de mes engagements dans mon établissement scolaire et en dehors", category: 'expertise' },
    { id: -4502, name: "Savoir expliquer mes engagements dans mon établissement scolaire et en dehors", category: 'expertise' },
    { id: -4503, name: "Adapter ma façon de communiquer en fonction des interlocuteurs et/ou du contexte (par exemple échanges avec les intervenants extérieurs qui viennent en classe)", category: 'expertise' },
    { id: -4504, name: "Savoir m'interroger sur mes postures et ma manière de communiquer", category: 'expertise' },
    { id: -4505, name: "Faire preuve de discernement dans mes relations aux autres", category: 'expertise' },
    { id: -4506, name: "Être capable de solliciter des personnes de mon réseau lorsque j'en ai besoin pour construire mon parcours d'orientation (par exemple pour trouver un stage)", category: 'expertise' }
  ]
};

// Competencies for Axe 3 "Compétence 3 – Me préparer aux transitions et aux changements" by level (for BadgeInfoModal)
const COMPETENCE_AXE3_3_ME_PREPARER_TRANSITIONS_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -4601, name: "Découvrir les notions de transition et de changement", category: 'expertise' },
    { id: -4602, name: "Découvrir les principales transitions dans un parcours scolaire, personnel et professionnel (par exemple : passage du collège au lycée, étapes de vie, évolutions professionnelles…)", category: 'expertise' }
  ],
  level_2: [
    { id: -4701, name: "Comprendre et analyser une transition dans sa temporalité : avant, pendant, après", category: 'expertise' },
    { id: -4702, name: "Apprendre à reconnaître les manifestations d'une expérience de changement (par exemple variations dans les émotions) et les réactions qui en découlent (par exemple : gestion des émotions, aller vers les autres, demander du soutien…)", category: 'expertise' },
    { id: -4703, name: "Comprendre et reconnaître les différents types de transition (par exemple un déménagement soudain peut être considéré comme une transition non anticipée)", category: 'expertise' },
    { id: -4704, name: "Identifier les conséquences possibles d'un changement", category: 'expertise' }
  ],
  level_3: [
    { id: -4801, name: "Identifier les transitions qui ont marqué mon parcours de vie (par exemple le passage de l'école primaire au collège)", category: 'expertise' },
    { id: -4802, name: "Analyser mes transitions passées (par exemple : contexte, ressources, réactions, temporalité…)", category: 'expertise' },
    { id: -4803, name: "Appréhender le caractère transversal de mes réactions et de mes actions dans mes expériences de transition (par exemple le passage de l'école primaire au collège et le passage du collège au lycée présentent des similarités)", category: 'expertise' },
    { id: -4804, name: "Savoir comment solliciter des ressources durant mes transitions (par exemple demander le soutien de mes parents)", category: 'expertise' }
  ],
  level_4: [
    { id: -4901, name: "M'adapter et agir face aux changements prévus et imprévus", category: 'expertise' },
    { id: -4902, name: "Savoir anticiper les conséquences d'une transition (par exemple : mobilité, attentes, règles, habitudes…)", category: 'expertise' },
    { id: -4903, name: "M'autoévaluer au cours d'une transition", category: 'expertise' },
    { id: -4904, name: "Choisir et ajuster ma manière d'agir pour envisager sereinement une transition", category: 'expertise' },
    { id: -4905, name: "Anticiper d'éventuels imprévus et obstacles dans une transition à venir", category: 'expertise' },
    { id: -4906, name: "M'adapter, savoir réagir et savoir mobiliser de manière proactive des ressources durant une transition (par exemple : aide, motivation, gestion du stress…)", category: 'expertise' },
    { id: -4907, name: "Apprendre de mes transitions passées pour progresser et anticiper les prochaines, et savoir m'y référer (par exemple : les garder en mémoire, en conserver une trace…)", category: 'expertise' },
    { id: -4908, name: "Savoir solliciter des personnes et accepter de recevoir de l'aide durant mes transitions", category: 'expertise' }
  ]
};

// Competencies for Axe 3 "Compétence 4 – Me projeter et comprendre les conséquences de mes choix" by level (for BadgeInfoModal)
const COMPETENCE_AXE3_4_ME_PROJETER_EXPERTISES: Record<string, BadgeSkillAPI[]> = {
  level_1: [
    { id: -5001, name: "Découvrir les notions de parcours et d'orientation tout au long de la vie", category: 'expertise' },
    { id: -5002, name: "Découvrir les différentes étapes permettant de prendre une décision (par exemple : collecter les informations, comparer les options…)", category: 'expertise' }
  ],
  level_2: [
    { id: -5101, name: "Situer la notion de projet dans un parcours d'orientation", category: 'expertise' },
    { id: -5102, name: "Situer un choix par rapport à différents paramètres : implications à court, moyen ou long terme", category: 'expertise' },
    { id: -5103, name: "Identifier les injonctions associées à l'orientation (par exemple injonction au projet)", category: 'expertise' },
    { id: -5104, name: "Comprendre et identifier les différentes étapes permettant de prendre une décision en lien avec les choix d'orientation", category: 'expertise' },
    { id: -5105, name: "Comprendre et identifier les possibilités d'action à chaque étape d'une prise de décision en lien avec les choix d'orientation", category: 'expertise' }
  ],
  level_3: [
    { id: -5201, name: "Apprendre à me projeter dans des cadres d'apprentissage, d'études, professionnel et dans un style de vie", category: 'expertise' },
    { id: -5202, name: "Identifier et planifier les étapes me permettant de prendre une décision et de construire mon parcours", category: 'expertise' },
    { id: -5203, name: "Comprendre et analyser ma façon de procéder pour prendre une décision (par exemple la place des émotions)", category: 'expertise' },
    { id: -5204, name: "Comprendre, analyser et m'approprier les enjeux lorsque je dois faire un choix d'orientation (par exemple : rôle des parents, temporalité, possibilités d'action…)", category: 'expertise' },
    { id: -5205, name: "Identifier et réfléchir sur les compromis à faire ou sur mes priorités", category: 'expertise' },
    { id: -5206, name: "Réfléchir à la place que je veux donner à mes études dans mon parcours de vie", category: 'expertise' },
    { id: -5207, name: "Réfléchir à la place que je veux donner au travail dans mon parcours de vie", category: 'expertise' }
  ],
  level_4: [
    { id: -5301, name: "Composer avec les influences qui agissent sur mes choix d'orientation (par exemple la pression des parents)", category: 'expertise' },
    { id: -5302, name: "Actualiser et planifier les différentes étapes de mon parcours d'orientation", category: 'expertise' },
    { id: -5303, name: "Définir, ajuster et anticiper les principales étapes de mon parcours d'orientation", category: 'expertise' },
    { id: -5304, name: "Savoir argumenter et donner du sens à mes choix et à mes études (« Pourquoi je veux faire cela. »)", category: 'expertise' },
    { id: -5305, name: "Savoir argumenter sur mes choix auprès des adultes (par exemple : parents, équipe éducative…)", category: 'expertise' },
    { id: -5306, name: "Organiser et concilier mes priorités", category: 'expertise' },
    { id: -5307, name: "Adapter ma façon de procéder pour prendre une décision en fonction de la situation rencontrée (par exemple : gestion des émotions, recherche de soutien…)", category: 'expertise' },
    { id: -5308, name: "Prendre des décisions éclairées sur mes choix, en tenant compte de leurs implications sur mon parcours d'orientation", category: 'expertise' },
    { id: -5309, name: "Prendre conscience et accepter les conséquences de mes choix immédiats sur la suite de mon parcours (par exemple choisir une langue vivante)", category: 'expertise' },
    { id: -5310, name: "Actualiser mes projections dans un cadre d'apprentissage, de formation, professionnel et dans un style de vie", category: 'expertise' }
  ]
};

const COMPETENCE_1_NAME = "Compétence 1 – Chercher et trier l'information";
const COMPETENCE_2_NAME = "Compétence 2 – Connaitre les personnes, lieux, ressources qui peuvent m'aider";
const COMPETENCE_3_NAME = "Compétence 3 – Apprendre à découvrir les parcours de formation";
const COMPETENCE_4_NAME = "Compétence 4 – Apprendre à découvrir les métiers et le monde du travail";
const COMPETENCE_5_NAME = "Compétence 5 – M'interroger sur les clichés";
const COMPETENCE_AXE2_1_NAME = "Compétence 1 – Apprendre à me connaitre";
const COMPETENCE_AXE2_2_NAME = "Compétence 2 – Définir mes projets en fonction de qui je suis";
const COMPETENCE_AXE2_3_NAME = "Compétence 3 – M'autoriser à rêver et à avoir des ambitions";
const COMPETENCE_AXE2_4_NAME = "Compétence 4 – Savoir me présenter et m'affirmer";
const COMPETENCE_AXE2_5_NAME = "Compétence 5 – Identifier ce que j'ai appris et ce que je sais faire";
const COMPETENCE_AXE3_1_NAME = "Compétence 1 – Accepter les imprévus et saisir les occasions";
const COMPETENCE_AXE3_2_NAME = "Compétence 2 – M'ouvrir au monde et aux autres";
const COMPETENCE_AXE3_3_NAME = "Compétence 3 – Me préparer aux transitions et aux changements";
const COMPETENCE_AXE3_4_NAME = "Compétence 4 – Me projeter et comprendre les conséquences de mes choix";

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
      } else if (name === COMPETENCE_AXE2_1_NAME && COMPETENCE_AXE2_1_APPRENDRE_ME_CONNAITRE_EXPERTISES[level]) {
        expertises = COMPETENCE_AXE2_1_APPRENDRE_ME_CONNAITRE_EXPERTISES[level];
      } else if (name === COMPETENCE_AXE2_2_NAME && COMPETENCE_AXE2_2_DEFINIR_PROJETS_EXPERTISES[level]) {
        expertises = COMPETENCE_AXE2_2_DEFINIR_PROJETS_EXPERTISES[level];
      } else if (name === COMPETENCE_AXE2_3_NAME && COMPETENCE_AXE2_3_MAUTORISER_REVER_EXPERTISES[level]) {
        expertises = COMPETENCE_AXE2_3_MAUTORISER_REVER_EXPERTISES[level];
      } else if (name === COMPETENCE_AXE2_4_NAME && COMPETENCE_AXE2_4_SAVOIR_PRESENTER_EXPERTISES[level]) {
        expertises = COMPETENCE_AXE2_4_SAVOIR_PRESENTER_EXPERTISES[level];
      } else if (name === COMPETENCE_AXE2_5_NAME && COMPETENCE_AXE2_5_IDENTIFIER_APPRIS_EXPERTISES[level]) {
        expertises = COMPETENCE_AXE2_5_IDENTIFIER_APPRIS_EXPERTISES[level];
      } else if (name === COMPETENCE_AXE3_1_NAME && COMPETENCE_AXE3_1_ACCEPTER_IMPREVUS_EXPERTISES[level]) {
        expertises = COMPETENCE_AXE3_1_ACCEPTER_IMPREVUS_EXPERTISES[level];
      } else if (name === COMPETENCE_AXE3_2_NAME && COMPETENCE_AXE3_2_MOUVRIR_MONDE_EXPERTISES[level]) {
        expertises = COMPETENCE_AXE3_2_MOUVRIR_MONDE_EXPERTISES[level];
      } else if (name === COMPETENCE_AXE3_3_NAME && COMPETENCE_AXE3_3_ME_PREPARER_TRANSITIONS_EXPERTISES[level]) {
        expertises = COMPETENCE_AXE3_3_ME_PREPARER_TRANSITIONS_EXPERTISES[level];
      } else if (name === COMPETENCE_AXE3_4_NAME && COMPETENCE_AXE3_4_ME_PROJETER_EXPERTISES[level]) {
        expertises = COMPETENCE_AXE3_4_ME_PROJETER_EXPERTISES[level];
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

// Axe 1 section for badge list view
const STATIC_COMPETENCES_ORIENTER_AXE1_TITLE = "Axe 1 – CONNAITRE ET SAVOIR S'INFORMER SUR LE MONDE : Découverte des environnements scolaires, professionnels, économiques et sociaux";

// Axe 2 section for badge list view
const STATIC_COMPETENCES_ORIENTER_AXE2_TITLE = "Axe 2 – SE DÉCOUVRIR ET S'AFFIRMER : identification de soi, de ses intérêts, de ses compétences, de ses valeurs";

// Axe 3 section for badge list view
const STATIC_COMPETENCES_ORIENTER_AXE3_TITLE = "Axe 3 – SE CONSTRUIRE ET SE PROJETER DANS UN MONDE EN MOUVEMENT";

function getStaticBadgesByAxis(): { title: string; groups: { name: string; description: string; levels: BadgeAPI[] }[] }[] {
  const allBadges = buildStaticBadgesCompetencesOrienterCollege();
  const axe1Groups: { name: string; description: string; levels: BadgeAPI[] }[] = [];
  const axe2Groups: { name: string; description: string; levels: BadgeAPI[] }[] = [];
  const axe3Groups: { name: string; description: string; levels: BadgeAPI[] }[] = [];
  STATIC_COMPETENCES_ORIENTER_BADGES.forEach(({ name, axe }) => {
    const levelBadges = allBadges.filter((b) => b.name === name).sort(
      (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
    );
    const group = { name, description: '', levels: levelBadges };
    if (axe === 2) {
      axe2Groups.push(group);
    } else if (axe === 3) {
      axe3Groups.push(group);
    } else {
      axe1Groups.push(group);
    }
  });
  return [
    { title: STATIC_COMPETENCES_ORIENTER_AXE1_TITLE, groups: axe1Groups },
    { title: STATIC_COMPETENCES_ORIENTER_AXE2_TITLE, groups: axe2Groups },
    { title: STATIC_COMPETENCES_ORIENTER_AXE3_TITLE, groups: axe3Groups }
  ];
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
  // Collapsible axes (Compétences à s'orienter - Collège): which axis indices are expanded
  const [expandedAxes, setExpandedAxes] = useState<Set<number>>(() => new Set([0, 1, 2]));

  const toggleAxis = (idx: number) => {
    setExpandedAxes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

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
            {contentAxes.map((axis, idx) => {
              const isExpanded = expandedAxes.has(idx);
              const contentId = `badge-explorer-axis-content-${idx}`;
              return (
                <section key={idx} className="badge-explorer-axis-section">
                  <button
                    type="button"
                    className="badge-explorer-axis-header"
                    onClick={() => toggleAxis(idx)}
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                  >
                    <span className="badge-explorer-axis-title">{axis.title}</span>
                    <span className="badge-explorer-axis-count">
                      {axis.groups.length} compétence{axis.groups.length !== 1 ? 's' : ''}
                    </span>
                    <i
                      className={`fas ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`}
                      aria-hidden
                    />
                  </button>
                  <div
                    id={contentId}
                    className={`badge-explorer-axis-content ${isExpanded ? '' : 'collapsed'}`}
                    aria-hidden={!isExpanded}
                  >
                    {axis.groups.map((group) => renderBadgeRow(group))}
                  </div>
                </section>
              );
            })}
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
