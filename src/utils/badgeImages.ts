// Local mapping of badge names (level 1) to existing static assets.
// This preserves previous visuals while backend does not yet provide image URLs.
const badgeImagesByName: Record<string, string> = {
  // Série TouKouLeur (universelle)
  "Adaptabilité": "/NIV 1/Adaptabilite@2x.png",
  "Communication": "/NIV 1/Communication@2x.png",
  "Coopération": "/NIV 1/Cooperation@2x.png",
  "Créativité": "/NIV 1/Creativite@2x.png",
  "Engagement": "/NIV 1/Engagement@2x.png",
  "Esprit Critique": "/NIV 1/EspritCritique@2x.png",
  "Formation": "/NIV 1/Formation@2x.png",
  "Gestion de Projet": "/NIV 1/GestionDePvrojet@2x.png",
  "Information Numérique": "/NIV 1/Inform Numerique@2x.png",
  "Organisation Opérationnelle": "/NIV 1/OrganisationOpe@2x.png",
  "Sociabilité": "/NIV 1/Sociabilite@2x.png",

  // Série CPS (psychosociale)
  "Avoir conscience de soi": "/badges_psychosociales/Cognitives.jpg",
  "Capacité de maîtrise de soi": "/badges_psychosociales/Cognitives.jpg",
  "Prendre des décisions constructives": "/badges_psychosociales/Cognitives.jpg",
  "Gérer son stress": "/badges_psychosociales/Emotionnelles_final.png",
  "Réguler ses émotions": "/badges_psychosociales/Emotionnelles_final.png",
  "Avoir conscience de ses émotions et de son stress": "/badges_psychosociales/Emotionnelles_final.png",
  "Communiquer de façon constructive": "/badges_psychosociales/Sociales_final.png",
  "Développer des relations constructives": "/badges_psychosociales/Sociales_final.png",
  "Résoudre des difficultés": "/badges_psychosociales/Sociales_final.png",

  // Série Audiovisuelle
  "Jeu d'Acteur": "/NIV 1/Creativite@2x.png",
  "Prise d'Image": "/NIV 1/Communication@2x.png",
  "Prise de Son": "/NIV 1/Formation@2x.png",
  "Organisation Logistique": "/NIV 1/OrganisationOpe@2x.png",
};

export const getLocalBadgeImage = (badgeName?: string): string | undefined => {
  if (!badgeName) return undefined;
  return badgeImagesByName[badgeName];
};

