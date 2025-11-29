"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getSchoolRoles } from "../../api/RegistrationRessource"
import { submitSchoolRegistration } from "../../api/Authentication"
import "./CommonForms.css"
import "./PersonalUserRegisterForm.css"
import { privatePolicy } from "../../data/PrivacyPolicy"
import { useSchoolSearch } from "../../hooks/useSchoolSearch"
import { useToast } from "../../hooks/useToast"

interface PasswordCriteria {
  minLength: boolean
  lowercase: boolean
  uppercase: boolean
  specialChar: boolean
  match: boolean
}

const tradFR = {
  directeur_ecole: "Directeur d'Ecole",
  directeur_academique: "Directeur Académique",
  principal: "Principal",
  proviseur: "Proviseur",
  responsable_academique: "Responsable Académique",
  other_school_admin: "Autre",
}

const ROLE_ORDER = [
  "directeur_ecole",
  "directeur_academique",
  "principal",
  "proviseur",
  "responsable_academique",
  "other_school_admin",
]

const SchoolRegisterForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1)

  const [user, setUser] = useState({
    email: "",
    password: "",
    passwordConfirmation: "",
    firstName: "",
    lastName: "",
    birthday: "",
    role: "",
    roleAdditionalInfo: "",
    acceptPrivacyPolicy: false,
  })

  const longPolicyText = privatePolicy
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    minLength: false,
    lowercase: false,
    uppercase: false,
    specialChar: false,
    match: false,
  })

  const [school, setSchool] = useState({
    schoolName: "",
    schoolCity: "",
    schoolZipCode: "",
    referentPhoneNumber: "",
    uaiCode: "",
    schoolId: undefined as number | undefined,
    schoolType: undefined as string | undefined,
  })

  const [schoolRoles, setSchoolRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([])

  // Use custom hook for school search with infinite scroll
  const {
    schools,
    loading: schoolsLoading,
    error: schoolsError,
    searchQuery: schoolQuery,
    setSearchQuery: setSchoolQuery,
    scrollContainerRef
  } = useSchoolSearch(20)

  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isCreatingNewSchool, setIsCreatingNewSchool] = useState(false)

  const handleSelectSchool = (schoolId: number) => {
    const selectedSchool = schools.find((s) => s.id === schoolId)
    if (selectedSchool) {
      setSchool((prev) => ({
        ...prev,
        schoolName: selectedSchool.name,
        schoolCity: selectedSchool.city || "",
        schoolZipCode: selectedSchool.zip_code || "",
        schoolId: selectedSchool.id,
        schoolType: selectedSchool.school_type || undefined,
      }))
      setSchoolQuery(selectedSchool.name)
      setShowSuggestions(false)
      setIsCreatingNewSchool(false)
      // Si le rôle est "other_school_admin", mettre à jour role_additional_information
      if (user.role === "other_school_admin" && selectedSchool.name) {
        setUser((prevUser) => ({
          ...prevUser,
          roleAdditionalInfo: `Responsable du ${selectedSchool.name}`,
        }))
      }
    }
  }

  const handleCreateNewSchool = () => {
    // Réinitialiser schoolId pour indiquer qu'on crée une nouvelle école
    setSchool((prev) => ({
      ...prev,
      schoolId: undefined,
    }))
    setShowSuggestions(false)
    setIsCreatingNewSchool(true)
    // Si le rôle est "other_school_admin", mettre à jour role_additional_information
    if (user.role === "other_school_admin" && schoolQuery) {
      setUser((prevUser) => ({
        ...prevUser,
        roleAdditionalInfo: `Responsable du ${schoolQuery}`,
      }))
    }
  }

  const handleCancelSchoolSelection = () => {
    // Réinitialiser la sélection de l'école
    setSchool((prev) => ({
      ...prev,
      schoolName: "",
      schoolCity: "",
      schoolZipCode: "",
      schoolId: undefined,
      schoolType: undefined,
      referentPhoneNumber: "",
      uaiCode: "",
    }))
    setSchoolQuery("")
    setIsCreatingNewSchool(false)
    setShowSuggestions(false)
    // Réinitialiser role_additional_information si nécessaire
    if (user.role === "other_school_admin") {
      setUser((prevUser) => ({
        ...prevUser,
        roleAdditionalInfo: "",
      }))
    }
  }

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
    const fetchRoles = async () => {
      try {
        const response = await getSchoolRoles()
        let data: any[] = []
        
        if (response && Array.isArray(response.data)) {
          data = response.data
        } else if (response?.data?.data) {
          data = response.data.data
        } else if (response?.data) {
          data = response.data
        }
        
        // Filtrer le rôle "other" simple (ne garder que "other_school_admin")
        const filteredData = data.filter((role: any) => role.value !== "other")
        
        const sortedData = filteredData.sort((a: any, b: any) => {
          const indexA = ROLE_ORDER.indexOf(a.value)
          const indexB = ROLE_ORDER.indexOf(b.value)
          const posA = indexA === -1 ? 999 : indexA
          const posB = indexB === -1 ? 999 : indexB
          return posA - posB
        })
        
        setSchoolRoles(sortedData)
      } catch (error) {
        console.error("Erreur lors du chargement des rôles :", error)
      }
    }

    fetchRoles()
  }, [])

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setUser((prev) => {
      const updated = { ...prev, [name]: value }
      // Si le rôle est "other_school_admin" et qu'on a un nom d'école, générer automatiquement role_additional_information
      if (name === "role" && value === "other_school_admin" && school.schoolName) {
        updated.roleAdditionalInfo = `Responsable du ${school.schoolName}`
      } else if (name === "role" && value !== "other_school_admin") {
        updated.roleAdditionalInfo = ""
      }
      return updated
    })
  }

  const handleSchoolChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSchool((prev) => {
      const updated = { ...prev, [name]: value }
      // Si le rôle est "other_school_admin" et que le nom de l'école change, mettre à jour role_additional_information
      if (name === "schoolName" && user.role === "other_school_admin" && value) {
        setUser((prevUser) => ({
          ...prevUser,
          roleAdditionalInfo: `Responsable du ${value}`,
        }))
      }
      return updated
    })
  }

  const isPersonalInfoValid = () => {
    return user.firstName && user.lastName && user.email && user.password && user.passwordConfirmation && user.birthday
  }

  const isRoleValid = () => {
    return user.role !== ""
  }

  const isStep3Valid = () => {
    if (school.schoolId) {
      // Si une école est sélectionnée, on a juste besoin du nom
      return school.schoolName
    } else {
      // Si on crée une nouvelle école, on a besoin de tous les champs
      return school.schoolName && school.schoolCity && school.schoolZipCode && school.uaiCode && school.referentPhoneNumber
    }
  }

  const handleNext = () => {
    if (currentStep === 1 && isRoleValid()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && isPersonalInfoValid()) {
      setCurrentStep(3)
    } else if (currentStep === 3 && isStep3Valid()) {
      setCurrentStep(4)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("user", user)
    console.log("school", school)
    const formData = {
      ...user,
      ...school,
    }

    submitSchoolRegistration(formData)
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
        <h2 className="form-title">Inscription École</h2>
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
          {schoolRoles.map((role) => (
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
          </div>

          <div className="form-field full-width">
            <label className="form-label">Email académique *</label>
            <input
              type="email"
              name="email"
              placeholder="prenom.nom@ac-... .fr"
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
        <div className="visible form-step">
          <h3 className="step-title">Informations de l'établissement</h3>
          <div className="grid">
            <div className="form-field full-width">
              <label className="form-label">Nom de l'établissement *</label>
              {school.schoolId && (
                <div style={{
                  marginBottom: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#E8F5E9',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#2E7D32',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>✓ École sélectionnée : {school.schoolName}</span>
                  <button
                    type="button"
                    onClick={handleCancelSchoolSelection}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#DC3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    Annuler
                  </button>
                </div>
              )}
              {isCreatingNewSchool && !school.schoolId && (
                <div style={{
                  marginBottom: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#6B46C1'
                }}>
                  ✓ Vous créez une nouvelle école. Veuillez remplir tous les champs ci-dessous.
                </div>
              )}
              <div className="search-container">
                <input
                  type="text"
                  name="schoolName"
                  placeholder="Rechercher votre établissement..."
                  value={schoolQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    setSchoolQuery(value)
                    setSchool((prev) => ({ ...prev, schoolName: value }))
                    setShowSuggestions(true)
                    setIsCreatingNewSchool(false)
                    // Si le rôle est "other_school_admin", mettre à jour role_additional_information
                    if (user.role === "other_school_admin" && value) {
                      setUser((prevUser) => ({
                        ...prevUser,
                        roleAdditionalInfo: `Responsable du ${value}`,
                      }))
                    }
                  }}
                  onFocus={() => {
                    if (!isCreatingNewSchool && !school.schoolId) {
                      setShowSuggestions(true)
                    }
                  }}
                  onBlur={(e) => {
                    // Ne pas fermer les suggestions immédiatement pour permettre le clic sur le bouton
                    setTimeout(() => {
                      if (!isCreatingNewSchool && !school.schoolId) {
                        setShowSuggestions(false)
                      }
                    }, 200)
                  }}
                  disabled={!!school.schoolId}
                  required
                  className="form-input"
                  style={school.schoolId ? { backgroundColor: '#F3F4F6', cursor: 'not-allowed' } : {}}
                />
                {showSuggestions && schoolQuery && !isCreatingNewSchool && (
                  <div className="search-suggestions" ref={scrollContainerRef}>
                    {schoolsLoading && schools.length === 0 && (
                      <div className="suggestion-item">Chargement...</div>
                    )}

                    {schoolsError && (
                      <div className="suggestion-item error">{schoolsError}</div>
                    )}

                    {!schoolsLoading && schools.length === 0 && !schoolsError && (
                      <div className="suggestion-item">
                        <div style={{ marginBottom: '8px' }}>Aucune école trouvée</div>
                        <button
                          type="button"
                          onClick={handleCreateNewSchool}
                          className="create-school-button"
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            backgroundColor: '#6B46C1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          Créer une nouvelle école avec ce nom
                        </button>
                      </div>
                    )}

                    {schools.map((s) => (
                      <div
                        key={s.id}
                        className="suggestion-item"
                        onClick={() => handleSelectSchool(s.id)}
                      >
                        <div className="suggestion-item-name">{s.name}</div>
                        {(s.city || s.zip_code) && (
                          <small className="suggestion-item-details">
                            {s.city} {s.zip_code}
                          </small>
                        )}
                      </div>
                    ))}

                    {schoolsLoading && schools.length > 0 && (
                      <div className="suggestion-item loading-more">Chargement...</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!school.schoolId && (
              <>
                <div className="form-field">
                  <label className="form-label">Ville *</label>
                  <input
                    type="text"
                    name="schoolCity"
                    placeholder="Ville"
                    value={school.schoolCity}
                    onChange={handleSchoolChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Code postal *</label>
                  <input
                    type="text"
                    name="schoolZipCode"
                    placeholder="Code postal"
                    value={school.schoolZipCode}
                    onChange={handleSchoolChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Code UAI *</label>
                  <input
                    className="form-input"
                    type="text"
                    name="uaiCode"
                    placeholder="Code UAI"
                    value={school.uaiCode}
                    onChange={handleSchoolChange}
                    required
                  />
                  <p>7 chiffres et 1 lettre</p>
                </div>

                <div className="form-field full-width">
                  <label className="form-label">Téléphone du référent *</label>
                  <input
                    type="text"
                    name="referentPhoneNumber"
                    placeholder="+33 6 12 34 56 78"
                    value={school.referentPhoneNumber}
                    onChange={handleSchoolChange}
                    required
                    className="form-input"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {currentStep >= 4 && (
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
        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className="form-button purple"
            disabled={
              (currentStep === 1 && !isRoleValid()) ||
              (currentStep === 2 && !isPersonalInfoValid()) ||
              (currentStep === 3 && !isStep3Valid())
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

export default SchoolRegisterForm
