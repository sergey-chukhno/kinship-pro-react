// Local mapping of badge names and levels to existing static assets.
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

  // Série Audiovisuelle - Level 1
  "ORGANISATION-LOGISTIQUE": "/badges_audiovisuels/Badge_Organisation_Logistique_Level1.png",
  "IMAGE": "/badges_audiovisuels/Badge_Image_Level1.png",
  "SON": "/badges_audiovisuels/Badge_Son_Level1.png",
  "ORGANISATION-ARTISTIQUE": "/badges_audiovisuels/Badge_Organisation_Artistique_Level1.png",
  
  // Série Audiovisuelle - Level 2 (ACTING also exists at level 2, so using level 2 image)
  "ACTING": "/badges_audiovisuels/Badge_Acting_Level2.png",
  "PRODUCTION": "/badges_audiovisuels/Badge_Production_Level2.png",
  "REGIE": "/badges_audiovisuels/Badge_Regie_Level2.png",
  "MISE EN SCENE": "/badges_audiovisuels/Badge_Mise_en_Scene_Level2.png",
  "PRISE IMAGE & LUMIERE": "/badges_audiovisuels/Badge_Prise_Image_Level2.png",
  "POSTPRODUCTION IMAGE ET VFX": "/badges_audiovisuels/Badge_Postproduction_Image_VFX_Level2.png",
  "PRISE DE SON": "/badges_audiovisuels/Badge_Prise_Son_Level2.png",
  "POST PRODUCTION SON": "/badges_audiovisuels/Badge_PostProduction_Son_Level2.png",
  "DECO & SFX": "/badges_audiovisuels/Badge_Deco_SFX_Level2.png",
  "STYLISME& HMC": "/badges_audiovisuels/Badge_Stylisme_HMC_Level2.png",

  // Série Parcours des possibles
  "Étape 1 : IMPLICATION INITIALE": "/badges_parcours_possibles/Badge-Serie-des-possibles-Level1.png",
  "Étape 2: ENGAGEMENT ENCADRÉ": "/badges_parcours_possibles/Badge-Serie-des-possibles-Level2.png",
  "Étape3": "/badges_parcours_possibles/Badge-Serie-des-possibles-Level3.png",
  "Étape4": "/badges_parcours_possibles/Badge-Serie-des-possibles-Level4.png",

  // Série Parcours professionnel
  "PARCOURS DE DÉCOUVERTE - COLLÈGE": "/badges_parcours_professionnel/Badge_Parcours_Professionnel_Level1.png",
  "PARCOURS DE FORMATION - LYCÉE": "/badges_parcours_professionnel/Badge_Parcours_Professionnel_Level2.png",
  "PARCOURS DE PROFESSIONNALISATION - POST-BAC": "/badges_parcours_professionnel/Badge_Parcours_Professionnel_Level3.png",
  "EXPÉRIENCES PROFESSIONNELLES": "/badges_parcours_professionnel/Badge_Parcours_Professionnel_Level4.png",
};

