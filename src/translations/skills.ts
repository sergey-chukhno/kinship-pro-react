/**
 * French translations for skills and sub-skills
 * 
 * The backend API returns skills and sub-skills in English.
 * This file provides French translations for display in the frontend.
 */

/**
 * Skills translations: English (API) → French (Display)
 */
export const SKILLS_FR: Record<string, string> = {
    "Arts & Culture": "Arts & Culture",
    "Audio & Video": "Audiovisuel & Cinéma",
    "Cooking & Techniques": "Cuisine et ses techniques",
    "Creativity": "Créativité",
    "DIY & Gardening": "Bricolage & Jardinage",
    "Dance & Music": "Danse & Musique",
    "IT & Digital": "Informatique & Numérique",
    "Journalism & Media": "Journalisme & Média",
    "Management & Training": "Gestion & Formation",
    "Multilingual": "Multilangues",
    "Object Manufacturing": "Fabrication d'objets",
    "Sports & Initiation": "Sports & initiation",
    "Theater & Communication": "Théâtre & Communication",
}

/**
 * Sub-skills translations: English (API) → French (Display)
 */
export const SUB_SKILLS_FR: Record<string, string> = {
    // Audio & Video (Audiovisuel & Cinéma)
    "Video": "Vidéo",
    "Video Editing": "Montage Vidéo",
    "Photography": "Photo",
    "Production Techniques": "Technique de Réalisation",

    // Arts & Culture
    "Painting": "Peinture",
    "Drawing": "Dessin",
    "Set Design": "Décors",

    // DIY & Gardening (Bricolage & Jardinage)
    "Carpentry": "Menuiserie",
    "Electricity": "Électricité",
    "Plumbing": "Plomberie",
    "Various Creations": "Création diverse",

    // Creativity (Créativité)
    "Sewing": "Couture",
    // "Various Creations": "Création diverse", // Already defined above
    "Pottery": "Poterie",
    "Ideation Workshop": "Atelier d'idéation",

    // Dance & Music (Danse & Musique)
    "Vocal Technique": "Technique de chant",
    "Salsa": "Salsa",
    "Rock": "Rock",
    "Piano": "Piano",

    // Management & Training (Gestion & Formation)
    "Accounting": "Comptabilité",
    "Project Management": "Gestion de projet",

    // IT & Digital (Informatique & Numérique)
    "Developer": "Développeur",
    "Design": "Design",
    "Software Usage": "Utilisation de logiciel",
    "Introduction": "Initiation",

    // Journalism & Media (Journalisme & Média)
    "Public Speaking": "Prise de parole en public",
    "Article Writing": "Rédaction d'article",
    "Video Reporting": "Reportage vidéo",

    // Theater & Communication (Théâtre & Communication)
    // "Public Speaking": "Prise de parole en public", // Already defined above
    // "Set Design": "Décors", // Already defined above
    "Improvisation Workshop": "Atelier d'improvisation",

    // Multilingual (Multilangues)
    "Speaking and Translating a Language Orally": "Parler et traduire une langue à l'oral",
    "Speaking and Translating a Language in Writing": "Parler et traduire une langue à l'écrit",
}

/**
 * Translate a skill name from English to French
 * @param englishName - The English skill name from the API
 * @returns The French translation, or the original English name if no translation exists
 */
export function translateSkill(englishName: string): string {
    return SKILLS_FR[englishName] || englishName
}

/**
 * Translate a sub-skill name from English to French
 * @param englishName - The English sub-skill name from the API
 * @returns The French translation, or the original English name if no translation exists
 */
export function translateSubSkill(englishName: string): string {
    return SUB_SKILLS_FR[englishName] || englishName
}
