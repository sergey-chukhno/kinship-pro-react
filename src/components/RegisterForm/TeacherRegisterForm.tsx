"use client"

import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getTeacherRoles, getSkills, getSubSkills } from "../../api/RegistrationRessource"
import { submitTeacherRegistration } from "../../api/Authentication"
import { useSchoolSearch } from "../../hooks/useSchoolSearch"
import { useToast } from "../../hooks/useToast"
import { translateSkill, translateSubSkill } from "../../translations/skills"
import "./CommonForms.css"
import "./PersonalUserRegisterForm.css"
import { privatePolicy } from "../../data/PrivacyPolicy"

interface PasswordCriteria {
  minLength: boolean
  lowercase: boolean
  uppercase: boolean
  specialChar: boolean
  match: boolean
}

interface SkillsState {
  selectedSkills: number[]
  selectedSubSkills: number[]
}

const tradFR = {
  primary_school_teacher: "Enseignant du primaire",
  secondary_school_teacher: "Professeur de collège/lycée",
  education_rectorate_personnel: "Personnel du rectorat",
  administrative_staff: "Personnel administratif",
  cpe_student_life: "Conseiller Principal d'Education (CPE)",
  other_teacher: "Autres (Personnel de mission, MLDS,...)",
}

const ROLE_ORDER = [
  "primary_school_teacher",
  "secondary_school_teacher",
  "education_rectorate_personnel",
  "administrative_staff",
  "cpe_student_life",
  "other_teacher",
]

const TeacherRegisterForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [showSchools] = useState(true)
  const [showSkills, setShowSkills] = useState(false)

  const [user, setUser] = useState({
    email: "",
    password: "",
    passwordConfirmation: "",
    firstName: "",
    lastName: "",
    birthday: "",
    role: "",
    acceptPrivacyPolicy: false,
  })

  const longPolicyText = privatePolicy
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  // Friendly error mapper for registration
  const translateErrorMessage = (text: string): string => {
    const msg = (text || "").toLowerCase()
    if (msg.includes("teachers and school administrators must use an academic email address")) {
      return "Les enseignants et administrateurs scolaires doivent utiliser une adresse email académique."
    }
    if (msg.includes("email") || msg.includes("academic")) {
      return "Email invalide ou non académique. Utilisez une adresse académique (ex : prenom.nom@ac-academie.fr)."
    }
    if (msg.includes("age") || msg.includes("birthday") || msg.includes("birth")) {
      return "Date de naissance invalide ou âge minimum non respecté. Format attendu : AAAA-MM-JJ."
    }
    if (msg.includes("url") || msg.includes("website")) {
      return "URL invalide. Utilisez un format complet : https://www.exemple.fr"
    }
    return text
  }

  const formatRegistrationError = (error: any): string => {
    const errorsArray = error?.response?.data?.errors
    if (Array.isArray(errorsArray) && errorsArray.length > 0) {
      return errorsArray.map(translateErrorMessage).join("\n")
    }
    const backendMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || ""
    const translated = translateErrorMessage(backendMsg)
    return translated || "Erreur lors de l'inscription. Vérifiez les champs puis réessayez."
  }

  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    minLength: false,
    lowercase: false,
    uppercase: false,
    specialChar: false,
    match: false,
  })

  const [skills, setSkills] = useState<SkillsState>({
    selectedSkills: [],
    selectedSubSkills: [],
  })
  const [skillList, setSkillList] = useState<{ id: number; name: string; displayName: string }[]>([])
  const [skillSubList, setSkillSubList] = useState<{ id: number; name: string; displayName: string; parent_skill_id: number }[]>([])

  // Use custom hook for school search with infinite scroll
  const {
    schools,
    loading: schoolsLoading,
    error: schoolsError,
    searchQuery: schoolQuery,
    setSearchQuery: setSchoolQuery,
    scrollContainerRef
  } = useSchoolSearch(20)
  const [selectedSchoolsList, setSelectedSchoolsList] = useState<{ id: number; name: string }[]>([])
  const [teacherRoles, setTeacherRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([])

  // const handleSelectSchool = (id: number) => {
  //   const school = schools.find((s) => s.id === id)
  //   if (school) {
  //     if (selectedSchoolsList.some((s) => s.id === id)) {
  //       setSelectedSchoolsList((prev) => prev.filter((s) => s.id !== id))
  useEffect(() => {
    // This effect ensures that if a school is selected from the search results,
    // it's added to the selectedSchoolsList with its full details.
    // It also handles cases where schools might be pre-selected or loaded from elsewhere.
    // No direct fetching of all schools here, as useSchoolSearch handles that.
  }, [schools]) // Depend on schools from the hook to react to new search results

  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getTeacherRoles()
        let data: any[] = []
        
        if (response && Array.isArray(response.data)) {
          data = response.data
        } else if (response?.data?.data) {
          data = response.data.data
        } else if (response?.data) {
          data = response.data
        }
        
        // Filtrer le rôle "other" simple (ne garder que "other_teacher")
        const filteredData = data.filter((role: any) => role.value !== "other")
        
        const sortedData = filteredData.sort((a: any, b: any) => {
          const indexA = ROLE_ORDER.indexOf(a.value)
          const indexB = ROLE_ORDER.indexOf(b.value)
          const posA = indexA === -1 ? 999 : indexA
          const posB = indexB === -1 ? 999 : indexB
          return posA - posB
        })
        
        setTeacherRoles(sortedData)
      } catch (error) {
        console.error("Erreur lors du chargement des rôles :", error)
      }
    }

    fetchRoles()
  }, [])

  // ⬇️ AJOUT : useEffect pour la validation du mot de passe
  React.useEffect(() => {
    const { password, passwordConfirmation } = user

    const minLength = password.length >= 8
    const lowercase = /[a-z]/.test(password)
    const uppercase = /[A-Z]/.test(password)
    const specialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    // Le match n'est vrai que si les deux sont identiques ET que le champ n'est pas vide
    const match = password.length > 0 && password === passwordConfirmation

    setPasswordCriteria({
      minLength,
      lowercase,
      uppercase,
      specialChar,
      match,
    })
  }, [user])

  React.useEffect(() => {
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

  React.useEffect(() => {
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

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setUser((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleAddSchool = (schoolId: number) => {
    const school = schools.find((s) => s.id === schoolId)
    if (school && !selectedSchoolsList.some((s) => s.id === schoolId)) {
      setSelectedSchoolsList((prev) => [...prev, school])
      setSchoolQuery("")
    }
  }

  const handleRemoveSchool = (schoolId: number) => {
    setSelectedSchoolsList((prev) => prev.filter((s) => s.id !== schoolId))
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



  const isPersonalInfoValid = () => {
    return user.firstName && user.lastName && user.email && user.password && user.passwordConfirmation && user.birthday
  }

  const isRoleValid = () => {
    return user.role !== ""
  }

  const handleNext = () => {
    if (currentStep === 1 && isRoleValid()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && isPersonalInfoValid()) {
      setCurrentStep(3)
    } else if (currentStep === 3 && selectedSchoolsList.length > 0) {
      setCurrentStep(4)
    } else if (currentStep === 4) {
      if (showSkills && skills.selectedSkills.length === 0) return
      setCurrentStep(5)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    console.log("user", user)
    console.log("skills", skills)
    console.log("selectedSchoolsList", selectedSchoolsList)
    e.preventDefault()
    const formData = {
      ...user,
      ...skills,
      selectedSchoolsList
    }

    submitTeacherRegistration(formData)
      .then((response) => {
        console.log("Inscription réussie :", response)
        showSuccess("Inscription réussie !")
        navigate("/login")
      })
      .catch((error) => {
        console.error("Erreur lors de l'inscription :", error)
        showError(formatRegistrationError(error))
      })
  }

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <div className="form-header">
        <button type="button" onClick={onBack} className="back-button" title="Retour">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 className="form-title">Inscription Enseignant</h2>
      </div>

      <div className="visible form-step">
        <p>
          Cette application se conforme au Règlement Européen sur la Protection des Données Personnelles et à la loi informatique et Libertés du Nº78-17 du 6 janvier 1978.
          Responsable des traitements : DASEN pour les écoles publiques ou chef d'établissement pour les écoles privées. Traitements réalisés par Kinship en qualité de sous-traitant.
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

      {/* Step 1: Role Selection (Moved from Step 2) */}
      <div className={`form-step ${currentStep >= 1 ? "visible" : ""}`}>
        <h3 className="step-title">Je suis un(e) :</h3>
        <div className="role-grid">
          {teacherRoles.map((role) => (
            <label key={role.value} className={`role-option ${user.role === role.value ? "selected" : ""}`}>
              <input
                type="radio"
                name="role"
                value={role.value}
                checked={user.role === role.value}
                onChange={handleUserChange}
                required
              />
              <span className="role-label">{tradFR[role.value as keyof typeof tradFR] || role.value}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Step 2: Personal Information (Moved from Step 1) */}
      <div className={`form-step ${currentStep >= 2 ? "visible" : ""}`}>
        <h3 className="step-title">Mes Informations personnelles</h3>
        <div className="grid">
          <div className="form-field">
            <label className="form-label">Mon Prénom *</label>
            <input
              className="form-input"
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
              className="form-input"
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
              className="form-input"
              type="date"
              name="birthday"
              value={user.birthday}
              onChange={handleUserChange}
              required
            />
            <small style={{ color: "#6b7280", fontSize: "0.85rem" }}>Format JJ/MM/AAAA — âge minimum requis 13 ans</small>
          </div>

          <div className="form-field full-width">
            <label className="form-label">Adresse email académique *</label>
            <input
              className="form-input"
              type="email"
              name="email"
              placeholder="prenom.nom@ac-... .fr"
              value={user.email}
              onChange={handleUserChange}
              required
            />
            <small style={{ color: "#6b7280", fontSize: "0.85rem" }}>Utilisez une adresse académique (ex : prenom.nom@ac-academie.fr)</small>
          </div>

          <div className="form-field">
            <label className="form-label">Mot de passe *</label>
            <input
              className="form-input"
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
              className="form-input"
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

      {/* Step 3 */}
      {currentStep >= 3 && (
        <div className="visible form-step">
          <h3 className="step-title">Établissement Scolaire *</h3>

          <div className="pur-fieldset">
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
          </div>

        </div>
      )}

      {/* Step 4: Compétences (step séparé avec toggle switch et grille 2 colonnes) */}
      {currentStep >= 4 && (
        <div className="visible form-step">
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

      {/* Step 5 */}
      {currentStep >= 5 && (
        <div className="visible form-step">
          <h3 className="step-title">Politique de confidentialité</h3>
          <div className="privacy-policy-scroll-box !bg-white">
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
        {currentStep < 5 ? (
          <button
            type="button"
            onClick={handleNext}
            className="form-button success"
            disabled={
              (currentStep === 1 && !isRoleValid()) ||
              (currentStep === 2 && !isPersonalInfoValid()) ||
              (currentStep === 3 && showSchools && selectedSchoolsList.length === 0) ||
              (currentStep === 4 && showSkills && skills.selectedSkills.length === 0)
            }
          >
            Suivant
          </button>
        ) : (
          <button type="submit" className="form-button success" disabled={!user.acceptPrivacyPolicy}>
            S'inscrire
          </button>
        )}
      </div>
    </form>
  )
}

export default TeacherRegisterForm
