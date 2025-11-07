"use client"

import React, { useEffect, useState } from "react"
import { getTeacherRoles, getSchools } from "../../api/RegistrationRessource"
import { submitTeacherRegistration } from "../../api/Authentication"
import "./CommonForms.css"
import "./PersonalUserRegisterForm.css"

interface availability {
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  other: boolean
}

const tradFR = {
  school_teacher: "Professeur des écoles",
  college_lycee_professor: "Professeur de collège/lycée",
  teaching_staff: "Personnel enseignant",
  other: "Autre",
}

const TeacherRegisterForm: React.FC = () => {
  const [user, setUser] = useState({
    email: "",
    password: "",
    passwordConfirmation: "",
    firstName: "",
    lastName: "",
    birthday: "",
    role: "school_teacher",
    acceptPrivacyPolicy: false,
  })

  const [availability, setAvailability] = useState<availability>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    other: false,
  })

  const [schools, setSchools] = useState<{ id: number; name: string }[]>([])
  const [schoolQuery, setSchoolQuery] = useState("")
  const [selectedSchools, setSelectedSchools] = useState<number[]>([])

  const handleSelectSchool = (id: number) => {
    setSelectedSchools((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const filteredSchools = schools.filter((s) => s.name.toLowerCase().includes(schoolQuery.toLowerCase()))

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await getSchools()
        const data = response?.data?.data ?? response?.data ?? response ?? []
        if (Array.isArray(data)) {
          // Normalise les ids en number
          const normalized = data.map((s: any) => ({ id: Number(s.id), name: s.name }))
          setSchools(normalized)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des écoles :", error)
      }
    }
    fetchSchools()
  }, [])

  const [teacherRoles, setTeacherRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([])

  // Charge les rôles dès le montage
  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getTeacherRoles() // Peut être un appel axios/fetch
        if (response && Array.isArray(response.data)) {
          setTeacherRoles(response.data)
        } else if (response?.data?.data) {
          setTeacherRoles(response.data.data)
        } else if (response?.data) {
          setTeacherRoles(response.data)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des rôles :", error)
      }
    }

    fetchRoles()
  }, [])

  const [joinSchoolIds, setJoinSchoolIds] = useState<number[]>([])

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setUser((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleAvailabilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setAvailability((prev) => ({ ...prev, [name]: checked }))
  }

  const handleAddSchool = () => {
    const newId = prompt("ID de l'école à ajouter :")
    if (newId && !isNaN(Number(newId))) {
      setJoinSchoolIds((prev) => [...prev, Number(newId)])
    }
  }

  const handleRemoveSchool = (id: number) => {
    setJoinSchoolIds((prev) => prev.filter((s) => s !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = {
      ...user,
      ...availability,
      ...selectedSchools,
    }

    // Appel à l'API pour soumettre les données
    submitTeacherRegistration(formData)
      .then((response) => {
        console.log("Inscription réussie :", response)
      })
      .catch((error) => {
        console.error("Erreur lors de l'inscription :", error)
      })
  }

  return (
    <form onSubmit={handleSubmit} className="form-container grid">
      <h2 className="form-title" style={{ gridColumn: "1 / -1" }}>
        Inscription Enseignant
      </h2>

      <div className="form-field">
        <label className="form-label">Prénom *</label>
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
        <label className="form-label">Nom *</label>
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
        <label className="form-label">Email professionnel *</label>
        <input
          className="form-input"
          type="email"
          name="email"
          placeholder="votre@email-ecole.fr"
          value={user.email}
          onChange={handleUserChange}
          required
        />
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
        <label className="form-label">Confirmation *</label>
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

      <div className="form-field">
        <label className="form-label">Date de naissance *</label>
        <input
          className="form-input"
          type="date"
          name="birthday"
          value={user.birthday}
          onChange={handleUserChange}
          required
        />
      </div>

      <div className="form-field">
        <label className="form-label">Rôle *</label>
        <select name="role" value={user.role} onChange={handleUserChange} required className="form-select">
          <option value="">-- Choisir un rôle --</option>
          {teacherRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {tradFR[role.value as keyof typeof tradFR] || role.value}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="form-fieldset" style={{ gridColumn: "1 / -1" }}>
        <legend className="form-legend">Disponibilités</legend>
        <div className="form-checkbox-group">
          {Object.keys(availability).map((day) => (
            <label key={day} className="form-checkbox-label">
              <input
                type="checkbox"
                name={day}
                checked={(availability as any)[day]}
                onChange={handleAvailabilityChange}
              />
              <span>{day}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="pur-fieldset" style={{ gridColumn: "1 / -1" }}>
        <legend className="pur-legend">Écoles</legend>
        <input
          type="text"
          className="pur-input"
          placeholder="Rechercher une école..."
          value={schoolQuery}
          onChange={(e) => setSchoolQuery(e.target.value)}
        />
        <div className="pur-search-list">
          {filteredSchools.slice(0, 8).map((school) => (
            <button
              key={school.id}
              type="button"
              onClick={() => handleSelectSchool(school.id)}
              className={`pur-skill ${selectedSchools.includes(school.id) ? "pur-skill--selected" : ""}`}
            >
              {school.name}
            </button>
          ))}
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

      <button type="submit" className="form-button success" style={{ gridColumn: "1 / -1" }}>
        S'inscrire
      </button>
    </form>
  )
}

export default TeacherRegisterForm
