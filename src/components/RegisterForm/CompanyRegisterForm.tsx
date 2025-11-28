"use client"

import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCompanyRoles, getCompanyTypes, getSkills, getSubSkills } from "../../api/RegistrationRessource"
import { submitCompanyRegistration } from "../../api/Authentication"
import { translateSkill, translateSubSkill } from "../../translations/skills"
import { privatePolicy } from "../../data/PrivacyPolicy"
import { useToast } from "../../hooks/useToast"
import "./CommonForms.css"
import "./PersonalUserRegisterForm.css"

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
  president_association: "Président d'Association",
  president_fondation: "Président de Fondation",
  directeur_organisation: "Directeur d'Organisation",
  directeur_entreprise: "Directeur d'Entreprise",
  responsable_rh_formation_secteur: "Responsable: RH, Formation, Secteur",
  other: "Autre",
}

const ROLE_ORDER = [
  "president_association",
  "president_fondation",
  "directeur_organisation",
  "directeur_entreprise",
  "responsable_rh_formation_secteur",
  "responsable_rh_formation_secteur",
  "other",
]

const COMPANY_TYPES_TRANSLATIONS: Record<string, string> = {
  "Association": "Association",
  "Educational City": "Cité éducative",
  "Enterprise": "Entreprise",
  "Foundation": "Fondation",
  "Local Authority": "Collectivité",
  "Metropolis": "Métropole",
  "Rectorate": "Rectorat",
  "Other": "Autre"
}

const CompanyRegisterForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1)
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

  const [company, setCompany] = useState({
    companyName: "",
    companyDescription: "",
    companyTypeId: 1,
    companyCity: "",
    companyZipCode: "",
    referentPhoneNumber: "",
    siretNumber: "",
    companyEmail: "",
    website: "",
    proposeWorkshop: false, // <- NOUVEAU
    takeTrainee: false, // <- NOUVEAU
    companyTypeAdditionalInfo: "",
  })

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
  const [companyTypes, setCompanyTypes] = useState<{ id: number; name: string; requires_additional_info: boolean }[]>([])

  const [companyRoles, setCompanyRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([])

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
    const fetchCompanyTypes = async () => {
      try {
        const response = await getCompanyTypes()
        const data = response?.data?.data ?? response?.data ?? response ?? []
        if (Array.isArray(data)) {
          const normalized = data.map((s: any) => ({
            id: Number(s.id),
            name: s.name,
            requires_additional_info: s.requires_additional_info
          }))

          const sorted = normalized.sort((a, b) => {
            if (a.name === "Other") return 1;
            if (b.name === "Other") return -1;
            return COMPANY_TYPES_TRANSLATIONS[a.name].localeCompare(COMPANY_TYPES_TRANSLATIONS[b.name]);
          });

          setCompanyTypes(sorted)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des compétences :", error)
      }
    }

    fetchCompanyTypes()
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

  // ⬇️ AJOUT : useEffect pour la validation du mot de passe
  React.useEffect(() => {
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

  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getCompanyRoles()
        if (response && Array.isArray(response.data)) {
          const data = response.data
          const sortedData = data.sort((a: any, b: any) => {
            const indexA = ROLE_ORDER.indexOf(a.value)
            const indexB = ROLE_ORDER.indexOf(b.value)
            const posA = indexA === -1 ? 999 : indexA
            const posB = indexB === -1 ? 999 : indexB
            return posA - posB
          })
          setCompanyRoles(sortedData)
        } else if (response?.data?.data) {
          const data = response.data.data
          const sortedData = data.sort((a: any, b: any) => {
            const indexA = ROLE_ORDER.indexOf(a.value)
            const indexB = ROLE_ORDER.indexOf(b.value)
            const posA = indexA === -1 ? 999 : indexA
            const posB = indexB === -1 ? 999 : indexB
            return posA - posB
          })
          setCompanyRoles(sortedData)
        } else if (response?.data) {
          const data = response.data
          const sortedData = data.sort((a: any, b: any) => {
            const indexA = ROLE_ORDER.indexOf(a.value)
            const indexB = ROLE_ORDER.indexOf(b.value)
            const posA = indexA === -1 ? 999 : indexA
            const posB = indexB === -1 ? 999 : indexB
            return posA - posB
          })
          setCompanyRoles(sortedData)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des rôles :", error)
      }
    }

    fetchRoles()
  }, [])

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

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setUser((prev) => ({ ...prev, [name]: value }))
  }

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    setCompany((prev) => {
      // Logique pour déterminer la nouvelle valeur
      let newValue: string | number | boolean | undefined = value

      if (name === "companyTypeId") {
        newValue = Number(value)
      } else if (name === "branchRequestToCompanyId" && value === "") {
        newValue = undefined
      }
      // AJOUT DE CETTE CONDITION : Conversion en booléen pour les radio buttons
      else if (name === "proposeWorkshop" || name === "takeTrainee") {
        newValue = value === "true"
      }

      return {
        ...prev,
        [name]: newValue,
      }
    })
  }

  const isPersonalInfoValid = () => {
    return user.firstName && user.lastName && user.email && user.password && user.passwordConfirmation && user.birthday
  }

  const isRoleValid = () => {
    return user.role !== ""
  }

  const isStep3Valid = () => {
    return company.companyName && company.companyCity && company.companyZipCode
  }

  const handleNext = () => {
    if (currentStep === 1 && isRoleValid()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && isPersonalInfoValid()) {
      setCurrentStep(3)
    } else if (currentStep === 3 && isStep3Valid()) {
      setCurrentStep(4)
    } else if (currentStep === 4) {
      if (showSkills && skills.selectedSkills.length === 0) return
      setCurrentStep(5)
    } else if (currentStep === 5) {
      setCurrentStep(6)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = {
      ...user,
      ...company,
      ...skills,
    }
    submitCompanyRegistration(formData)
      .then((response) => {
        console.log("Inscription réussie :", response)
        showSuccess("Inscription réussie !")
        navigate("/login")
      })
      .catch((error) => {
        console.error("Erreur lors de l'inscription :", error)
        showError("Erreur lors de l'inscription. Veuillez réessayer.")
      })
  }

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <div className="form-header">
        <button type="button" onClick={onBack} className="back-button" title="Retour">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 className="form-title">Inscription Organisation</h2>
      </div>

      <div className="form-step visible">
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
          {companyRoles.map((role) => (
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
              type="text"
              name="firstName"
              placeholder="Votre prénom"
              value={user.firstName}
              onChange={handleUserChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Mon Nom *</label>
            <input
              type="text"
              name="lastName"
              placeholder="Votre nom"
              value={user.lastName}
              onChange={handleUserChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Ma Date de naissance *</label>
            <input
              type="date"
              name="birthday"
              value={user.birthday}
              onChange={handleUserChange}
              required
              className="form-input"
            />
            <p>Vous devez avoir plus de 13 ans pour vous inscrire</p>
          </div>

          <div className="form-field full-width">
            <label className="form-label">Email professionnel *</label>
            <input
              type="email"
              name="email"
              placeholder="votre@email-entreprise.fr"
              value={user.email}
              onChange={handleUserChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Mot de passe *</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={user.password}
              onChange={handleUserChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Confirmation du mot de passe *</label>
            <input
              type="password"
              name="passwordConfirmation"
              placeholder="••••••••"
              value={user.passwordConfirmation}
              onChange={handleUserChange}
              required
              className="form-input"
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

      {currentStep >= 3 && (
        <div className="form-step visible">
          <h3 className="step-title">Informations de l'entreprise</h3>
          <div className="grid">
            <div className="form-field">
              <label className="form-label">Nom de l'entreprise *</label>
              <input
                type="text"
                name="companyName"
                placeholder="Nom de votre entreprise"
                value={company.companyName}
                onChange={handleCompanyChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Type d'organisation</label>
              <select
                name="companyTypeId"
                value={company.companyTypeId}
                onChange={handleCompanyChange}
                className="form-select"
              >
                {/* Option par défaut (recommandé) */}
                <option value="">Sélectionnez un type</option>

                {/* 3. Boucle sur les données récupérées */}
                {companyTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {COMPANY_TYPES_TRANSLATIONS[type.name] || type.name}
                  </option>
                ))}
              </select>
            </div>

            {companyTypes.find(t => t.id === company.companyTypeId)?.requires_additional_info && (
              <div className="form-field">
                <label className="form-label">Informations complémentaires *</label>
                <input
                  type="text"
                  name="companyTypeAdditionalInfo"
                  placeholder="Précisez le type d'organisation"
                  value={company.companyTypeAdditionalInfo}
                  onChange={handleCompanyChange}
                  required
                  className="form-input"
                />
              </div>
            )}

            <div className="form-field full-width">
              <label className="form-label">Description *</label>
              <textarea
                name="companyDescription"
                placeholder="Description de l'entreprise"
                value={company.companyDescription}
                onChange={handleCompanyChange}
                rows={3}
                required
                className="form-textarea"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Ville *</label>
              <input
                type="text"
                name="companyCity"
                placeholder="Ville"
                value={company.companyCity}
                onChange={handleCompanyChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Code postal *</label>
              <input
                type="text"
                name="companyZipCode"
                placeholder="Code postal"
                value={company.companyZipCode}
                onChange={handleCompanyChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Téléphone du référent *</label>
              <input
                type="text"
                name="referentPhoneNumber"
                placeholder="+33 6 12 34 56 78"
                value={company.referentPhoneNumber}
                onChange={handleCompanyChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Numero de SIRET *</label>
              <input
                type="text"
                name="siretNumber"
                placeholder="Numero de SIRET"
                value={company.siretNumber ?? ""}
                onChange={handleCompanyChange}
                required
                className="form-input"
              />
              <p>14 chiffres</p>
            </div>

            <div className="form-field">
              <label className="form-label">Adresse email de l'organisation *</label>
              <input
                type="email"
                name="companyEmail"
                placeholder="contact@entreprise.fr"
                value={company.companyEmail}
                onChange={handleCompanyChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Site Internet de l'organisation</label>
              <input
                type="text"
                name="website"
                placeholder="https://"
                value={company.website ?? ""}
                onChange={handleCompanyChange}
                className="form-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Compétences (step séparé avec toggle switch et grille 2 colonnes) */}
      {currentStep >= 4 && (
        <div className="form-step visible">
          <h3 className="step-title">Mes Compétences</h3>
          <label className="toggle-switch-form">
            <span>Je veux ajouter les compétences de mon organisation</span>
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

      {currentStep >= 5 && (
        <div className="form-step visible">
          <h3 className="step-title">Mes informations de réseau</h3>

          <fieldset className="pur-fieldset">

            <div className="form-field" style={{ marginTop: "20px" }}>
              <label className="form-label">
                Est-ce que vous souhaitez proposez des ateliers de découverte professionnelle ?
              </label>
              <div className="radio-group-inline">
                <label className="pur-radio-label">
                  <input
                    type="radio"
                    name="proposeWorkshop"
                    value="true"
                    checked={company.proposeWorkshop === true}
                    onChange={handleCompanyChange}
                  />
                  <span>Oui</span>
                </label>
                <label className="pur-radio-label">
                  <input
                    type="radio"
                    name="proposeWorkshop"
                    value="false"
                    checked={company.proposeWorkshop === false}
                    onChange={handleCompanyChange}
                  />
                  <span>Non</span>
                </label>
              </div>
            </div>

            <div className="form-field" style={{ marginTop: "20px" }}>
              <label className="form-label">
                Est-ce que vous souhaitez prendre des jeunes en stage ?
              </label>
              <div className="radio-group-inline">
                <label className="pur-radio-label">
                  <input
                    type="radio"
                    name="takeTrainee"
                    value="true"
                    checked={company.takeTrainee === true}
                    onChange={handleCompanyChange}
                  />
                  <span>Oui</span>
                </label>
                <label className="pur-radio-label">
                  <input
                    type="radio"
                    name="takeTrainee"
                    value="false"
                    checked={company.takeTrainee === false}
                    onChange={handleCompanyChange}
                  />
                  <span>Non</span>
                </label>
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {currentStep >= 6 && (
        <div className="form-step visible">
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
        {currentStep < 6 ? (
          <button
            type="button"
            onClick={handleNext}
            className="form-button purple"
            disabled={
              (currentStep === 1 && !isRoleValid()) ||
              (currentStep === 2 && !isPersonalInfoValid()) ||
              (currentStep === 3 && !isStep3Valid()) ||
              (currentStep === 4 && showSkills && skills.selectedSkills.length === 0)
            }
          >
            Suivant
          </button>
        ) : (
          <button type="submit" className="form-button purple" disabled={!user.acceptPrivacyPolicy}>
            S'inscrire
          </button>
        )}
      </div>
    </form>
  )
}

export default CompanyRegisterForm
