import React, { useState, useEffect } from 'react';
import { BadgeAttribution } from '../../types';
import { useAppContext } from '../../context/AppContext';
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
}

interface Badge {
  title: string;
  image: string;
}

interface BadgeSeries {
  name: string;
  description: string;
  badges: {
    [level: string]: Badge[];
  };
}

interface BadgeData {
  [key: string]: BadgeSeries;
}

const BadgeAssignmentModal: React.FC<BadgeAssignmentModalProps> = ({ 
  onClose, 
  onAssign, 
  participants, 
  preselectedParticipant,
  projectId,
  projectTitle 
}) => {
  const { state, addBadgeAttribution } = useAppContext();
  const { showWarning: showWarningToast, showError: showErrorToast } = useToast();
  const [series, setSeries] = useState('');
  const [level, setLevel] = useState('');
  const [domain, setDomain] = useState('');
  const [title, setTitle] = useState('');
  const [participant, setParticipant] = useState(preselectedParticipant || '');
  const [domaine, setDomaine] = useState('');
  const [savoirFaire, setSavoirFaire] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    badgeTitle: string;
    badgeImage: string;
  } | null>(null);

  // Update participant when preselectedParticipant changes
  useEffect(() => {
    if (preselectedParticipant) {
      setParticipant(preselectedParticipant);
    }
  }, [preselectedParticipant]);

  // Badge data from HTML dashboard
  const badgeData: BadgeData = {
    universelle: {
      name: "Série TouKouLeur",
      description: "Compétences psychosociales fondamentales organisées par niveaux de progression",
      badges: {
        "1": [
          { title: "Adaptabilité", image: "/NIV 1/Adaptabilite@2x.png" },
          { title: "Communication", image: "/NIV 1/Communication@2x.png" },
          { title: "Coopération", image: "/NIV 1/Cooperation@2x.png" },
          { title: "Créativité", image: "/NIV 1/Creativite@2x.png" },
          { title: "Engagement", image: "/NIV 1/Engagement@2x.png" },
          { title: "Esprit Critique", image: "/NIV 1/EspritCritique@2x.png" },
          { title: "Formation", image: "/NIV 1/Formation@2x.png" },
          { title: "Gestion de Projet", image: "/NIV 1/GestionDePvrojet@2x.png" },
          { title: "Information Numérique", image: "/NIV 1/Inform Numerique@2x.png" },
          { title: "Organisation Opérationnelle", image: "/NIV 1/OrganisationOpe@2x.png" },
          { title: "Sociabilité", image: "/NIV 1/Sociabilite@2x.png" }
        ],
        "2": [
          { title: "Adaptabilité", image: "/NIV 2 Kinship/Adaptabilite-8.png" },
          { title: "Communication", image: "/NIV 2 Kinship/Communication-8.png" },
          { title: "Coopération", image: "/NIV 2 Kinship/Cooperation-8.png" },
          { title: "Créativité", image: "/NIV 2 Kinship/Creativite-8.png" },
          { title: "Engagement", image: "/NIV 2 Kinship/Engagement.png" },
          { title: "Esprit Critique", image: "/NIV 2 Kinship/EspritCritique-8.png" },
          { title: "Formation", image: "/NIV 2 Kinship/Formation-8.png" },
          { title: "Gestion de Projet", image: "/NIV 2 Kinship/GestionDePvrojet-8.png" },
          { title: "Information Numérique", image: "/NIV 2 Kinship/Inform Numerique-8.png" },
          { title: "Organisation Opérationnelle", image: "/NIV 2 Kinship/OrganisationOpe-8.png" },
          { title: "Sociabilité", image: "/NIV 2 Kinship/Sociabilite-8.png" }
        ],
        "3": [
          { title: "Adaptabilité", image: "/Niveau 3 Kinship/Adaptabilite-8.png" },
          { title: "Communication", image: "/Niveau 3 Kinship/Communication-8.png" },
          { title: "Coopération", image: "/Niveau 3 Kinship/Cooperation-8.png" },
          { title: "Créativité", image: "/Niveau 3 Kinship/Creativite-8.png" },
          { title: "Engagement", image: "/Niveau 3 Kinship/Engagement-8.png" },
          { title: "Esprit Critique", image: "/Niveau 3 Kinship/EspritCritique-8.png" },
          { title: "Formation", image: "/Niveau 3 Kinship/Formation-8.png" },
          { title: "Gestion de Projet", image: "/Niveau 3 Kinship/GestionDeProjet-8.png" },
          { title: "Information Numérique", image: "/Niveau 3 Kinship/Inform Numerique-8.png" },
          { title: "Organisation Opérationnelle", image: "/Niveau 3 Kinship/OrganisationOpe-8.png" },
          { title: "Sociabilité", image: "/Niveau 3 Kinship/Sociabilite-8.png" }
        ],
        "4": [
          { title: "Adaptabilité", image: "/Niv 4/Adaptabilite@2x.png" },
          { title: "Communication", image: "/Niv 4/Communication@2x.png" },
          { title: "Coopération", image: "/Niv 4/Cooperation@2x.png" },
          { title: "Créativité", image: "/Niv 4/Creativite@2x.png" },
          { title: "Engagement", image: "/Niv 4/Engagement@2x.png" },
          { title: "Esprit Critique", image: "/Niv 4/EspritCritique@2x.png" },
          { title: "Formation", image: "/Niv 4/Formation@2x.png" },
          { title: "Gestion de Projet", image: "/Niv 4/GestionDePvrojet@2x.png" },
          { title: "Information Numérique", image: "/Niv 4/Inform Numerique@2x.png" },
          { title: "Organisation Opérationnelle", image: "/Niv 4/OrganisationOpe@2x.png" },
          { title: "Sociabilité", image: "/Niv 4/Sociabilite@2x.png" }
        ]
      }
    },
    psychosociale: {
      name: "Série CPS",
      description: "Compétences psychosociales spécialisées",
      badges: {
        "1": [
          { title: "Avoir conscience de soi", image: "/badges_psychosociales/Cognitives.jpg" },
          { title: "Capacité de maîtrise de soi", image: "/badges_psychosociales/Cognitives.jpg" },
          { title: "Prendre des décisions constructives", image: "/badges_psychosociales/Cognitives.jpg" },
          { title: "Gérer son stress", image: "/badges_psychosociales/Emotionnelles_final.png" },
          { title: "Réguler ses émotions", image: "/badges_psychosociales/Emotionnelles_final.png" },
          { title: "Avoir conscience de ses émotions et de son stress", image: "/badges_psychosociales/Emotionnelles_final.png" },
          { title: "Communiquer de façon constructive", image: "/badges_psychosociales/Sociales_final.png" },
          { title: "Développer des relations constructives", image: "/badges_psychosociales/Sociales_final.png" },
          { title: "Résoudre des difficultés", image: "/badges_psychosociales/Sociales_final.png" }
        ]
      }
    },
    audiovisuelle: {
      name: "Série Audiovisuelle",
      description: "Compétences en création audiovisuelle",
      badges: {
        "1": [
          { title: "Jeu d'Acteur", image: "/NIV 1/Creativite@2x.png" },
          { title: "Prise d'Image", image: "/NIV 1/Communication@2x.png" },
          { title: "Prise de Son", image: "/NIV 1/Formation@2x.png" },
          { title: "Organisation Logistique", image: "/NIV 1/OrganisationOpe@2x.png" }
        ],
        "2": [
          { title: "Technique Vocale", image: "/NIV 2 Kinship/Creativite-8.png" },
          { title: "Mise en Scène", image: "/NIV 2 Kinship/Communication-8.png" },
          { title: "Post-Production Son", image: "/NIV 2 Kinship/Formation-8.png" },
          { title: "Production Audiovisuelle", image: "/NIV 2 Kinship/OrganisationOpe-8.png" }
        ],
        "3": [
          { title: "Expertise Théâtrale", image: "/Niveau 3 Kinship/Creativite-8.png" },
          { title: "Réalisation Avancée", image: "/Niveau 3 Kinship/Communication-8.png" },
          { title: "Ingénierie Sonore", image: "/Niveau 3 Kinship/Formation-8.png" },
          { title: "Gestion de Production", image: "/Niveau 3 Kinship/OrganisationOpe-8.png" }
        ],
        "4": [
          { title: "Maîtrise Artistique", image: "/Niv 4/Creativite@2x.png" },
          { title: "Réalisation Professionnelle", image: "/Niv 4/Communication@2x.png" },
          { title: "Production Sonore", image: "/Niv 4/Formation@2x.png" },
          { title: "Direction de Production", image: "/Niv 4/OrganisationOpe@2x.png" }
        ]
      }
    }
  };

  // TouKouLeur descriptions
  const touKouLeurDescriptions: { [key: string]: string } = {
    "Adaptabilité": "capacité à prendre en compte les contraintes, les aléas et les opportunités contextuels dans la poursuite d'un objectif.",
    "Communication": "capacité à maîtriser les langages pour partager ses réalisations et s'exprimer dans différents contextes",
    "Engagement": "capacité à s'impliquer durablement dans la réalisation d'un projet d'intérêt général",
    "Esprit Critique": "capacité à interroger une situation, une idée, une information",
    "Gestion de Projet": "capacité à transformer une idée en action réalisée",
    "Formation": "capacité à s'impliquer dans une dynamique d'apprentissage continue individuellement et collectivement",
    "Coopération": "capacité à agir avec les autres dans le cadre d'une réalisation collective",
    "Sociabilité": "capacité à établir une relation à l'autre et à évoluer au sein d'un groupe social",
    "Organisation Opérationnelle": "capacité à mobiliser et à utiliser des ressources concrètes afin de produire un résultat",
    "Information Numérique": "utilise les outils informatiques et numériques",
    "Créativité": "capacité à proposer de nouvelles solutions, de nouvelles visions pertinentes des choses"
  };

  // CPS descriptions
  const cpsDescriptions: { [key: string]: string } = {
    "Avoir conscience de soi": "connaissance de ses forces, limites et valeurs",
    "Capacité de maîtrise de soi": "analyse et évaluation des informations",
    "Prendre des décisions constructives": "résolution de problèmes et choix responsables",
    "Gérer son stress": "gestion des émotions difficiles",
    "Réguler ses émotions": "adaptation face à l'adversité",
    "Avoir conscience de ses émotions et de son stress": "identifier ses émotions et son stress",
    "Communiquer de façon constructive": "développement de liens sociaux",
    "Développer des relations constructives": "écoute empathique et expression claire",
    "Résoudre des difficultés": "gestion constructive des difficultés"
  };

  // Audiovisuelle descriptions
  const audiovisuelleDescriptions: { [key: string]: string } = {
    "Jeu d'Acteur": "improviser, jouer sur scène ou face à une caméra",
    "Technique Vocale": "maîtriser les fondamentaux du jeu d'acteur et développer une technique vocale précise",
    "Expertise Théâtrale": "niveau universitaire ou associatif personnalisable",
    "Maîtrise Artistique": "niveau expérience professionnelle personnalisable",
    "Prise d'Image": "scénariser, sélectionner des acteurs et tourner des images",
    "Mise en Scène": "réaliser des projets audiovisuels et maîtriser les techniques de tournage",
    "Réalisation Avancée": "niveau universitaire ou associatif personnalisable",
    "Réalisation Professionnelle": "niveau expérience professionnelle personnalisable",
    "Prise de Son": "effectuer des prises de son sur des sets de tournage",
    "Post-Production Son": "mixer et post-produire tous types de projets audiovisuels",
    "Ingénierie Sonore": "niveau universitaire ou associatif personnalisable",
    "Production Sonore": "niveau expérience professionnelle personnalisable",
    "Organisation Logistique": "veiller à la sécurité et organiser un plateau de tournage",
    "Production Audiovisuelle": "produire des projets audiovisuels du pitch au PAD dans le respect des contraintes",
    "Gestion de Production": "niveau universitaire ou associatif personnalisable",
    "Direction de Production": "niveau expérience professionnelle personnalisable"
  };

  // CPS Domains
  const cpsDomains = {
    "cognitives": "Cognitives",
    "emotionnelles": "Émotionnelles",
    "sociales": "Sociales"
  };

  // CPS badges by domain
  const cpsBadgesByDomain: { [domain: string]: Badge[] } = {
    "cognitives": [
      { title: "Avoir conscience de soi", image: "/badges_psychosociales/Cognitives.jpg" },
      { title: "Capacité de maîtrise de soi", image: "/badges_psychosociales/Cognitives.jpg" },
      { title: "Prendre des décisions constructives", image: "/badges_psychosociales/Cognitives.jpg" }
    ],
    "emotionnelles": [
      { title: "Gérer son stress", image: "/badges_psychosociales/Emotionnelles_final.png" },
      { title: "Réguler ses émotions", image: "/badges_psychosociales/Emotionnelles_final.png" },
      { title: "Avoir conscience de ses émotions et de son stress", image: "/badges_psychosociales/Emotionnelles_final.png" }
    ],
    "sociales": [
      { title: "Communiquer de façon constructive", image: "/badges_psychosociales/Sociales_final.png" },
      { title: "Développer des relations constructives", image: "/badges_psychosociales/Sociales_final.png" },
      { title: "Résoudre des difficultés", image: "/badges_psychosociales/Sociales_final.png" }
    ]
  };

  // Audiovisuelle Domains
  const audiovisuelleDomains = {
    "jeu-acteur": "Jeu d'Acteur",
    "audiovisuel": "Audiovisuel",
    "son": "Son",
    "organisation": "Organisation-Logistique"
  };

  // Audiovisuelle badges by domain and level
  const audiovisuelleBadgesByDomain: { [domain: string]: { [level: string]: Badge[] } } = {
    "jeu-acteur": {
      "1": [{ title: "Jeu d'Acteur", image: "/NIV 1/Creativite@2x.png" }],
      "2": [{ title: "Technique Vocale", image: "/NIV 2 Kinship/Creativite-8.png" }],
      "3": [{ title: "Expertise Théâtrale", image: "/Niveau 3 Kinship/Creativite-8.png" }],
      "4": [{ title: "Maîtrise Artistique", image: "/Niv 4/Creativite@2x.png" }]
    },
    "audiovisuel": {
      "1": [{ title: "Prise d'Image", image: "/NIV 1/Communication@2x.png" }],
      "2": [{ title: "Mise en Scène", image: "/NIV 2 Kinship/Communication-8.png" }],
      "3": [{ title: "Réalisation Avancée", image: "/Niveau 3 Kinship/Communication-8.png" }],
      "4": [{ title: "Réalisation Professionnelle", image: "/Niv 4/Communication@2x.png" }]
    },
    "son": {
      "1": [{ title: "Prise de Son", image: "/NIV 1/Formation@2x.png" }],
      "2": [{ title: "Post-Production Son", image: "/NIV 2 Kinship/Formation-8.png" }],
      "3": [{ title: "Ingénierie Sonore", image: "/Niveau 3 Kinship/Formation-8.png" }],
      "4": [{ title: "Production Sonore", image: "/Niv 4/Formation@2x.png" }]
    },
    "organisation": {
      "1": [{ title: "Organisation Logistique", image: "/NIV 1/OrganisationOpe@2x.png" }],
      "2": [{ title: "Production Audiovisuelle", image: "/NIV 2 Kinship/OrganisationOpe-8.png" }],
      "3": [{ title: "Gestion de Production", image: "/Niveau 3 Kinship/OrganisationOpe-8.png" }],
      "4": [{ title: "Direction de Production", image: "/Niv 4/OrganisationOpe@2x.png" }]
    }
  };

  // TouKouLeur savoir-faires
  const touKouLeurSavoirFaires: { [key: string]: { [level: string]: string[] } } = {
    "Adaptabilité": {
      "1": [
        "Identifie un problème (ses caractéristiques, ses conséquences) dans un projet ou une situation. (obligatoire)",
        "S'engage dans une démarche de résolution."
      ],
      "2": [
        "Identifie un problème (ses caractéristiques, ses conséquences) dans un projet ou une situation. (obligatoire)",
        "S'engage dans une démarche de résolution.",
        "Apprend à mettre à distance préjugés et stéréotypes.",
        "Améliore sa performance personnelle ou collective en fonction des contraintes pour progresser et se perfectionner",
        "Tient compte des contraintes, des matériaux et des process de production."
      ]
    },
    "Communication": {
      "1": [
        "Parle et argumente à l'oral de façon claire et organisée (obligatoire)",
        "Écoute et prend en compte ses interlocuteurs. (obligatoire)"
      ],
      "2": [
        "Argumente à l'oral de façon claire et organisée.",
        "Adapte son niveau de langue et son discours en fonction de ses interlocuteurs (professeurs, partenaires, jeunes...)",
        "S'exprime à l'écrit pour raconter, décrire, expliquer ou argumenter de façon claire et précise",
        "Lit, interprète ou produit des schémas, tableaux, diagrammes, graphiques, fiches ..."
      ]
    },
    "Engagement": {
      "1": [
        "S'engager dans une thématique forte (Parcours citoyen, Environnement, sociale…).",
        "Aller au bout de son projet, de son engagement. (Obligatoire)"
      ],
      "2": [
        "Aller au bout de son projet, de son engagement. (Obligatoire)",
        "Connait l'importance d'un comportement responsable vis-à-vis de l'environnement.",
        "Comprend ses responsabilités individuelles et collectives."
      ]
    },
    "Esprit Critique": {
      "1": [
        "Analyse et exploite les erreurs.",
        "Met à l'essai plusieurs solutions.",
        "Vérifie la validité d'une information (obligatoire)."
      ],
      "2": [
        "Analyse et exploite les erreurs.",
        "Met à l'essai plusieurs solutions.",
        "Vérifie la validité d'une information (obligatoire)",
        "Remet en cause ses jugements initiaux après un débat argumenté."
      ]
    },
    "Gestion de Projet": {
      "1": [
        "Met en œuvre une action dans un projet (obligatoire)",
        "Sait prendre des initiatives.",
        "Fait preuve de diplomatie."
      ],
      "2": [
        "Apprend à gérer un projet et évalue l'atteinte des objectifs. (Obligatoire)",
        "Négocie et recherche un consensus.",
        "Tient compte des contraintes.",
        "Met en œuvre son projet après avoir évalué les conséquences de son action."
      ]
    },
    "Formation": {
      "1": [
        "Met en relation les informations collectées pour construire ses connaissances.",
        "Aide celui qui ne sait pas. (obligatoire)",
        "Demande de l'aide."
      ],
      "2": [
        "Met en œuvre l'attention, la mémorisation, la mobilisation des ressources pour acquérir des connaissances.",
        "Demande de l'aide pour apprendre de ses pairs.",
        "Cherche ou expérimente une ou des nouvelles techniques pertinentes.",
        "Sollicite les connaissances scientifiques, technologiques et artistiques pertinentes."
      ]
    },
    "Coopération": {
      "1": [
        "Travaille en équipe en variant sa place et son rôle dans le groupe en tant que participant. (Obligatoire)",
        "Sait que son environnement social est un lieu collaboration, d'entraide et de mutualisation des savoirs.",
        "Fait preuve de diplomatie dans ces propositions (accepte de les négocier si besoin)."
      ],
      "2": [
        "Travaille en équipe en variant sa place et son rôle dans le groupe en tant que porteur de projet, responsable équipe. (Obligatoire)",
        "Négocie et recherche un accord, un compromis si besoin.",
        "S'engage dans un dialogue constructif."
      ]
    },
    "Organisation Opérationnelle": {
      "1": [
        "Partage les tâches dans son équipe.",
        "Respecte les règles communes (du Lieu, de fonctionnement de l'équipe...)",
        "Se projette dans le temps. (Obligatoire)"
      ],
      "2": [
        "Partage les tâches pour la mise en place d'une action.",
        "Met en place des règles communes (en fonction du lieu et/ou de fonctionnement de l'équipe...)",
        "Anticipe et planifie ses tâches. (Obligatoire)",
        "Recherche et utilise des techniques pertinentes en fonction de son projet ou de son rôle dans celui-ci."
      ]
    },
    "Information Numérique": {
      "1": [
        "Utilise des outils numériques de publication de ses documents.",
        "Utilise des outils de recherche internet.",
        "Utilise les espaces numériques d'échanges collaboratifs."
      ],
      "2": [
        "Mobilise différents outils numériques pour créer des documents intégrant divers médias.",
        "Met en forme ses recherches avec des logiciels de mise en page.",
        "Utilise des outils numériques pour s'organiser, échanger et collaborer (tableur, mails, application…).",
        "Utilise les outils (imprimantes 3D, logiciels numériques, parc informatique…) des espaces collaboratifs (tiers-lieu, FabLab…)"
      ]
    },
    "Créativité": {
      "1": [
        "Imagine, conçoit ou fabrique des objets.",
        "Mobilise son imagination et sa créativité pour proposer une idée. (Obligatoire)"
      ],
      "2": [
        "Mobilise son imagination et sa créativité au service d'un projet personnel ou collectif. (obligatoire)",
        "Met en œuvre des démarches et des techniques de création pour ses productions de natures diverses.",
        "Imagine, conçoit ou réalise des productions diverses de natures diverses y compris littéraires et artistiques."
      ]
    }
  };

  const [availableTitles, setAvailableTitles] = useState<Badge[]>([]);
  const [availableSavoirFaires, setAvailableSavoirFaires] = useState<string[]>([]);
  const [badgePreview, setBadgePreview] = useState({
    image: "/TouKouLeur-Jaune.png",
    title: "Sélectionnez une série",
    description: "...et un niveau pour voir le badge",
    detailedDescription: ""
  });

  // Reset domain when series changes
  useEffect(() => {
    setDomain('');
  }, [series]);

  // Update available badge titles when series, domain, or level changes
  useEffect(() => {
    if (series === 'universelle' && level && badgeData[series] && badgeData[series].badges[level]) {
      setAvailableTitles(badgeData[series].badges[level]);
    } else if (series === 'psychosociale' && domain) {
      setAvailableTitles(cpsBadgesByDomain[domain] || []);
    } else if (series === 'audiovisuelle' && domain && level) {
      setAvailableTitles(audiovisuelleBadgesByDomain[domain]?.[level] || []);
    } else {
      setAvailableTitles([]);
    }
    setTitle('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, level, domain]);

  // Update badge preview when selection changes
  useEffect(() => {
    let badge: Badge | undefined;
    
    if (series === 'universelle' && level && title && badgeData[series] && badgeData[series].badges[level]) {
      badge = badgeData[series].badges[level].find(b => b.title === title);
    } else if (series === 'psychosociale' && domain && title) {
      badge = cpsBadgesByDomain[domain]?.find(b => b.title === title);
    } else if (series === 'audiovisuelle' && domain && level && title) {
      badge = audiovisuelleBadgesByDomain[domain]?.[level]?.find(b => b.title === title);
    }

    if (badge && series) {
      let detailedDescription = '';
      if (series === 'universelle') {
        detailedDescription = touKouLeurDescriptions[title] || '';
      } else if (series === 'psychosociale') {
        detailedDescription = cpsDescriptions[title] || '';
      } else if (series === 'audiovisuelle') {
        detailedDescription = audiovisuelleDescriptions[title] || '';
      } else {
        detailedDescription = badgeData[series].description.toLowerCase();
      }

      let levelText = level ? ` - Niveau ${level}` : '';
      setBadgePreview({
        image: badge.image,
        title: badge.title,
        description: `${badgeData[series].name}${levelText}`,
        detailedDescription: detailedDescription
      });
    } else {
      setBadgePreview({
        image: "/TouKouLeur-Jaune.png",
        title: "Sélectionnez une série",
        description: "...et un niveau pour voir le badge",
        detailedDescription: ""
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, level, domain, title]);

  // Update available savoir-faires for TouKouLeur series
  useEffect(() => {
    if (series === 'universelle' && (level === '1' || level === '2') && title && touKouLeurSavoirFaires[title]) {
      setAvailableSavoirFaires(touKouLeurSavoirFaires[title][level] || []);
    } else {
      setAvailableSavoirFaires([]);
    }
    setSavoirFaire('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, level, title]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFichier(file);
      setFileName(file.name);
    }
  };

  const getBadgeImage = (series: string, level: string, title: string, domain: string): string => {
    let badge: Badge | undefined;
    
    // Use the same logic as the preview
    if (series === 'universelle' && level && title && badgeData[series] && badgeData[series].badges[level]) {
      badge = badgeData[series].badges[level].find(b => b.title === title);
    } else if (series === 'psychosociale' && domain && title) {
      badge = cpsBadgesByDomain[domain]?.find(b => b.title === title);
    } else if (series === 'audiovisuelle' && domain && level && title) {
      badge = audiovisuelleBadgesByDomain[domain]?.[level]?.find(b => b.title === title);
    }
    
    if (badge) {
      return `/wetransfer_badges-kinship_2025-09-15_1406${badge.image}`;
    }
    
    return '/TouKouLeur-Jaune.png';
  };

  const handleSubmit = () => {
    // Debug logging
    console.log('Validation check:', {
      series,
      level,
      title,
      participant,
      domain,
      domaine,
      commentaire,
      fichier: !!fichier,
      savoirFaire
    });
    
    // Validation - different requirements for different series
    if (!series || !title || !participant) {
      showWarningToast('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    // Domain is only required for CPS and Audiovisuelle series
    if ((series === 'psychosociale' || series === 'audiovisuelle') && !domain) {
      showWarningToast('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    // Domaine d'engagement is only required for non-CPS series
    if (series !== 'psychosociale' && !domaine) {
      showWarningToast('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    // Level is only required for TouKouLeur and Audiovisuelle series
    if ((series === 'universelle' || series === 'audiovisuelle') && !level) {
      showWarningToast('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Check required comment for level 3-4
    if ((level === '3' || level === '4') && !commentaire) {
      showWarningToast('Le commentaire est obligatoire pour les niveaux 3 et 4');
      return;
    }

    // Check required file for level 2+ (only for series with levels)
    if (level && parseInt(level) >= 2 && !fichier) {
      showWarningToast('Le fichier est obligatoire à partir du niveau 2');
      return;
    }
    
    // For CPS series, file is always required
    if (series === 'psychosociale' && !fichier) {
      showWarningToast('Le fichier est obligatoire pour la série CPS');
      return;
    }

    // Check savoir-faire for TouKouLeur level 1-2
    if (series === 'universelle' && (level === '1' || level === '2') && !savoirFaire) {
      showWarningToast('Veuillez sélectionner un savoir-faire');
      return;
    }

    // Get selected participant data
    const selectedParticipant = participants.find(p => p.memberId === participant);
    if (!selectedParticipant) {
      showErrorToast('Participant non trouvé');
      return;
    }

    // Get badge image using the same logic as preview
    // For CPS series, use domain field; for others, use domaine d'engagement
    const badgeImage = getBadgeImage(series, level, title, series === 'psychosociale' ? domain : domaine);

    // Create badge attribution
    const attribution: BadgeAttribution = {
      id: `badge-${Date.now()}`,
      badgeId: `${series}-${level}-${title}`,
      badgeTitle: title,
      badgeSeries: badgeData[series]?.name || series,
      badgeLevel: level,
      badgeImage: badgeImage,
      participantId: selectedParticipant.memberId,
      participantName: selectedParticipant.name,
      participantAvatar: selectedParticipant.avatar,
      participantOrganization: selectedParticipant.organization || 'Non spécifiée',
      attributedBy: state.user.id,
      attributedByName: state.user.name,
      attributedByAvatar: state.user.avatar,
      attributedByOrganization: state.user.organization || 'Non spécifiée',
      projectId: projectId || '',
      projectTitle: projectTitle || '',
      domaineEngagement: series === 'psychosociale' ? domain : domaine,
      commentaire: commentaire || undefined,
      preuve: fichier ? {
        name: fichier.name,
        type: fichier.type,
        size: `${(fichier.size / 1024).toFixed(1)} KB`
      } : undefined,
      dateAttribution: new Date().toISOString()
    };

    // Add to context
    addBadgeAttribution(attribution);

    // Show success message
    setSuccessData({
      badgeTitle: title,
      badgeImage: badgeImage
    });
    setShowSuccess(true);

    // Call original onAssign for backward compatibility
    onAssign(attribution);
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
              <img src={badgePreview.image} alt={badgePreview.title} className="badge-image-large" />
            </div>
            <div className="badge-preview-info">
              <h3>{badgePreview.title}</h3>
              <p className="badge-series-level">{badgePreview.description}</p>
              {badgePreview.detailedDescription && (
                <div className="badge-info-detail">
                  <p><strong>Description:</strong> {badgePreview.detailedDescription}</p>
                </div>
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className="badge-assignment-form">
            <div className="form-group">
              <label htmlFor="badgeSeries">Série de badge</label>
              <select
                id="badgeSeries"
                className="form-select"
                value={series}
                onChange={(e) => setSeries(e.target.value)}
              >
                <option value="">Sélectionner une série</option>
                <option value="universelle">Série Soft Skills 4LAB</option>
                <option value="psychosociale" disabled>Série CPS</option>
                <option value="audiovisuelle" disabled>Série Audiovisuelle</option>
              </select>
            </div>

            {/* Domain selection for CPS and Audiovisuelle series */}
            {(series === 'psychosociale' || series === 'audiovisuelle') && (
              <div className="form-group">
                <label htmlFor="badgeDomain">Domaine</label>
                <select
                  id="badgeDomain"
                  className="form-select"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                >
                  <option value="">Sélectionner un domaine</option>
                  {series === 'psychosociale' && Object.entries(cpsDomains).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                  {series === 'audiovisuelle' && Object.entries(audiovisuelleDomains).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Level selection - show for TouKouLeur and Audiovisuelle */}
            {(series === 'universelle' || series === 'audiovisuelle') && (
              <div className="form-group">
                <label htmlFor="badgeLevel">Niveau</label>
                <select
                  id="badgeLevel"
                  className="form-select"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  disabled={series === 'audiovisuelle' && !domain}
                >
                  <option value="">Sélectionner un niveau</option>
                  {series === 'universelle' && (
                    <>
                      <option value="1">Niveau 1: Découverte</option>
                      <option value="2">Niveau 2: Application</option>
                      <option value="3">Niveau 3: Maîtrise</option>
                      <option value="4">Niveau 4: Expertise</option>
                    </>
                  )}
                  {series === 'audiovisuelle' && (
                    <>
                      <option value="1">Niveau 1: Observable</option>
                      <option value="2">Niveau 2: Preuve</option>
                      <option value="3">Niveau 3: Personnalisable</option>
                      <option value="4">Niveau 4: Personnalisable</option>
                    </>
                  )}
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="badgeTitle">Titre du badge</label>
              <select
                id="badgeTitle"
                className="form-select"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={
                  (series === 'universelle' && !level) ||
                  (series === 'psychosociale' && !domain) ||
                  (series === 'audiovisuelle' && (!domain || !level))
                }
              >
                <option value="">Sélectionner un badge</option>
                {availableTitles.map((badge, index) => (
                  <option key={index} value={badge.title}>
                    {badge.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="participant">Participant</label>
              <select
                id="participant"
                className="form-select"
                value={participant}
                onChange={(e) => setParticipant(e.target.value)}
                disabled={!!preselectedParticipant}
              >
                <option value="">Sélectionner un participant</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.memberId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Domaine d'engagement field - only for non-CPS series */}
            {series !== 'psychosociale' && (
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
            )}

            {showSavoirFaires && (
              <div className="form-group">
                <label htmlFor="savoirFaires">Savoir-faire</label>
                <select
                  id="savoirFaires"
                  className="form-select"
                  value={savoirFaire}
                  onChange={(e) => setSavoirFaire(e.target.value)}
                >
                  <option value="">Sélectionner un savoir-faire</option>
                  {availableSavoirFaires.map((sf, index) => (
                    <option key={index} value={sf}>
                      {sf}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="commentaire">Commentaire</label>
              {showCommentaireRequired && (
                <small className="field-comment">* obligatoire pour les niveaux 3 et 4</small>
              )}
              <textarea
                id="commentaire"
                className="form-textarea"
                rows={3}
                placeholder="Ajoutez un commentaire..."
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="badgeFile">Fichier (preuve)</label>
              {showFichierRequired && (
                <small className="field-comment">obligatoire à partir du niveau 2</small>
              )}
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
