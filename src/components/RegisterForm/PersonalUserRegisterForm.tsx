"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  getSkills,
  getSubSkills,
  getPersonalUserRoles,
  getCompanies,
} from "../../api/RegistrationRessource"
import { useSchoolSearch } from "../../hooks/useSchoolSearch"
import { useClientSideSearch } from "../../hooks/useClientSideSearch"
import { translateSkill, translateSubSkill } from "../../translations/skills"
import { submitPersonalUserRegistration } from "../../api/Authentication"
import "./PersonalUserRegisterForm.css"
import { privatePolicy } from "../../data/PrivacyPolicy"


interface availability {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  other: boolean
}

interface SkillsState {
  selectedSkills: number[]
  selectedSubSkills: number[]
}

interface PasswordCriteria {
  minLength: boolean
  lowercase: boolean
  uppercase: boolean
  specialChar: boolean
  match: boolean
}

const tradFR: Record<string, string> = {
  parent: "Parent",
  grand_parent: "Grand-parent",
  children: "Enfant",
  voluntary: "Volontaire",
  tutor: "Tuteur",
  employee: "Salarié",
  other: "Autre",
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  eleve_primaire: "Elève du primaire",
  collegien: "Collégien",
  lyceen: "Lycéen",
  etudiant: "Etudiant",
  benevole: "Bénévole",
  charge_de_mission: "Chargé(e) de mission",
}

const ROLE_ORDER = [
  "eleve_primaire",
  "collegien",
  "lyceen",
  "etudiant",
  "parent",
  "benevole",
  "charge_de_mission",
  "employee",
  "other",
]

const longPolicyText = privatePolicy

const PersonalUserRegisterForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [showSkills, setShowSkills] = useState(false)
  const [showAvailability, setShowAvailability] = useState(false)
  const [showSchools, setShowSchools] = useState(false)
  const [showCompanies, setShowCompanies] = useState(false)


  const navigate = useNavigate()

  const [user, setUser] = useState({
    email: "",
    password: "",
    passwordConfirmation: "",
    firstName: "",
    lastName: "",
    birthday: "",
    role: "",
    job: "",
    acceptPrivacyPolicy: false,
    proposeWorkshop: false, // <- NOUVEAU
    takeTrainee: false, // <- NOUVEAU
    companyName: ""
  })

  const [availability, setAvailability] = useState<availability>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    other: false,
  })

  const [skills, setSkills] = useState<SkillsState>({
    selectedSkills: [],
    selectedSubSkills: [],
  })
  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    minLength: false,
    lowercase: false,
    uppercase: false,
    specialChar: false,
    match: false,
  })

  const [skillList, setSkillList] = useState<{ id: number; name: string; displayName: string }[]>([])
  const [skillSubList, setSkillSubList] = useState<{ id: number; name: string; displayName: string; parent_skill_id: number }[]>([])

  // Use custom hook for company search with client-side infinite scroll
  const {
    displayedEntities: companies,
    loading: companiesLoading,
    error: companiesError,
    searchQuery: companyQuery,
    setSearchQuery: setCompanyQuery,
    scrollContainerRef: companyScrollRef,
    hasMore: hasMoreCompanies
  } = useClientSideSearch({
    fetchFunction: getCompanies,
    searchFields: ['name'],
    itemsPerPage: 20
  })

  // Use custom hook for school search with infinite scroll
  const {
    schools,
    loading: schoolsLoading,
    error: schoolsError,
    searchQuery: schoolQuery,
    setSearchQuery: setSchoolQuery,
    scrollContainerRef
  } = useSchoolSearch(20)

  const [selectedSchools, setSelectedSchools] = useState<number[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([])

  const [personalUserRoles, setPersonalUserRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([])

  const [selectedSchoolsList, setSelectedSchoolsList] = useState<{ id: number; name: string }[]>([])
  const [selectedCompaniesList, setSelectedCompaniesList] = useState<{ id: number; name: string }[]>([])

  // ⬇️ AJOUT : useEffect pour la validation du mot de passe
  useEffect(() => {
    const { password, passwordConfirmation } = user

    const minLength = password.length >= 8
    const lowercase = /[a-z]/.test(password)
    const uppercase = /[A-Z]/.test(password)
    const specialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    // Le match n'est vrai que si les deux sont identiques ET que le champ n'est pas vide
    const match = password.length > 0 && password === passwordConfirmation

    setPasswordCriteria({
      minLength,
      lowercase,
      uppercase,
      specialChar,
      match,
    })
  }, [user.password, user.passwordConfirmation])

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await getSkills()
        const data = response?.data?.data ?? response?.data ?? response ?? []
        if (Array.isArray(data)) {
          const normalized = data.map((s: any) => ({
            id: Number(s.id),
            name: s.name,
            displayName: translateSkill(s.name)
          }))
          setSkillList(normalized)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des compétences :", error)
      }
    }
    fetchSkills()
  }, [])





  useEffect(() => {
    if (skillList.length === 0) {
      setSkillSubList([])
      return
    }

    let mounted = true

    const fetchAllSubSkills = async () => {
      try {
        const promises = skillList.map(async (skill) => {
          const resp = await getSubSkills(skill.id)
          const data = resp?.data ?? resp ?? {}

          const subSkills = Array.isArray(data.sub_skills)
            ? data.sub_skills
            : Array.isArray(data.skill?.sub_skills)
              ? data.skill.sub_skills
              : []

          return subSkills.map((s: any) => ({
            id: Number(s.id),
            name: s.name,
            displayName: translateSubSkill(s.name),
            parent_skill_id: Number(skill.id),
          }))
        })

        const results = await Promise.all(promises)
        const flattened = results.flat()

        if (mounted) setSkillSubList(flattened)
      } catch (error) {
        console.error("Erreur lors du chargement des sous-compétences :", error)
      }
    }

    fetchAllSubSkills()

    return () => {
      mounted = false
    }
  }, [skillList])

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getPersonalUserRoles()
        const data = response?.data?.data ?? response?.data ?? response ?? []
        if (Array.isArray(data)) {
          const sortedData = data.sort((a: any, b: any) => {
            const indexA = ROLE_ORDER.indexOf(a.value)
            const indexB = ROLE_ORDER.indexOf(b.value)
            // If not found, put at the end
            const posA = indexA === -1 ? 999 : indexA
            const posB = indexB === -1 ? 999 : indexB
            return posA - posB
          })
          setPersonalUserRoles(sortedData)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des rôles :", error)
      }
    }
    fetchRoles()
  }, [])

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    let finalValue: string | boolean = value

    if (type === "checkbox") {
      finalValue = (e.target as HTMLInputElement).checked
    } else if (type === "radio" && (value === "true" || value === "false")) {
      // Convertit les chaînes "true"/"false" des radios en booléens
      finalValue = value === "true"
    }

    setUser((prev) => ({
      ...prev,
      [name]: finalValue,
    }))
  }

  const handleAvailabilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setAvailability((prev) => ({ ...prev, [name]: checked }))
  }



  const toggleSkill = (skillId: number) => {
    setSkills((prev) => {
      const already = prev.selectedSkills.includes(skillId)
      let newSkillIds = [...prev.selectedSkills]
      let newSubIds = [...prev.selectedSubSkills]

      if (already) {
        newSkillIds = newSkillIds.filter((id) => id !== skillId)
        const related = skillSubList.filter((s) => s.parent_skill_id === skillId).map((s) => s.id)
        newSubIds = newSubIds.filter((id) => !related.includes(id))
      } else {
        if (!newSkillIds.includes(skillId)) newSkillIds.push(skillId)
      }

      return { selectedSkills: newSkillIds, selectedSubSkills: newSubIds }
    })
  }

  const toggleSubSkill = (subSkillId: number, parentId: number) => {
    setSkills((prev) => {
      const already = prev.selectedSubSkills.includes(subSkillId)
      let newSubIds = [...prev.selectedSubSkills]
      const newSkillIds = [...prev.selectedSkills]

      if (already) {
        newSubIds = newSubIds.filter((id) => id !== subSkillId)
      } else {
        newSubIds.push(subSkillId)
        if (!newSkillIds.includes(parentId)) newSkillIds.push(parentId)
      }

      return { selectedSkills: newSkillIds, selectedSubSkills: newSubIds }
    })
  }

  const handleAddSchool = (schoolId: number) => {
    const school = schools.find((s) => s.id === schoolId)
    if (school && !selectedSchoolsList.some((s) => s.id === schoolId)) {
      setSelectedSchoolsList((prev) => [...prev, school])
      setSelectedSchools((prev) => [...prev, schoolId])
      setSchoolQuery("")
    }
  }

  const handleRemoveSchool = (schoolId: number) => {
    setSelectedSchoolsList((prev) => prev.filter((s) => s.id !== schoolId))
    setSelectedSchools((prev) => prev.filter((id) => id !== schoolId))
  }

  const handleAddCompany = (companyId: number) => {
    const company = companies.find((c) => c.id === companyId)
    if (company && !selectedCompaniesList.some((c) => c.id === companyId)) {
      setSelectedCompaniesList((prev) => [...prev, company])
      setSelectedCompanies((prev) => [...prev, companyId])
      setCompanyQuery("")
    }
  }

  const handleRemoveCompany = (companyId: number) => {
    setSelectedCompaniesList((prev) => prev.filter((c) => c.id !== companyId))
    setSelectedCompanies((prev) => prev.filter((id) => id !== companyId))
  }



  const isStep1Valid = () => {
    return user.firstName && user.lastName && user.email && user.password && user.passwordConfirmation && user.birthday
  }

  const isStep2Valid = () => {
    return user.role !== ""
  }

  const handleNext = () => {
    if (currentStep === 2 && isStep1Valid()) {
      setCurrentStep(3)
    } else if (currentStep === 1 && isStep2Valid()) {
      setCurrentStep(2)
    } else if (currentStep === 3) {
      if (showSkills && skills.selectedSkills.length === 0) return
      setCurrentStep(4)
    } else if (currentStep === 4) {
      if (showAvailability && !Object.values(availability).some(Boolean)) return
      setCurrentStep(5)
    } else if (currentStep === 5) {
      if (showSchools && selectedSchoolsList.length === 0) return
      setCurrentStep(6)
    } else if (currentStep === 6) {
      if (showCompanies && selectedCompaniesList.length === 0) return
      setCurrentStep(7)
    } else if (currentStep === 7) {
      setCurrentStep(8)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formData = {
      ...user,
      ...availability,
      ...skills,
      ...selectedSchools,
      ...selectedCompanies,

    }
    submitPersonalUserRegistration(formData)
      .then((response) => {
        console.log("Inscription réussie :", response)
        alert("Inscription réussie !")
        navigate("/login")
      })
      .catch((error) => {
        console.error("Erreur lors de l'inscription :", error)
        alert("Erreur lors de l'inscription. Veuillez réessayer.")
      })
  }

  return (
    <form onSubmit={handleSubmit} className="pur-form">
      <div className="form-header">
        <button type="button" onClick={onBack} className="back-button" title="Retour">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 className="pur-title">Inscription Utilisateur Personnel</h2>
      </div>

      <div className="form-step visible">
        <p>
          Cette application se conforme au Règlement Européen sur la Protection des Données Personnelles et à la loi
          informatique et Libertés du Nº78-17 du 6 janvier 1978. Responsable des traitements : DASEN pour les écoles
          publiques ou chef d'établissement pour les écoles privées. Traitements réalisés par Kinship en qualité de
          sous-traitant.
        </p>
        <p>
          Vous pouvez exercer vos droits sur les données qui vous concernent auprès du responsable des traitements.
        </p>
        <p>
          Vous pouvez également interpeller la <a href="https://www.cnil.fr/fr">CNIL</a> en tant qu'autorité de contrôle.
        </p>
        <p>
          Plus de détails sur le portail : <a href="/privacy-policy">Politique de protection des données de Kinship</a>
        </p>
      </div>

      {/* Step 1: Rôle avec boutons radio en grille */}
      {currentStep >= 1 && (
        <div className="form-step visible">
          <h3 className="step-title">Je suis un(e) :</h3>
          <div className="role-grid">
            {personalUserRoles.map((role) => (
              <label key={role.value} className={`role-option ${user.role === role.value ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={user.role === role.value}
                  onChange={handleUserChange}
                  required
                />
                <span className="role-label">{tradFR[role.value] || role.value}</span>
              </label>
            ))}
          </div>
        </div>
      )}


      {/* Step 2: Informations personnelles */}
      <div className={`form-step ${currentStep >= 2 ? "visible" : ""}`}>
        <h3 className="step-title">Mes Informations personnelles</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-field">
            <label className="form-label">Mon Prénom *</label>
            <input
              className="pur-input"
              type="text"
              name="firstName"
              placeholder="Votre prénom"
              value={user.firstName}
              onChange={handleUserChange}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Mon Nom *</label>
            <input
              className="pur-input"
              type="text"
              name="lastName"
              placeholder="Votre nom"
              value={user.lastName}
              onChange={handleUserChange}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Ma Date de naissance *</label>
            <input
              className="pur-input"
              type="date"
              name="birthday"
              value={user.birthday}
              onChange={handleUserChange}
              required
            />
            <p>Vous devez avoir plus de 13 ans pour vous inscrire</p>
          </div>



          <div className="form-field full-width">
            <label className="form-label">Email Personnel *</label>
            <input
              className="pur-input"
              type="email"
              name="email"
              placeholder="votre@email.com"
              value={user.email}
              onChange={handleUserChange}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Mot de passe *</label>
            <input
              className="pur-input"
              type="password"
              name="password"
              placeholder="••••••••"
              value={user.password}
              onChange={handleUserChange}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">Confirmation du mot de passe *</label>
            <input
              className="pur-input"
              type="password"
              name="passwordConfirmation"
              placeholder="••••••••"
              value={user.passwordConfirmation}
              onChange={handleUserChange}
              required
            />
          </div>

          <div className="password-criteria-list">
            <ul>
              <li className={passwordCriteria.minLength ? 'valid' : 'invalid'}>
                {passwordCriteria.minLength ? '✅' : '❌'} 8 caractères minimum
              </li>
              <li className={passwordCriteria.lowercase ? 'valid' : 'invalid'}>
                {passwordCriteria.lowercase ? '✅' : '❌'} Une lettre minuscule
              </li>
              <li className={passwordCriteria.uppercase ? 'valid' : 'invalid'}>
                {passwordCriteria.uppercase ? '✅' : '❌'} Une lettre majuscule
              </li>
              <li className={passwordCriteria.specialChar ? 'valid' : 'invalid'}>
                {passwordCriteria.specialChar ? '✅' : '❌'} Un caractère spécial (!@#...)
              </li>
              {/* On n'affiche le critère de match que si l'utilisateur a commencé à taper la confirmation */}
              {(user.password.length > 0 || user.passwordConfirmation.length > 0) && (
                <li className={passwordCriteria.match ? 'valid' : 'invalid'}>
                  {passwordCriteria.match ? '✅' : '❌'} Les mots de passe sont identiques
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Step 3: Compétences (step séparé avec toggle switch et grille 2 colonnes) */}
      {currentStep >= 3 && (
        <div className="form-step visible">
          <h3 className="step-title">Mes Compétences</h3>
          <label className="toggle-switch-form">
            <span>Je veux ajouter et montrer mes compétences</span>
            <input type="checkbox" checked={showSkills} onChange={(e) => setShowSkills(e.target.checked)} />
            <span className="toggle-slider"></span>
          </label>

          {showSkills && (
            <div className="pur-field">
              <div className="skills-inline-container">
                {skillList.map((skill) => {
                  const skillId = Number(skill.id)
                  const isSelected = skills.selectedSkills.includes(skillId)
                  const relatedSubs = skillSubList.filter((s) => s.parent_skill_id === skillId)

                  return (
                    <div key={skillId} className="skill-row">
                      <label className={`skill-checkbox-inline ${isSelected ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSkill(skillId)}
                        />
                        <span className="skill-name-inline">{skill.displayName}</span>
                      </label>

                      {isSelected && relatedSubs.length > 0 && (
                        <div className="subskills-inline">
                          {relatedSubs.map((sub) => {
                            const isSubSelected = skills.selectedSubSkills.includes(sub.id)
                            return (
                              <label
                                key={sub.id}
                                className={`subskill-checkbox-inline ${isSubSelected ? 'selected' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSubSelected}
                                  onChange={() => toggleSubSkill(sub.id, sub.parent_skill_id)}
                                />
                                <span className="subskill-name-inline">{sub.displayName}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Disponibilités (step séparé avec toggle switch) */}
      {currentStep >= 4 && (
        <div className="form-step visible">
          <h3 className="step-title">Mes Disponibilités</h3>
          <label className="toggle-switch-form">
            <span>Je suis disponible pour aider ou accompagner une organisation ou une école de mon réseau Kinship</span>
            <input type="checkbox" checked={showAvailability} onChange={(e) => setShowAvailability(e.target.checked)} />
            <span className="toggle-slider"></span>
          </label>

          {showAvailability && (
            <fieldset className="pur-fieldset">
              <div className="pur-availability">
                {Object.keys(availability).map((day) => (
                  <label key={day} className="pur-availability-item">
                    <input
                      type="checkbox"
                      name={day}
                      checked={(availability as any)[day]}
                      onChange={handleAvailabilityChange}
                    />
                    <span className="pur-capitalize">{tradFR[day]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

      {/* Step 5: Écoles (step séparé avec toggle switch) */}
      {currentStep >= 5 && (
        <div className="form-step visible">
          <h3 className="step-title">Je demande mon rattachement à un Établissement Scolaire</h3>
          <label className="toggle-switch-form">
            <span>Je demande mon rattachement à un établissement scolaire</span>
            <input type="checkbox" checked={showSchools} onChange={(e) => setShowSchools(e.target.checked)} />
            <span className="toggle-slider"></span>
          </label>

          {showSchools && (
            <fieldset className="pur-fieldset">
              <input
                type="text"
                className="pur-input"
                placeholder="Rechercher une école (nom, ville, code postal)..."
                value={schoolQuery}
                onChange={(e) => setSchoolQuery(e.target.value)}
              />
              {schoolQuery && (
                <div className="search-suggestions" ref={scrollContainerRef}>
                  {schoolsLoading && schools.length === 0 && (
                    <div className="suggestion-item">Chargement...</div>
                  )}

                  {schoolsError && (
                    <div className="suggestion-item error">{schoolsError}</div>
                  )}

                  {!schoolsLoading && schools.length === 0 && !schoolsError && (
                    <div className="suggestion-item">Aucune école trouvée</div>
                  )}

                  {schools.map((school) => (
                    <div
                      key={school.id}
                      className="suggestion-item"
                      onClick={() => handleAddSchool(school.id)}
                    >
                      <div className="suggestion-item-name">{school.name}</div>
                      {(school.city || school.zip_code) && (
                        <small className="suggestion-item-details">
                          {school.city} {school.zip_code}
                        </small>
                      )}
                    </div>
                  ))}

                  {schoolsLoading && schools.length > 0 && (
                    <div className="suggestion-item loading-more">Chargement...</div>
                  )}
                </div>
              )}
              <div className="selected-list">
                {selectedSchoolsList.map((school) => (
                  <div key={school.id} className="selected-item">
                    <span>{school.name}</span>
                    <button type="button" onClick={() => handleRemoveSchool(school.id)} className="remove-btn">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

      {/* Step 6: Entreprises (step séparé avec toggle switch) */}
      {currentStep >= 6 && (
        <div className="form-step visible">
          <h3 className="step-title">Mes Organisations</h3>
          <label className="toggle-switch-form">
            <span>Je demande mon rattachement à une organisation</span>
            <input type="checkbox" checked={showCompanies} onChange={(e) => setShowCompanies(e.target.checked)} />
            <span className="toggle-slider"></span>
          </label>

          {showCompanies && (
            <fieldset className="pur-fieldset">
              <input
                type="text"
                className="pur-input"
                placeholder="Rechercher une entreprise (nom)..."
                value={companyQuery}
                onChange={(e) => setCompanyQuery(e.target.value)}
              />
              {companyQuery && (
                <div className="search-suggestions" ref={companyScrollRef}>
                  {companiesLoading && companies.length === 0 && (
                    <div className="suggestion-item">Chargement...</div>
                  )}

                  {companiesError && (
                    <div className="suggestion-item error">{companiesError}</div>
                  )}

                  {!companiesLoading && companies.length === 0 && !companiesError && (
                    <div className="suggestion-item">Aucune entreprise trouvée</div>
                  )}

                  {companies.map((company) => (
                    <div
                      key={company.id}
                      className="suggestion-item"
                      onClick={() => handleAddCompany(company.id)}
                    >
                      <div className="suggestion-item-name">{company.name}</div>
                      {(company.city || company.zip_code || company.company_type) && (
                        <small className="suggestion-item-details">
                          {company.city && `${company.city} `}
                          {company.zip_code && `${company.zip_code} `}
                          {company.company_type?.name && `• ${company.company_type.name}`}
                        </small>
                      )}
                    </div>
                  ))}

                  {hasMoreCompanies && (
                    <div className="suggestion-item loading-more">Scroll pour plus...</div>
                  )}
                </div>
              )}
              <div className="selected-list">
                {selectedCompaniesList.map((company) => (
                  <div key={company.id} className="selected-item">
                    <span>{company.name}</span>
                    <button type="button" onClick={() => handleRemoveCompany(company.id)} className="remove-btn">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}



      {currentStep >= 7 && (
        <div className="form-step visible">
          <h3 className="step-title">Mes informations de réseau</h3>

          <fieldset className="pur-fieldset">
            <div className="form-field">
              <label className="form-label">Profession</label>
              <input
                className="pur-input"
                type="text"
                name="job"
                placeholder="Profession"
                value={user.job}
                onChange={handleUserChange}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Nom de votre entreprise</label>
              <input
                className="pur-input"
                type="text"
                name="companyName"
                placeholder="Profession"
                value={user.companyName}
                onChange={handleUserChange}
              />
            </div>

            <div className="form-field" style={{ marginTop: "20px" }}>
              <label className="form-label">
                Est-ce que je souhaite proposer des ateliers de découverte professionnelle ?
              </label>
              <div className="radio-group-inline">
                <label className="pur-radio-label">
                  <input
                    type="radio"
                    name="proposeWorkshop"
                    value="true"
                    checked={user.proposeWorkshop === true}
                    onChange={handleUserChange}
                  />
                  <span>Oui</span>
                </label>
                <label className="pur-radio-label">
                  <input
                    type="radio"
                    name="proposeWorkshop"
                    value="false"
                    checked={user.proposeWorkshop === false}
                    onChange={handleUserChange}
                  />
                  <span>Non</span>
                </label>
              </div>
            </div>

            <div className="form-field" style={{ marginTop: "20px" }}>
              <label className="form-label">
                Est-ce que mon entreprise peut prendre des jeunes en stage ?
              </label>
              <div className="radio-group-inline">
                <label className="pur-radio-label">
                  <input
                    type="radio"
                    name="takeTrainee"
                    value="true"
                    checked={user.takeTrainee === true}
                    onChange={handleUserChange}
                  />
                  <span>Oui</span>
                </label>
                <label className="pur-radio-label">
                  <input
                    type="radio"
                    name="takeTrainee"
                    value="false"
                    checked={user.takeTrainee === false}
                    onChange={handleUserChange}
                  />
                  <span>Non</span>
                </label>
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {currentStep >= 8 && (
        <div className="form-step visible">
          <h3 className="step-title">Politique de confidentialité</h3>
          <div className="privacy-policy-scroll-box">
            <pre>{longPolicyText}</pre>
            <button
              type="button"
              onClick={() => {
                navigate("/CGU")
              }}
              className="pur-button"
            >
              CGU
            </button>
          </div>

          <label className="checkbox-toggle">
            <input
              type="checkbox"
              name="acceptPrivacyPolicy"
              checked={user.acceptPrivacyPolicy}
              onChange={(e) =>
                setUser((prev) => ({
                  ...prev,
                  acceptPrivacyPolicy: e.target.checked,
                }))
              }
              required
            />
            <span>J'accepte la politique de confidentialité *</span>
          </label>
        </div>
      )}

      <div className="form-actions">
        {currentStep < 8 ? (
          <button
            type="button"
            onClick={handleNext}
            className="pur-button"
            disabled={
              (currentStep === 2 && !isStep1Valid()) ||
              (currentStep === 1 && !isStep2Valid()) ||
              (currentStep === 3 && showSkills && skills.selectedSkills.length === 0) ||
              (currentStep === 4 && showAvailability && !Object.values(availability).some(Boolean)) ||
              (currentStep === 5 && showSchools && selectedSchoolsList.length === 0) ||
              (currentStep === 6 && showCompanies && selectedCompaniesList.length === 0)
            }
          >
            Suivant
          </button>
        ) : (
          <button type="submit" className="pur-button" disabled={!user.acceptPrivacyPolicy}>
            S'inscrire
          </button>
        )}
      </div>
    </form>
  )
}

export default PersonalUserRegisterForm
