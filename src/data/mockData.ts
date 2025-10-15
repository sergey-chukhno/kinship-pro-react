import { Member, Project, Event, Badge, Notification, User, DashboardStats, MembershipRequest } from '../types';

export const mockUser: User = {
  id: '1',
  name: 'Patrick Saoula',
  email: 'admin@kinshipedu.fr',
  role: 'Admin',
  avatar: '/patrick.webp'
};

export const mockDashboardStats: DashboardStats = {
  totalMembers: 156,
  activeProjects: 8,
  badgesAwarded: 234,
  upcomingEvents: 5
};

export const mockMembers: Member[] = [
  {
    id: '1',
    firstName: 'François',
    lastName: 'Dupont',
    email: 'francois.dupont@example.com',
    profession: 'Développeur',
    roles: ['Membre'],
    skills: ['Informatique et Numériques', 'Créativité', 'Collaboration'],
    availability: ['Lundi', 'Mercredi', 'Vendredi'],
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    isTrusted: true,
    badges: ['1', '3', '1', '1', '12'], // François has 3 Adaptabilité Level 1 + 1 Level 2
    organization: 'TechCorp',
    canProposeStage: true,
    canProposeAtelier: true
  },
  {
    id: '2',
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 'sophie.martin@example.com',
    profession: 'Designer',
    roles: ['Membre'],
    skills: ['Arts & Culture', 'Créativité', 'Innovation'],
    availability: ['Mardi', 'Jeudi'],
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    isTrusted: false,
    badges: ['3', '4', '10', '11', '3', '3', '14'], // Sophie has 3 Coopération + 1 Créativité Level 3
    organization: 'DesignStudio',
    canProposeStage: false,
    canProposeAtelier: true
  },
  {
    id: '3',
    firstName: 'Lucas',
    lastName: 'Bernard',
    email: 'lucas.bernard@example.com',
    profession: 'Formateur',
    roles: ['Référent'],
    skills: ['Gestion et Formation', 'Leadership', 'Communication'],
    availability: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
    avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
    isTrusted: true,
    badges: ['2', '5', '2', '2', '2', '13'], // Lucas has 4 Communication Level 1 + 1 Level 2
    organization: 'EduForm',
    canProposeStage: true,
    canProposeAtelier: false
  },
  {
    id: '4',
    firstName: 'Marie',
    lastName: 'Dubois',
    email: 'marie.dubois@example.com',
    profession: 'Enseignante',
    roles: ['Membre'],
    skills: ['Gestion et Formation', 'Théâtre et communication', 'Journalisme et média'],
    availability: ['Lundi', 'Mercredi', 'Vendredi'],
    avatar: 'https://randomuser.me/api/portraits/women/28.jpg',
    isTrusted: true,
    badges: ['6', '9', '11', '1', '2'],
    organization: 'École Primaire',
    canProposeStage: false,
    canProposeAtelier: true
  },
  {
    id: '5',
    firstName: 'Alexandre',
    lastName: 'Moreau',
    email: 'alexandre.moreau@example.com',
    profession: 'Chef de projet',
    roles: ['Admin'],
    skills: ['Sport et initiation', 'Bricolage & Jardinage', 'Cuisine et ses techniques'],
    availability: ['Samedi', 'Dimanche'],
    avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
    isTrusted: true,
    badges: ['4', '5'],
    organization: 'Association Sportive',
    canProposeStage: true,
    canProposeAtelier: true
  },
  {
    id: '6',
    firstName: 'Camille',
    lastName: 'Leroy',
    email: 'camille.leroy@example.com',
    profession: 'Artiste',
    roles: ['Membre'],
    skills: ['Danse et musique', 'Audiovisuel & Cinéma', 'Fabrication d\'objets'],
    availability: ['Mercredi', 'Vendredi'],
    avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
    isTrusted: false,
    badges: ['7', '8'],
    organization: 'Studio Créatif',
    canProposeStage: false,
    canProposeAtelier: false
  },
  {
    id: '7',
    firstName: 'Thomas',
    lastName: 'Petit',
    email: 'thomas.petit@example.com',
    profession: 'Traducteur',
    roles: ['Membre'],
    skills: ['Multilangues', 'Communication', 'Journalisme et média'],
    availability: ['Lundi', 'Mardi', 'Jeudi'],
    avatar: 'https://randomuser.me/api/portraits/men/52.jpg',
    isTrusted: true,
    badges: ['10', '11', '3', '4', '5', '6'],
    organization: 'Agence Internationale',
    canProposeStage: true,
    canProposeAtelier: false
  }
];

