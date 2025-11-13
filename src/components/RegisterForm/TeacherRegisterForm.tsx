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

const TeacherRegisterForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [showAvailability, setShowAvailability] = useState(false)
  const [showSchools, setShowSchools] = useState(false)

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
  const [selectedSchoolsList, setSelectedSchoolsList] = useState<{ id: number; name: string }[]>([])
  const [teacherRoles, setTeacherRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([])

  // const handleSelectSchool = (id: number) => {
  //   const school = schools.find((s) => s.id === id)
  //   if (school) {
  //     if (selectedSchoolsList.some((s) => s.id === id)) {
  //       setSelectedSchoolsList((prev) => prev.filter((s) => s.id !== id))
  //     } else {
  //       setSelectedSchoolsList((prev) => [...prev, school])
  //     }
  //   }
  // }

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await getSchools()
        const data = response?.data?.data ?? response?.data ?? response ?? []
        if (Array.isArray(data)) {
          const normalized = data.map((s: any) => ({ id: Number(s.id), name: s.name }))
          setSchools(normalized)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des écoles :", error)
      }
    }
    fetchSchools()
  }, [])

  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await getTeacherRoles()
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

  const filteredSchools = schools.filter((s) => s.name.toLowerCase().includes(schoolQuery.toLowerCase()))

  const isStep1Valid = () => {
    return user.firstName && user.lastName && user.email && user.password && user.passwordConfirmation && user.birthday
  }

  const isStep2Valid = () => {
    return user.role !== ""
  }

  const handleNext = () => {
    if (currentStep === 1 && isStep1Valid()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && isStep2Valid()) {
      setCurrentStep(3)
    } else if (currentStep === 3 && (!showSchools || selectedSchoolsList.length > 0)) {
      setCurrentStep(4)
    } else if (currentStep === 4 && (!showAvailability || Object.values(availability).some(Boolean))) {
      setCurrentStep(5)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = {
      ...user,
      ...availability,
      selectedSchoolsList
    }

    submitTeacherRegistration(formData)
      .then((response) => {
        console.log("Inscription réussie :", response)
        alert("Inscription réussie !")
      })
      .catch((error) => {
        console.error("Erreur lors de l'inscription :", error)
      })
  }

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <div className="form-header">
        <button type="button" onClick={onBack} className="back-button">
          ← Retour
        </button>
        <h2 className="form-title">Inscription Enseignant</h2>
      </div>

      {/* Step 1 */}
      <div className={`form-step ${currentStep >= 1 ? "visible" : ""}`}>
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
          </div>

          <div className="form-field full-width">
            <label className="form-label">Adresse email Académique *</label>
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
        </div>
      </div>

      {/* Step 2 */}
      {currentStep >= 2 && (
        <div className="form-step visible">
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
      )}

      {/* Step 3 */}
      {currentStep >= 3 && (
        <div className="form-step visible">
          <h3 className="step-title">Établissement Scolaire</h3>
          <label className="toggle-switch-form">
            <span>Je demande mon rattachement à un établissement scolaire</span>
            <input type="checkbox" checked={showSchools} onChange={(e) => setShowSchools(e.target.checked)} />
            <span className="toggle-slider"></span>
          </label>

          {showSchools && (
            <div className="pur-fieldset">
              <input
                type="text"
                className="pur-input"
                placeholder="Rechercher une école..."
                value={schoolQuery}
                onChange={(e) => setSchoolQuery(e.target.value)}
              />
              {schoolQuery && (
                <div className="search-suggestions">
                  {filteredSchools.slice(0, 5).map((school) => (
                    <div key={school.id} className="suggestion-item" onClick={() => handleAddSchool(school.id)}>
                      {school.name}
                    </div>
                  ))}
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
          )}
        </div>
      )}

      {/* Step 4 */}
      {currentStep >= 4 && (
        <div className="form-step visible">
          <h3 className="step-title">Mes Disponibilités</h3>
          <label className="toggle-switch-form">
            <span>Je veux ajouter mes disponibilités</span>
            <input type="checkbox" checked={showAvailability} onChange={(e) => setShowAvailability(e.target.checked)} />
            <span className="toggle-slider"></span>
          </label>

          {showAvailability && (
            <div className="form-fieldset">
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
            </div>
          )}
        </div>
      )}

      {/* Step 5 */}
      {currentStep >= 5 && (
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
      )}

      <div className="form-actions">
        {currentStep < 5 ? (
          <button
            type="button"
            onClick={handleNext}
            className="form-button success"
            disabled={
              (currentStep === 1 && !isStep1Valid()) ||
              (currentStep === 2 && !isStep2Valid()) ||
              (currentStep === 3 && showSchools && selectedSchoolsList.length === 0) ||
              (currentStep === 4 && showAvailability && !Object.values(availability).some(Boolean))
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