// Level-specific mappings for badges that have the same name at different levels
// Structure: series -> badge name -> level -> image path
const badgeImagesByLevel: Record<string, Record<string, Record<string, string>>> = {
  "Série Audiovisuelle": {
    "ACTING": {
      "level_1": "/badges_audiovisuels/Badge_Acting_Level1.png",
      "level_2": "/badges_audiovisuels/Badge_Acting_Level2.png",
      "level_3": "/badges_audiovisuels/Badge_Acting_Level3.png",
      "level_4": "/badges_audiovisuels/Badge_Acting_Level4.png",
    },
    "PRODUCTION": {
      "level_2": "/badges_audiovisuels/Badge_Production_Level2.png",
      "level_3": "/badges_audiovisuels/Badge_Production_Level3.png",
      "level_4": "/badges_audiovisuels/Badge_Production_Level4.png",
    },
    "REGIE": {
      "level_2": "/badges_audiovisuels/Badge_Regie_Level2.png",
      "level_3": "/badges_audiovisuels/Badge_Regie_Level3.png",
      "level_4": "/badges_audiovisuels/Badge_Regie_Level4.png",
    },
    "MISE EN SCENE": {
      "level_2": "/badges_audiovisuels/Badge_Mise_en_Scene_Level2.png",
      "level_3": "/badges_audiovisuels/Badge_Mise_en_Scene_Level3.png",
      "level_4": "/badges_audiovisuels/Badge_Mise_en_Scene_Level4.png",
    },
    "PRISE IMAGE & LUMIERE": {
      "level_2": "/badges_audiovisuels/Badge_Prise_Image_Level2.png",
      "level_3": "/badges_audiovisuels/Badge_Prise_Image_Level3.png",
      "level_4": "/badges_audiovisuels/Badge_Prise_Image_Level4.png",
    },
    "POSTPRODUCTION IMAGE ET VFX": {
      "level_2": "/badges_audiovisuels/Badge_Postproduction_Image_VFX_Level2.png",
      "level_3": "/badges_audiovisuels/Badge_Postproduction_Image_VFX_Level3.png",
      "level_4": "/badges_audiovisuels/Badge_Postproduction_Image_VFX_Level4.png",
    },
    "PRISE DE SON": {
      "level_2": "/badges_audiovisuels/Badge_Prise_Son_Level2.png",
      "level_3": "/badges_audiovisuels/Badge_Prise_Son_Level3.png",
      "level_4": "/badges_audiovisuels/Badge_Prise_Son_Level4.png",
    },
    "POST PRODUCTION SON": {
      "level_2": "/badges_audiovisuels/Badge_PostProduction_Son_Level2.png",
      "level_3": "/badges_audiovisuels/Badge_PostProduction_Son_Level3.png",
      "level_4": "/badges_audiovisuels/Badge_PostProduction_Son_Level4.png",
    },
    "DECO & SFX": {
      "level_2": "/badges_audiovisuels/Badge_Deco_SFX_Level2.png",
      "level_3": "/badges_audiovisuels/Badge_Deco_SFX_Level3.png",
      "level_4": "/badges_audiovisuels/Badge_Deco_SFX_Level4.png",
    },
    "STYLISME& HMC": {
      "level_2": "/badges_audiovisuels/Badge_Stylisme_HMC_Level2.png",
      "level_3": "/badges_audiovisuels/Badge_Stylisme_HMC_Level3.png",
      "level_4": "/badges_audiovisuels/Badge_Stylisme_HMC_Level4.png",
    },
  },
  "Série TouKouLeur": {
    "Adaptabilité": { "level_2": "/badges_toutkouleur_niveau2/Adaptabilite.png", "level_3": "/badges_toukouleur_niveau3/Adaptabilite-.jpg", "level_4": "/badges_toukouleur_niveau4/Adaptabilite.jpg" },
    "Communication": { "level_2": "/badges_toutkouleur_niveau2/Communication.png", "level_3": "/badges_toukouleur_niveau3/Communication.jpg", "level_4": "/badges_toukouleur_niveau4/Communication.jpg" },
    "Coopération": { "level_2": "/badges_toutkouleur_niveau2/Cooperation.png", "level_3": "/badges_toukouleur_niveau3/Cooperation.jpg", "level_4": "/badges_toukouleur_niveau4/Cooperation.jpg" },
    "Créativité": { "level_2": "/badges_toutkouleur_niveau2/Creativite8.png", "level_3": "/badges_toukouleur_niveau3/Creativite.png", "level_4": "/badges_toukouleur_niveau4/Creativite.jpg" },
    "Engagement": { "level_2": "/badges_toutkouleur_niveau2/Engagement.png", "level_3": "/badges_toukouleur_niveau3/Engagement.jpg", "level_4": "/badges_toukouleur_niveau4/Engagement.jpg" },
    "Esprit Critique": { "level_2": "/badges_toutkouleur_niveau2/EspritCritique8.png", "level_3": "/badges_toukouleur_niveau3/EspritCritique.jpg", "level_4": "/badges_toukouleur_niveau4/EspritCritique.jpg" },
    "Formation": { "level_2": "/badges_toutkouleur_niveau2/Formation8.png", "level_3": "/badges_toukouleur_niveau3/Formation.jpg", "level_4": "/badges_toukouleur_niveau4/Formation.jpg" },
    "Gestion de Projet": { "level_2": "/badges_toutkouleur_niveau2/GestionDePvrojet.png", "level_3": "/badges_toukouleur_niveau3/GestionDePvrojet.jpg", "level_4": "/badges_toukouleur_niveau4/GestionDePvrojet.jpg" },
    "Information Numérique": { "level_2": "/badges_toutkouleur_niveau2/Informatique Numerique.png", "level_3": "/badges_toukouleur_niveau3/Informatique Numerique.jpg", "level_4": "/badges_toukouleur_niveau4/Informatique Numerique.jpg" },
    "Organisation Opérationnelle": { "level_2": "/badges_toutkouleur_niveau2/OrganisationOperationnelle.png", "level_3": "/badges_toukouleur_niveau3/OrganisationOperationnelle.jpg", "level_4": "/badges_toukouleur_niveau4/OrganisationOperationnellejpg.jpg" },
    "Sociabilité": { "level_2": "/badges_toutkouleur_niveau2/Sociabilite.png", "level_3": "/badges_toukouleur_niveau3/Sociabilite.jpg", "level_4": "/badges_toukouleur_niveau4/Sociabilite.jpg" },
  },
  "Série Compétences à s'orienter - Collège": {
    "Compétence 1 – Chercher et trier l'information": {
      level_1: "/badges_competences_a_sorienter_au_college/niveau_1/chercher_et_trier_linformation.png",
      level_2: "/badges_competences_a_sorienter_au_college/niveau_2/chercher_et_trier_linformation.png",
      level_3: "/badges_competences_a_sorienter_au_college/niveau_3/chercher_et_trier_linformation.png",
      level_4: "/badges_competences_a_sorienter_au_college/niveau_4/chercher_et_trier_linformation.png",
    },
    "Compétence 2 – Connaitre les personnes, lieux, ressources qui peuvent m'aider": {
      level_1: "/badges_competences_a_sorienter_au_college/niveau_1/connaitre_personnes_qui_peuvent_aider.png",
      level_2: "/badges_competences_a_sorienter_au_college/niveau_2/connaitre_personnes_qui_peuvent_aider.png",
      level_3: "/badges_competences_a_sorienter_au_college/niveau_3/connaitre_personnes_qui_peuvent_aider.png",
      level_4: "/badges_competences_a_sorienter_au_college/niveau_4/connaitre_personnes_qui_peuvent_aider.png",
    },
    "Compétence 3 – Apprendre à découvrir les parcours de formation": {
      level_1: "/badges_competences_a_sorienter_au_college/niveau_1/apprendre_a_decovrir_les_parcours.png",
      level_2: "/badges_competences_a_sorienter_au_college/niveau_2/apprendre_a_decovrir_les_parcours.png",
      level_3: "/badges_competences_a_sorienter_au_college/niveau_3/apprendre_a_decovrir_les_parcours.png",
      level_4: "/badges_competences_a_sorienter_au_college/niveau_4/apprendre_a_decovrir_les_parcours.png",
    },
  },
};

export const getLocalBadgeImage = (badgeName?: string, badgeLevel?: string, badgeSeries?: string): string | undefined => {
  if (!badgeName) return undefined;
  
  // Check level-specific mapping first (for badges with same name at different levels)
  if (badgeLevel && badgeSeries && badgeImagesByLevel[badgeSeries]?.[badgeName]?.[badgeLevel]) {
    return badgeImagesByLevel[badgeSeries][badgeName][badgeLevel] as string;
  }
  
  // Fallback to name-only mapping
  return badgeImagesByName[badgeName];
};