export const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Atelier développement durable',
    description: 'Ce projet ambitieux vise à sensibiliser les jeunes aux enjeux environnementaux contemporains. À travers des ateliers pratiques, des conférences et des activités de terrain, nous explorons les défis du changement climatique, de la biodiversité et de la transition écologique. Les participants développent des compétences en analyse critique, en communication et en action citoyenne pour devenir des acteurs du changement dans leur communauté.',
    status: 'in_progress',
    pathway: 'sante',
    organization: 'Lycée Victor Hugo',
    owner: 'Lucas Bernard',
    participants: 15,
    badges: 7,
    startDate: '2024-01-15',
    endDate: '2024-06-15',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=200&fit=crop',
    additionalPhotos: [
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=200&fit=crop'
    ],
    tags: ['Environnement', 'Développement durable', 'Éducation'],
    links: 'https://exemple.com',
    progress: 65,
    members: ['Lucas Bernard', 'Marie Dubois', 'Sophie Martin'],
    events: ['1', '2'],
    badges_list: ['1', '2']
  },
  {
    id: '2',
    title: 'Programme santé mentale',
    description: 'Un programme innovant de soutien psychologique destiné aux jeunes de 16 à 25 ans. Ce projet propose un accompagnement personnalisé, des ateliers de gestion du stress, des sessions de méditation et des groupes de parole. L\'objectif est de créer un espace sécurisé où les jeunes peuvent exprimer leurs difficultés, développer des stratégies de coping et renforcer leur résilience émotionnelle.',
    status: 'coming',
    pathway: 'sante',
    organization: 'École Innovation',
    owner: 'Marie Dubois',
    participants: 8,
    badges: 3,
    startDate: '2024-03-01',
    endDate: '2024-08-01',
    image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=200&fit=crop',
    additionalPhotos: [
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=200&fit=crop'
    ],
    tags: ['Santé mentale', 'Jeunesse', 'Support'],
    links: 'https://sante-mentale.org',
    progress: 0,
    members: ['Marie Dubois', 'François Dupont'],
    events: ['3'],
    badges_list: []
  },
  {
    id: '3',
    title: 'Festival artistique',
    description: 'Un festival pluridisciplinaire qui célèbre la créativité et l\'expression artistique sous toutes ses formes. Ce projet rassemble des artistes émergents et confirmés autour de performances, d\'expositions, d\'ateliers participatifs et de conférences. L\'objectif est de créer un espace de rencontre entre les arts visuels, la musique, le théâtre et la danse, tout en favorisant l\'échange intergénérationnel et l\'innovation créative.',
    status: 'ended',
    pathway: 'eac',
    organization: 'Creative Studio',
    owner: 'Sophie Martin',
    participants: 25,
    badges: 12,
    startDate: '2023-09-01',
    endDate: '2023-12-15',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop',
    additionalPhotos: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=200&fit=crop',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=200&fit=crop'
    ],
    tags: ['Art', 'Créativité', 'Festival'],
    links: 'https://festival-art.org',
    progress: 100,
    members: ['Sophie Martin', 'Lucas Bernard', 'Marie Dubois'],
    events: [],
    badges_list: ['1', '2', '3']
  }
];

export const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Réunion équipe',
    description: 'Point hebdomadaire sur les projets en cours',
    date: '2024-01-22',
    time: '09:00',
    duration: 60,
    type: 'meeting',
    location: 'Salle de réunion A',
    participants: ['François Dupont', 'Sophie Martin', 'Lucas Bernard'],
    status: 'upcoming',
    projectId: '1',
    createdBy: 'François Dupont',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    title: 'Atelier durable',
    description: 'Formation sur les pratiques éco-responsables',
    date: '2024-01-25',
    time: '13:00',
    duration: 120,
    type: 'workshop',
    location: 'Espace formation',
    participants: ['Marie Dubois', 'Lucas Bernard'],
    status: 'upcoming',
    projectId: '1',
    createdBy: 'Marie Dubois',
    createdAt: '2024-01-20T14:00:00Z'
  },
  {
    id: '3',
    title: 'Formation numérique',
    description: 'Initiation aux outils numériques',
    date: '2024-01-26',
    time: '18:00',
    duration: 90,
    type: 'training',
    location: 'Salle informatique',
    participants: ['François Dupont', 'Sophie Martin'],
    status: 'upcoming',
    projectId: '2',
    createdBy: 'Sophie Martin',
    createdAt: '2024-01-18T16:00:00Z'
  }
];

