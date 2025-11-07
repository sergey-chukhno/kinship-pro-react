"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { getSchoolRoles } from "../../api/RegistrationRessource"
import { submitSchoolRegistration } from "../../api/Authentication"
import "./CommonForms.css"

const tradFR = {
  education_director: "Directeur académique",
  principal: "Principal",
  school_director: "Directeur d'école",
  other: "Autre",
}

const SchoolRegisterForm: React.FC = () => {
  const [user, setUser] = useState({
    email: "",
    password: "",
    passwordConfirmation: "",
    firstName: "",
    lastName: "",
    birthday: "",
    role: "school_director",
    acceptPrivacyPolicy: false,
  })

  const [school, setSchool] = useState({
    schoolName: "",
    schoolCity: "",
    schoolZipCode: "",
    referentPhoneNumber: "",
  })

  // Stocke les rôles retournés par l’API
  const [schoolRoles, setSchoolRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([])

  // Charge les rôles dès le montage
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getSchoolRoles() // Peut être un appel axios/fetch
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Prépare les données à envoyer
    const formData = {
      ...user,
      ...school,
    }

    // Appelle l'API pour soumettre le formulaire
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
      <h2 className="form-title" style={{ gridColumn: "1 / -1" }}>
        Inscription École
      </h2>

      {/* --- USER INFO --- */}
      <div className="form-field">
        <label className="form-label">Prénom *</label>
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
        <label className="form-label">Nom *</label>
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
        <label className="form-label">Email professionnel *</label>
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
        <label className="form-label">Confirmation *</label>
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

      <div className="form-field">
        <label className="form-label">Date de naissance *</label>
        <input
          type="date"
          name="birthday"
          value={user.birthday}
          onChange={handleUserChange}
          required
          className="form-input"
        />
      </div>

      <div className="form-field">
        <label className="form-label">Rôle *</label>
        <select name="role" value={user.role} onChange={handleUserChange} required className="form-select">
          <option value="">-- Choisir un rôle --</option>
          {schoolRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {tradFR[role.value as keyof typeof tradFR] || role.value}
            </option>
          ))}
        </select>
      </div>

      {/* --- SCHOOL INFO --- */}
      <fieldset className="form-fieldset" style={{ gridColumn: "1 / -1" }}>
        <legend className="form-legend">Informations de l'établissement</legend>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
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

          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
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
      </fieldset>

      <label className="form-privacy-label" style={{ gridColumn: "1 / -1" }}>
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
        J'accepte la politique de confidentialité
      </label>

      <button type="submit" className="form-button purple" style={{ gridColumn: "1 / -1" }}>
        S'inscrire
      </button>
    </form>
  )
}

export default SchoolRegisterForm
