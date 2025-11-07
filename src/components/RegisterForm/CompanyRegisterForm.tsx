"use client"

import React, { useState } from "react"
import { getCompanyRoles } from "../../api/RegistrationRessource"
import { submitCompanyRegistration } from "../../api/Authentication"
import "./CommonForms.css"

const tradFR = {
  association_president: "Président d'association",
  company_director: "Directeur d'entreprise",
  organization_head: "Directeur d'organisation",
  other: "Autre",
}

const CompanyRegisterForm: React.FC = () => {
  const [user, setUser] = useState({
    email: "",
    password: "",
    passwordConfirmation: "",
    firstName: "",
    lastName: "",
    birthday: "",
    role: "company_director",
    acceptPrivacyPolicy: false,
  })

  const [company, setCompany] = useState({
    companyName: "",
    companyDescription: "",
    companyTypeId: 1,
    companyCity: "",
    companyZipCode: "",
    referentPhoneNumber: "",
    branchRequestToCompanyId: undefined,
  })

  // Stocke les rôles retournés par l'API
  const [companyRoles, setCompanyRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([])

  // Charge les rôles dès le montage
  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getCompanyRoles() // Peut être un appel axios/fetch
        if (response && Array.isArray(response.data)) {
          setCompanyRoles(response.data)
        } else if (response?.data?.data) {
          setCompanyRoles(response.data.data)
        } else if (response?.data) {
          setCompanyRoles(response.data)
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

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCompany((prev) => ({
      ...prev,
      [name]:
        name === "company_type_id"
          ? Number(value)
          : name === "branch_request_to_company_id" && value === ""
            ? undefined
            : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = {
      ...user,
      ...company,
    }
    console.log("Données du formulaire :", formData)
    submitCompanyRegistration(formData)
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
    <form
      onSubmit={handleSubmit}
      className="form-container"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}
    >
      <h2 className="form-title" style={{ gridColumn: "1 / -1" }}>
        Inscription Entreprise
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
          {companyRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {tradFR[role.value as keyof typeof tradFR] || role.value}
            </option>
          ))}
        </select>
      </div>

      {/* --- COMPANY INFO --- */}
      <fieldset className="form-fieldset" style={{ gridColumn: "1 / -1" }}>
        <legend className="form-legend">Informations de l'entreprise</legend>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
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
            <label className="form-label">Type d'entreprise</label>
            <select
              name="companyTypeId"
              value={company.companyTypeId}
              onChange={handleCompanyChange}
              className="form-select"
            >
              <option value={1}>Entreprise</option>
              <option value={2}>Établissement éducatif</option>
              <option value={3}>Association</option>
            </select>
          </div>

          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Description</label>
            <textarea
              name="companyDescription"
              placeholder="Description de l'entreprise"
              value={company.companyDescription}
              onChange={handleCompanyChange}
              rows={3}
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
            <label className="form-label">Téléphone du référent</label>
            <input
              type="text"
              name="referentPhoneNumber"
              placeholder="+33 6 12 34 56 78"
              value={company.referentPhoneNumber}
              onChange={handleCompanyChange}
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">ID entreprise mère (optionnel)</label>
            <input
              type="number"
              name="branchRequestToCompanyId"
              placeholder="ID de l'entreprise mère"
              value={company.branchRequestToCompanyId ?? ""}
              onChange={handleCompanyChange}
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

export default CompanyRegisterForm