export const mockBadges: Badge[] = [
  // TouKouLeur Series - Level 1
  {
    id: '1',
    name: 'Adaptabilité',
    description: 'CAPACITÉ À PRENDRE EN COMPTE LES CONTRAINTES, LES ALÉAS ET LES OPPORTUNITÉS CONTEXTUELS DANS LA POURSUITE D\'UN OBJECTIF.',
    level: 'Niveau 1 - Découverte',
    levelClass: 'level-1',
    icon: 'fas fa-adjust',
    image: '/NIV 1/Adaptabilite@2x.png',
    category: 'Adaptabilité',
    series: 'toukouleur',
    recipients: 15,
    created: '15/01/2024',
    domains: ['Flexibilité', 'Résolution de problèmes', 'Gestion du changement'],
    expertises: ['Identification de problèmes', 'Démarche de résolution', 'Amélioration continue'],
    recipients_list: [
      { name: 'François Dupont', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', date: '15/01/2024' },
      { name: 'Sophie Martin', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', date: '16/01/2024' }
    ],
    files: [
      { name: 'Guide adaptabilité.pdf', type: 'pdf', size: '2.3 MB' }
    ],
    requirements: ['Identification d\'un problème dans un projet', 'Engagement dans une démarche de résolution'],
    skills: ['Flexibilité', 'Résolution de problèmes', 'Gestion du changement']
  },
  {
    id: '2',
    name: 'Communication',
    description: 'CAPACITÉ À MAÎTRISER LES LANGAGES POUR PARTAGER SES RÉALISATIONS ET S\'EXPRIMER DANS DIFFÉRENTS CONTEXTES',
    level: 'Niveau 1 - Découverte',
    levelClass: 'level-1',
    icon: 'fas fa-comments',
    image: '/NIV 1/Communication@2x.png',
    category: 'Communication',
    series: 'toukouleur',
    recipients: 18,
    created: '10/01/2024',
    domains: ['Expression orale', 'Écoute active', 'Partage d\'informations'],
    expertises: ['Prise de parole', 'Argumentation', 'Écoute des interlocuteurs'],
    recipients_list: [
      { name: 'Lucas Bernard', avatar: 'https://randomuser.me/api/portraits/men/28.jpg', date: '18/01/2024' },
      { name: 'Marie Dubois', avatar: 'https://randomuser.me/api/portraits/women/32.jpg', date: '20/01/2024' }
    ],
    files: [
      { name: 'Méthodes communication.pdf', type: 'pdf', size: '3.1 MB' }
    ],
    requirements: ['Parler et argumenter à l\'oral de façon claire', 'Écouter et prendre en compte ses interlocuteurs'],
    skills: ['Expression orale', 'Écoute active', 'Argumentation']
  },
  {
    id: '3',
    name: 'Coopération',
    description: 'CAPACITÉ À AGIR AVEC LES AUTRES DANS LE CADRE D\'UNE RÉALISATION COLLECTIVE',
    level: 'Niveau 1 - Découverte',
    levelClass: 'level-1',
    icon: 'fas fa-users',
    image: '/NIV 1/Cooperation@2x.png',
    category: 'Coopération',
    series: 'toukouleur',
    recipients: 12,
    created: '12/01/2024',
    domains: ['Travail d\'équipe', 'Collaboration', 'Entraide'],
    expertises: ['Participation active', 'Respect des autres', 'Contribution collective'],
    recipients_list: [
      { name: 'François Dupont', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', date: '12/01/2024' },
      { name: 'Sophie Martin', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', date: '13/01/2024' }
    ],
    files: [
      { name: 'Guide coopération.pdf', type: 'pdf', size: '2.5 MB' }
    ],
    requirements: ['Participation à un projet d\'équipe', 'Contribution active aux discussions'],
    skills: ['Travail d\'équipe', 'Collaboration', 'Entraide']
  },
  {
    id: '4',
    name: 'Créativité',
    description: 'CAPACITÉ À PROPOSER DE NOUVELLES SOLUTIONS, DE NOUVELLES VISIONS PERTINENTES DES CHOSES',
    level: 'Niveau 1 - Découverte',
    levelClass: 'level-1',
    icon: 'fas fa-lightbulb',
    image: '/NIV 1/Creativite@2x.png',
    category: 'Créativité',
    series: 'toukouleur',
    recipients: 8,
    created: '08/01/2024',
    domains: ['Innovation', 'Pensée créative', 'Résolution de problèmes'],
    expertises: ['Brainstorming', 'Prototypage', 'Test d\'idées'],
    recipients_list: [
      { name: 'Sophie Martin', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', date: '08/01/2024' }
    ],
    files: [
      { name: 'Méthodes créativité.pdf', type: 'pdf', size: '3.1 MB' }
    ],
    requirements: ['Participation à un atelier créatif', 'Proposition d\'une idée innovante'],
    skills: ['Créativité', 'Innovation', 'Résolution de problèmes']
  },
  {
    id: '5',
    name: 'Engagement',
    description: 'CAPACITÉ À S\'IMPLIQUER DURABLEMENT DANS LA RÉALISATION D\'UN PROJET D\'INTÉRÊT GÉNÉRAL',
    level: 'Niveau 1 - Découverte',
    levelClass: 'level-1',
    icon: 'fas fa-heart',
    image: '/NIV 1/Engagement@2x.png',
    category: 'Engagement',
    series: 'toukouleur',
    recipients: 10,
    created: '05/01/2024',
    domains: ['Implication', 'Persévérance', 'Intérêt général'],
    expertises: ['Participation régulière', 'Contribution durable', 'Motivation'],
    recipients_list: [
      { name: 'Lucas Bernard', avatar: 'https://randomuser.me/api/portraits/men/28.jpg', date: '05/01/2024' }
    ],
    files: [
      { name: 'Guide engagement.pdf', type: 'pdf', size: '2.8 MB' }
    ],
    requirements: ['Participation régulière à un projet', 'Contribution durable'],
    skills: ['Implication', 'Persévérance', 'Motivation']
  },
  {
    id: '6',
    name: 'Esprit Critique',
    description: 'CAPACITÉ À INTERROGER UNE SITUATION, UNE IDÉE, UNE INFORMATION',
    level: 'Niveau 1 - Découverte',
    levelClass: 'level-1',
    icon: 'fas fa-search',
    image: '/NIV 1/EspritCritique@2x.png',
    category: 'Esprit Critique',
    series: 'toukouleur',
    recipients: 6,
    created: '03/01/2024',
    domains: ['Analyse', 'Questionnement', 'Évaluation'],
    expertises: ['Analyse critique', 'Questionnement', 'Évaluation objective'],
    recipients_list: [
      { name: 'Marie Dubois', avatar: 'https://randomuser.me/api/portraits/women/32.jpg', date: '03/01/2024' }
    ],
    files: [
      { name: 'Méthodes esprit critique.pdf', type: 'pdf', size: '2.9 MB' }
    ],
    requirements: ['Analyse d\'une situation complexe', 'Questionnement constructif'],
    skills: ['Analyse', 'Questionnement', 'Évaluation']
  },
  {
    id: '7',
    name: 'Formation',
    description: 'CAPACITÉ À S\'IMPLIQUER DANS UNE DYNAMIQUE D\'APPRENTISSAGE CONTINUE INDIVIDUELLEMENT ET COLLECTIVEMENT',
    level: 'Niveau 1 - Découverte',
    levelClass: 'level-1',
    icon: 'fas fa-graduation-cap',
    image: '/NIV 1/Formation@2x.png',
    category: 'Formation',
    series: 'toukouleur',
    recipients: 14,
    created: '01/01/2024',
    domains: ['Apprentissage', 'Développement', 'Transmission'],
    expertises: ['Apprentissage continu', 'Partage de connaissances', 'Développement personnel'],
    recipients_list: [
      { name: 'Thomas Petit', avatar: 'https://randomuser.me/api/portraits/men/52.jpg', date: '01/01/2024' }
    ],
    files: [
      { name: 'Guide formation.pdf', type: 'pdf', size: '3.2 MB' }
    ],
    requirements: ['Participation à une formation', 'Partage de connaissances'],
    skills: ['Apprentissage', 'Développement', 'Transmission']
  },
  {
    id: '8',
    name: 'Gestion de Projet',
    description: 'CAPACITÉ À TRANSFORMER UNE IDÉE EN ACTION RÉALISÉE',
    level: 'Niveau 1 - Découverte',
    levelClass: 'level-1',
    icon: 'fas fa-tasks',
    image: '/NIV 1/GestionDePvrojet@2x.png',
    category: 'Gestion de Projet',
    series: 'toukouleur',
    recipients: 9,
    created: '28/12/2023',
    domains: ['Planification', 'Organisation', 'Suivi'],
    expertises: ['Planification', 'Organisation', 'Suivi de projet'],
    recipients_list: [
      { name: 'François Dupont', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', date: '28/12/2023' }
    ],
    files: [
      { name: 'Méthodes gestion projet.pdf', type: 'pdf', size: '3.5 MB' }
    ],
    requirements: ['Participation à la planification d\'un projet', 'Suivi des étapes'],
    skills: ['Planification', 'Organisation', 'Suivi']
  },
  {
    id: '9',
    name: 'Information Numérique',
    description: 'UTILISE LES OUTILS INFORMATIQUES ET NUMÉRIQUES',
    level: 'Niveau 1 - Découverte',
    levelClass: 'level-1',
    icon: 'fas fa-laptop',
    image: '/NIV 1/Inform Numerique@2x.png',
    category: 'Information Numérique',
    series: 'toukouleur',
    recipients: 20,
    created: '25/12/2023',
    domains: ['Outils numériques', 'Technologies', 'Compétences digitales'],
    expertises: ['Maîtrise des outils', 'Utilisation efficace', 'Résolution de problèmes techniques'],
    recipients_list: [
      { name: 'Lucas Bernard', avatar: 'https://randomuser.me/api/portraits/men/28.jpg', date: '25/12/2023' }
    ],
    files: [
      { name: 'Guide numérique.pdf', type: 'pdf', size: '2.7 MB' }
    ],
    requirements: ['Utilisation d\'outils numériques', 'Résolution de problèmes techniques'],
    skills: ['Outils numériques', 'Technologies', 'Compétences digitales']
  },
  {
    id: '10',
    name: 'Organisation Opérationnelle',
    description: 'CAPACITÉ À MOBILISER ET À UTILISER DES RESSOURCES CONCRÈTES AFIN DE PRODUIRE UN RÉSULTAT',
    level: 'Niveau 1 - Découverte',
    levelClass: 'level-1',
    icon: 'fas fa-cogs',
    image: '/NIV 1/OrganisationOpe@2x.png',
    category: 'Organisation Opérationnelle',
    series: 'toukouleur',
    recipients: 11,
    created: '22/12/2023',
    domains: ['Organisation', 'Ressources', 'Efficacité'],
    expertises: ['Mobilisation de ressources', 'Organisation efficace', 'Production de résultats'],
    recipients_list: [
      { name: 'Sophie Martin', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', date: '22/12/2023' }
    ],
    files: [
      { name: 'Guide organisation.pdf', type: 'pdf', size: '2.6 MB' }
    ],
    requirements: ['Mobilisation de ressources', 'Organisation efficace'],
    skills: ['Organisation', 'Ressources', 'Efficacité']
  },
  {
    id: '11',
    name: 'Sociabilité',
    description: 'CAPACITÉ À ÉTABLIR UNE RELATION À L\'AUTRE ET À ÉVOLUER AU SEIN D\'UN GROUPE SOCIAL',
    level: 'Niveau 1 - Découverte',
    levelClass: 'level-1',
    icon: 'fas fa-handshake',
    image: '/NIV 1/Sociabilite@2x.png',
    category: 'Sociabilité',
    series: 'toukouleur',
    recipients: 16,
    created: '20/12/2023',
    domains: ['Relations sociales', 'Intégration', 'Communication interpersonnelle'],
    expertises: ['Établissement de relations', 'Intégration sociale', 'Communication'],
    recipients_list: [
      { name: 'Marie Dubois', avatar: 'https://randomuser.me/api/portraits/women/32.jpg', date: '20/12/2023' }
    ],
    files: [
      { name: 'Guide sociabilité.pdf', type: 'pdf', size: '2.4 MB' }
    ],
    requirements: ['Participation à des activités sociales', 'Établissement de relations'],
    skills: ['Relations sociales', 'Intégration', 'Communication interpersonnelle']
  },
  // Level 2 Badges
  {
    id: '12',
    name: 'Adaptabilité',
    description: 'CAPACITÉ À PRENDRE EN COMPTE LES CONTRAINTES, LES ALÉAS ET LES OPPORTUNITÉS CONTEXTUELS DANS LA POURSUITE D\'UN OBJECTIF.',
    level: 'Niveau 2 - Application',
    levelClass: 'level-2',
    icon: 'fas fa-adjust',
    image: '/NIV 2 Kinship/Adaptabilite-8.png',
    category: 'Adaptabilité',
    series: 'toukouleur',
    recipients: 8,
    created: '15/02/2024',
    domains: ['Flexibilité', 'Résolution de problèmes', 'Gestion du changement'],
    expertises: ['Identification de problèmes', 'Démarche de résolution', 'Amélioration continue'],
    recipients_list: [
      { name: 'François Dupont', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', date: '15/02/2024' }
    ],
    files: [
      { name: 'Preuve adaptabilité niveau 2.pdf', type: 'pdf', size: '3.2 MB' }
    ],
    requirements: ['Identification d\'un problème dans un projet', 'Engagement dans une démarche de résolution'],
    skills: ['Flexibilité', 'Résolution de problèmes', 'Gestion du changement']
  },
  {
    id: '13',
    name: 'Communication',
    description: 'CAPACITÉ À MAÎTRISER LES LANGAGES POUR PARTAGER SES RÉALISATIONS ET S\'EXPRIMER DANS DIFFÉRENTS CONTEXTES',
    level: 'Niveau 2 - Application',
    levelClass: 'level-2',
    icon: 'fas fa-comments',
    image: '/NIV 2 Kinship/Communication-8.png',
    category: 'Communication',
    series: 'toukouleur',
    recipients: 12,
    created: '10/02/2024',
    domains: ['Expression orale', 'Écoute active', 'Partage d\'informations'],
    expertises: ['Prise de parole', 'Argumentation', 'Écoute des interlocuteurs'],
    recipients_list: [
      { name: 'Lucas Bernard', avatar: 'https://randomuser.me/api/portraits/men/28.jpg', date: '10/02/2024' }
    ],
    files: [
      { name: 'Preuve communication niveau 2.pdf', type: 'pdf', size: '2.8 MB' }
    ],
    requirements: ['Parler et argumenter à l\'oral de façon claire', 'Écouter et prendre en compte ses interlocuteurs'],
    skills: ['Expression orale', 'Écoute active', 'Argumentation']
  },
  {
    id: '14',
    name: 'Créativité',
    description: 'CAPACITÉ À PROPOSER DE NOUVELLES SOLUTIONS, DE NOUVELLES VISIONS PERTINENTES DES CHOSES',
    level: 'Niveau 3 - Maîtrise',
    levelClass: 'level-3',
    icon: 'fas fa-lightbulb',
    image: '/Niveau 3 Kinship/Creativite-8.png',
    category: 'Créativité',
    series: 'toukouleur',
    recipients: 5,
    created: '05/03/2024',
    domains: ['Innovation', 'Pensée créative', 'Résolution de problèmes'],
    expertises: ['Brainstorming', 'Prototypage', 'Test d\'idées'],
    recipients_list: [
      { name: 'Sophie Martin', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', date: '05/03/2024' }
    ],
    files: [
      { name: 'Preuve créativité niveau 3.pdf', type: 'pdf', size: '4.1 MB' }
    ],
    requirements: ['Participation à un atelier créatif', 'Proposition d\'une idée innovante'],
    skills: ['Créativité', 'Innovation', 'Résolution de problèmes']
  },
  // CPS Series - Psychosociale
  {
    id: '13',
    name: 'Communication CPS',
    description: 'COMPÉTENCES PSYCHOSOCIALES EN COMMUNICATION POUR DÉVELOPPER SES CAPACITÉS D\'EXPRESSION ET D\'ÉCOUTE.',
    level: 'Niveau 1 - Découverte',
    levelClass: 'level-1',
    icon: 'fas fa-comments',
    image: '/badges_psychosociales/Communication.jpg',
    category: 'Compétences Psychosociales',
    series: 'psychosociale',
    recipients: 8,
    created: '20/01/2024',
    domains: ['scolaire', 'professionnel'],
    expertises: ['Expression orale', 'Écoute active', 'Communication non-violente'],
    recipients_list: [
      { name: 'François Dupont', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', date: '20/01/2024' }
    ],
    files: [
      { name: 'Guide CPS Communication.pdf', type: 'pdf', size: '2.8 MB' }
    ],
    requirements: ['Participation à un atelier de communication', 'Mise en pratique des techniques d\'écoute'],
    skills: ['Communication', 'Écoute active', 'Expression orale']
  },
  {
    id: '14',
    name: 'Coopération CPS',
    description: 'COMPÉTENCES PSYCHOSOCIALES EN COOPÉRATION POUR DÉVELOPPER SES CAPACITÉS DE TRAVAIL EN ÉQUIPE.',
    level: 'Niveau 2 - Application',
    levelClass: 'level-2',
    icon: 'fas fa-users',
    image: '/badges_psychosociales/Cooperation.jpg',
    category: 'Compétences Psychosociales',
    series: 'psychosociale',
    recipients: 5,
    created: '22/01/2024',
    domains: ['professionnel', 'citoyen'],
    expertises: ['Travail en équipe', 'Collaboration', 'Résolution de conflits'],
    recipients_list: [
      { name: 'Sophie Martin', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', date: '22/01/2024' }
    ],
    files: [
      { name: 'Preuve coopération CPS.pdf', type: 'pdf', size: '3.2 MB' }
    ],
    requirements: ['Participation à un projet collaboratif', 'Démonstration de leadership positif'],
    skills: ['Coopération', 'Leadership', 'Résolution de conflits']
  },
  // CPS - Emotionnelles
  {
    id: '15',
    name: 'Gestion des émotions',
    description: 'COMPÉTENCE ÉMOTIONNELLE POUR IDENTIFIER, COMPRENDRE ET RÉGULER SES ÉMOTIONS.',
    level: 'CPS',
    levelClass: 'cps',
    icon: 'fas fa-heart',
    image: '/badges_psychosociales/Emotionnelles_final.png',
    category: 'Compétences Psychosociales',
    series: 'psychosociale',
    recipients: 12,
    created: '25/01/2024',
    domains: ['emotionnelles'],
    expertises: ['Reconnaissance émotionnelle', 'Régulation émotionnelle', 'Expression des émotions'],
    recipients_list: [
      { name: 'Marie Dubois', avatar: 'https://randomuser.me/api/portraits/women/32.jpg', date: '25/01/2024' },
      { name: 'Lucas Bernard', avatar: 'https://randomuser.me/api/portraits/men/28.jpg', date: '26/01/2024' }
    ],
    files: [
      { name: 'Atelier émotions.pdf', type: 'pdf', size: '2.5 MB' }
    ],
    requirements: ['Participation à un atelier sur les émotions', 'Mise en pratique de techniques de régulation'],
    skills: ['Intelligence émotionnelle', 'Gestion du stress', 'Empathie']
  },
  {
    id: '16',
    name: 'Confiance en soi',
    description: 'COMPÉTENCE ÉMOTIONNELLE POUR DÉVELOPPER L\'ESTIME DE SOI ET LA CONFIANCE EN SES CAPACITÉS.',
    level: 'CPS',
    levelClass: 'cps',
    icon: 'fas fa-star',
    image: '/badges_psychosociales/Emotionnelles_final.png',
    category: 'Compétences Psychosociales',
    series: 'psychosociale',
    recipients: 9,
    created: '28/01/2024',
    domains: ['emotionnelles'],
    expertises: ['Estime de soi', 'Affirmation de soi', 'Gestion du stress'],
    recipients_list: [
      { name: 'Alexandre Moreau', avatar: 'https://randomuser.me/api/portraits/men/45.jpg', date: '28/01/2024' }
    ],
    files: [
      { name: 'Guide confiance.pdf', type: 'pdf', size: '1.8 MB' }
    ],
    requirements: ['Participation à un parcours de développement personnel', 'Prise de parole en public'],
    skills: ['Confiance', 'Assertivité', 'Résilience']
  },
  // CPS - Cognitives
  {
    id: '17',
    name: 'Pensée critique',
    description: 'COMPÉTENCE COGNITIVE POUR ANALYSER, ÉVALUER ET SYNTHÉTISER L\'INFORMATION DE MANIÈRE OBJECTIVE.',
    level: 'CPS',
    levelClass: 'cps',
    icon: 'fas fa-brain',
    image: '/badges_psychosociales/Cognitives.jpg',
    category: 'Compétences Psychosociales',
    series: 'psychosociale',
    recipients: 14,
    created: '30/01/2024',
    domains: ['cognitives'],
    expertises: ['Analyse critique', 'Évaluation de l\'information', 'Raisonnement logique'],
    recipients_list: [
      { name: 'François Dupont', avatar: 'https://randomuser.me/api/portraits/men/32.jpg', date: '30/01/2024' },
      { name: 'Sophie Martin', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', date: '31/01/2024' }
    ],
    files: [
      { name: 'Exercices pensée critique.pdf', type: 'pdf', size: '3.5 MB' }
    ],
    requirements: ['Participation à un atelier de pensée critique', 'Analyse d\'un cas pratique'],
    skills: ['Analyse', 'Esprit critique', 'Synthèse']
  },
  {
    id: '18',
    name: 'Résolution de problèmes',
    description: 'COMPÉTENCE COGNITIVE POUR IDENTIFIER, ANALYSER ET RÉSOUDRE DES PROBLÈMES COMPLEXES.',
    level: 'CPS',
    levelClass: 'cps',
    icon: 'fas fa-puzzle-piece',
    image: '/badges_psychosociales/Cognitives.jpg',
    category: 'Compétences Psychosociales',
    series: 'psychosociale',
    recipients: 11,
    created: '02/02/2024',
    domains: ['cognitives'],
    expertises: ['Identification de problèmes', 'Analyse de solutions', 'Prise de décision'],
    recipients_list: [
      { name: 'Lucas Bernard', avatar: 'https://randomuser.me/api/portraits/men/28.jpg', date: '02/02/2024' }
    ],
    files: [
      { name: 'Méthode résolution problèmes.pdf', type: 'pdf', size: '2.9 MB' }
    ],
    requirements: ['Résolution d\'un problème complexe dans un projet', 'Documentation de la démarche'],
    skills: ['Résolution de problèmes', 'Créativité', 'Analyse']
  },
  // CPS - Sociales
  {
    id: '19',
    name: 'Empathie',
    description: 'COMPÉTENCE SOCIALE POUR COMPRENDRE ET PARTAGER LES ÉMOTIONS DES AUTRES.',
    level: 'CPS',
    levelClass: 'cps',
    icon: 'fas fa-hands-helping',
    image: '/badges_psychosociales/Sociales_final.png',
    category: 'Compétences Psychosociales',
    series: 'psychosociale',
    recipients: 16,
    created: '05/02/2024',
    domains: ['sociales'],
    expertises: ['Écoute empathique', 'Compréhension des émotions', 'Soutien social'],
    recipients_list: [
      { name: 'Marie Dubois', avatar: 'https://randomuser.me/api/portraits/women/32.jpg', date: '05/02/2024' },
      { name: 'Sophie Martin', avatar: 'https://randomuser.me/api/portraits/women/44.jpg', date: '06/02/2024' }
    ],
    files: [
      { name: 'Atelier empathie.pdf', type: 'pdf', size: '2.2 MB' }
    ],
    requirements: ['Participation à un atelier d\'écoute active', 'Accompagnement d\'un pair'],
    skills: ['Empathie', 'Écoute active', 'Bienveillance']
  },
  {
    id: '20',
    name: 'Communication assertive',
    description: 'COMPÉTENCE SOCIALE POUR S\'EXPRIMER DE MANIÈRE CLAIRE ET RESPECTUEUSE.',
    level: 'CPS',
    levelClass: 'cps',
    icon: 'fas fa-comments',
    image: '/badges_psychosociales/Sociales_final.png',
    category: 'Compétences Psychosociales',
    series: 'psychosociale',
    recipients: 13,
    created: '08/02/2024',
    domains: ['sociales'],
    expertises: ['Expression claire', 'Respect des autres', 'Gestion des conflits'],
    recipients_list: [
      { name: 'Alexandre Moreau', avatar: 'https://randomuser.me/api/portraits/men/45.jpg', date: '08/02/2024' }
    ],
    files: [
      { name: 'Guide communication assertive.pdf', type: 'pdf', size: '2.7 MB' }
    ],
    requirements: ['Formation à la communication non-violente', 'Mise en pratique dans un contexte professionnel'],
    skills: ['Communication', 'Assertivité', 'Respect']
  }
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Nouveau membre',
    message: 'Sophie Martin a rejoint l\'organisation',
    type: 'system',
    date: '2024-01-20',
    isRead: false,
    sender: 'Système',
    relatedItem: 'Membres'
  },
  {
    id: '2',
    title: 'Projet terminé',
    message: 'Le projet "Festival artistique" a été complété avec succès',
    type: 'project',
    date: '2024-01-18',
    isRead: false,
    sender: 'Système',
    relatedItem: 'Festival artistique'
  },
  {
    id: '3',
    title: 'Badge attribué',
    message: 'Un nouveau badge "Collaboration" a été attribué à François Dupont',
    type: 'badge',
    date: '2024-01-15',
    isRead: true,
    sender: 'Système',
    relatedItem: 'Collaboration'
  }
];

export const mockMembershipRequests: MembershipRequest[] = [
  {
    id: '1',
    firstName: 'Marie',
    lastName: 'Dubois',
    email: 'marie.dubois@example.com',
    profession: 'Développeuse Frontend',
    skills: ['Informatique et Numériques', 'Créativité', 'Innovation'],
    availability: ['Lundi', 'Mercredi', 'Vendredi'],
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    requestedDate: '2024-01-20',
    status: 'pending',
    assignedRole: 'Membre'
  },
  {
    id: '2',
    firstName: 'Thomas',
    lastName: 'Martin',
    email: 'thomas.martin@example.com',
    profession: 'Chef de Projet',
    skills: ['Leadership', 'Gestion et Formation', 'Collaboration'],
    availability: ['Mardi', 'Jeudi', 'Samedi'],
    avatar: 'https://randomuser.me/api/portraits/men/25.jpg',
    requestedDate: '2024-01-19',
    status: 'pending',
    assignedRole: 'Membre'
  },
  {
    id: '3',
    firstName: 'Sophie',
    lastName: 'Leroy',
    email: 'sophie.leroy@example.com',
    profession: 'Designer UX/UI',
    skills: ['Créativité', 'Arts & Culture', 'Innovation'],
    availability: ['Lundi', 'Mardi', 'Mercredi'],
    avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
    requestedDate: '2024-01-18',
    status: 'pending',
    assignedRole: 'Membre'
  },
  {
    id: '4',
    firstName: 'Alexandre',
    lastName: 'Rousseau',
    email: 'alexandre.rousseau@example.com',
    profession: 'Développeur Full Stack',
    skills: ['Informatique et Numériques', 'Innovation', 'Gestion et Formation'],
    availability: ['Mercredi', 'Jeudi', 'Vendredi'],
    avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
    requestedDate: '2024-01-17',
    status: 'pending',
    assignedRole: 'Membre'
  },
  {
    id: '5',
    firstName: 'Camille',
    lastName: 'Moreau',
    email: 'camille.moreau@example.com',
    profession: 'Marketing Digital',
    skills: ['Journalisme et média', 'Créativité', 'Collaboration'],
    availability: ['Lundi', 'Vendredi', 'Samedi'],
    avatar: 'https://randomuser.me/api/portraits/women/28.jpg',
    requestedDate: '2024-01-16',
    status: 'pending',
    assignedRole: 'Membre'
  }
];
