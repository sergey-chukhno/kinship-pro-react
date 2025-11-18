"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getSchoolRoles } from "../../api/RegistrationRessource"
import { submitSchoolRegistration } from "../../api/Authentication"
import "./CommonForms.css"
import { privatePolicy } from "../../data/PrivacyPolicy"

const tradFR = {
  education_director: "Directeur académique",
  principal: "Principal",
  school_director: "Directeur d'école",
  other: "Autre",
}

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
    acceptPrivacyPolicy: false,
  })

  const longPolicyText = privatePolicy
  const navigate = useNavigate()

  const [school, setSchool] = useState({
    schoolName: "",
    schoolCity: "",
    schoolZipCode: "",
    referentPhoneNumber: "",
  })

  const [schoolRoles, setSchoolRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([])

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getSchoolRoles()
        if (response && Array.isArray(response.data)) {
          setSchoolRoles(response.data)
        } else if (response?.data?.data) {
          setSchoolRoles(response.data.data)
        } else if (response?.data) {
          setSchoolRoles(response.data)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des rôles :", error)
      }
    }

    fetchRoles()
  }, [])

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setUser((prev) => ({ ...prev, [name]: value }))
  }

  const handleSchoolChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSchool((prev) => ({ ...prev, [name]: value }))
  }

  const isStep1Valid = () => {
    return user.firstName && user.lastName && user.email && user.password && user.passwordConfirmation && user.birthday
  }

  const isStep2Valid = () => {
    return user.role !== ""
  }

  const isStep3Valid = () => {
    return school.schoolName && school.schoolCity && school.schoolZipCode
  }

  const handleNext = () => {
    if (currentStep === 1 && isStep1Valid()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && isStep2Valid()) {
      setCurrentStep(3)
    } else if (currentStep === 3 && isStep3Valid()) {
      setCurrentStep(4)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = {
      ...user,
      ...school,
    }

    submitSchoolRegistration(formData)
      .then((response) => {
        console.log("Inscription réussie :", response)
        alert("Inscription réussie !")
      })
      .catch((error) => {
        console.error("Erreur lors de l'inscription :", error)
        alert("Erreur lors de l'inscription. Veuillez réessayer.")
      })
  }

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <div className="form-header">
        <button type="button" onClick={onBack} className="back-button">
          ← Retour
        </button>
        <h2 className="form-title">Inscription École</h2>
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

      <div className={`form-step ${currentStep >= 1 ? "visible" : ""}`}>
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
            <label className="form-label">Email Académique *</label>
            <input
              type="email"
              name="email"
              placeholder="votre@email-ecole.fr"
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
        </div>
      </div>

      {currentStep >= 2 && (
        <div className="form-step visible">
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
      )}

      {currentStep >= 3 && (
        <div className="form-step visible">
          <h3 className="step-title">Informations de l'établissement</h3>
          <div className="grid">
            <div className="form-field full-width">
              <label className="form-label">Nom de l'établissement *</label>
              <input
                type="text"
                name="schoolName"
                placeholder="Nom de votre établissement"
                value={school.schoolName}
                onChange={handleSchoolChange}
                required
                className="form-input"
              />
            </div>

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

            <div className="form-field full-width">
              <label className="form-label">Téléphone du référent (optionnel)</label>
              <input
                type="text"
                name="referentPhoneNumber"
                placeholder="+33 1 23 45 67 89"
                value={school.referentPhoneNumber}
                onChange={handleSchoolChange}
                className="form-input"
              />
            </div>
          </div>
        </div>
      )}

      {currentStep >= 4 && (
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
        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className="form-button purple"
            disabled={
              (currentStep === 1 && !isStep1Valid()) ||
              (currentStep === 2 && !isStep2Valid()) ||
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
