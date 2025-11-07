"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  getSkills,
  getSubSkills,
  getPersonalUserRoles,
  getCompanies,
  getSchools,
} from "../../api/RegistrationRessource"
import { submitPersonalUserRegistration } from "../../api/Authentication"
import "./PersonalUserRegisterForm.css"

interface ChildInfo {
  childFirstName: string
  childLastName: string
  childBirthday: string
  school_id?: number
  school_name?: string
  class_id?: number
  class_name?: string
}

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

const tradFR: Record<string, string> = {
  parent: "Parent",
  grand_parent: "Grand-parent",
  children: "Enfant",
  voluntary: "Volontaire",
  tutor: "Tuteur",
  employee: "Salarié",
  other: "Autre",
}

const PersonalUserRegisterForm: React.FC = () => {
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

  // skillList et skillSubList stockent des ids en number systématiquement
  const [skillList, setSkillList] = useState<{ id: number; name: string }[]>([])
  const [skillSubList, setSkillSubList] = useState<{ id: number; name: string; parent_skill_id: number }[]>([])
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([])
  const [schools, setSchools] = useState<{ id: number; name: string }[]>([])

  const [schoolQuery, setSchoolQuery] = useState("")
  const [companyQuery, setCompanyQuery] = useState("")

  const handleSelectSchool = (id: number) => {
    setSelectedSchools((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const handleSelectCompany = (id: number) => {
    setSelectedCompanies((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  const filteredSchools = schools.filter((s) => s.name.toLowerCase().includes(schoolQuery.toLowerCase()))

  const filteredCompanies = companies.filter((c) => c.name.toLowerCase().includes(companyQuery.toLowerCase()))

  // Stocke les rôles retournés par l’API
  const [personalUserRoles, setPersonalUserRoles] = useState<{ value: string; requires_additional_info: boolean }[]>([])

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await getSkills()
        const data = response?.data?.data ?? response?.data ?? response ?? []
        if (Array.isArray(data)) {
          // Normalise les ids en number
          const normalized = data.map((s: any) => ({ id: Number(s.id), name: s.name }))
          setSkillList(normalized)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des compétences :", error)
      }
    }
    fetchSkills()
  }, [])

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await getCompanies()
        const data = response?.data?.data ?? response?.data ?? response ?? []
        if (Array.isArray(data)) {
          // Normalise les ids en number
          const normalized = data.map((c: any) => ({ id: Number(c.id), name: c.name }))
          setCompanies(normalized)
        }
      } catch (error) {
        console.error("Erreur lors du chargement des entreprises :", error)
      }
    }
    fetchCompanies()
  }, [])

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

  // Charge toutes les sous-compétences pour les skills connus.
  // Se relance automatiquement quand skillList change.
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

          // ✅ ton cas concret : sous-compétences dans data.sub_skills
          const subSkills = Array.isArray(data.sub_skills)
            ? data.sub_skills
            : Array.isArray(data.skill?.sub_skills)
              ? data.skill.sub_skills
              : []

          // normalise
          return subSkills.map((s: any) => ({
            id: Number(s.id),
            name: s.name,
            parent_skill_id: Number(skill.id),
          }))
        })

        const results = await Promise.all(promises)
        const flattened = results.flat()

        if (mounted) setSkillSubList(flattened)
        console.log("Sous-compétences chargées :", flattened)
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
        if (Array.isArray(data)) setPersonalUserRoles(data)
      } catch (error) {
        console.error("Erreur lors du chargement des rôles :", error)
      }
    }
    fetchRoles()
  }, [])

  const [selectedSchools, setSelectedSchools] = useState<number[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([])
  const [childrenInfo, setChildrenInfo] = useState<ChildInfo[]>([])

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

  const handleAddChild = () => {
    setChildrenInfo((prev) => [
      ...prev,
      {
        childFirstName: "",
        childLastName: "",
        childBirthday: "",
        school_id: undefined,
        school_name: "",
        class_id: undefined,
        class_name: "",
      },
    ])
  }

  const handleChildChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setChildrenInfo((prev) => {
      const updated = [...prev]
      ;(updated[index] as any)[name] = value
      return updated
    })
  }

  const handleRemoveChild = (index: number) => {
    setChildrenInfo((prev) => prev.filter((_, i) => i !== index))
  }

  // toggle skill : coche/décoche la skill et si décoche supprime les subskills liés
  const toggleSkill = (skillId: number) => {
    setSkills((prev) => {
      const already = prev.selectedSkills.includes(skillId)
      let newSkillIds = [...prev.selectedSkills]
      let newSubIds = [...prev.selectedSubSkills]

      if (already) {
        newSkillIds = newSkillIds.filter((id) => id !== skillId)
        // retirer toutes les sous-skills liées
        const related = skillSubList.filter((s) => s.parent_skill_id === skillId).map((s) => s.id)
        newSubIds = newSubIds.filter((id) => !related.includes(id))
      } else {
        // ajouter la skill (si pas déjà)
        if (!newSkillIds.includes(skillId)) newSkillIds.push(skillId)
      }

      return { selectedSkills: newSkillIds, selectedSubSkills: newSubIds }
    })
  }

  // toggle subskill : coche/décoche la sous-skill, si coche -> coche aussi le parent
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formData = {
      ...user,
      ...availability,
      ...skills,
      ...selectedSchools,
      ...selectedCompanies,
      ...childrenInfo,
    }
    submitPersonalUserRegistration(formData)
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
    <form onSubmit={handleSubmit} className="pur-form grid grid-cols-2 gap-4">
      <h2 className="pur-title" style={{ gridColumn: "1 / -1" }}>
        Inscription Utilisateur Personnel
      </h2>

      <div className="form-field">
        <label className="form-label">Prénom *</label>
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
        <label className="form-label">Nom *</label>
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
        <label className="form-label">Email *</label>
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
        <label className="form-label">Confirmation *</label>
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

      <div className="form-field">
        <label className="form-label">Date de naissance *</label>
        <input
          className="pur-input"
          type="date"
          name="birthday"
          value={user.birthday}
          onChange={handleUserChange}
          required
        />
      </div>

      <div className="form-field">
        <label className="form-label">Métier</label>
        <input
          className="pur-input"
          type="text"
          name="job"
          placeholder="Votre métier"
          value={user.job}
          onChange={handleUserChange}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Rôle *</label>
        <select className="pur-select" name="role" value={user.role} onChange={handleUserChange} required>
          <option value="">-- Choisir un rôle --</option>
          {personalUserRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {tradFR[role.value] || role.value}
            </option>
          ))}
        </select>
      </div>

      <div className="pur-field" style={{ gridColumn: "1 / -1" }}>
        <label className="pur-label">Compétences :</label>
        <div className="pur-skill-list">
          {skillList.map((skill) => {
            const skillId = Number(skill.id)
            const isSelected = skills.selectedSkills.includes(skillId)
            const relatedSubs = skillSubList.filter((s) => s.parent_skill_id === skillId)

            return (
              <div key={skillId} className="pur-skill-group">
                <button
                  type="button"
                  onClick={() => toggleSkill(skillId)}
                  className={`pur-skill ${isSelected ? "pur-skill--selected" : ""}`}
                >
                  {skill.name}
                </button>

                {/* n'affiche les sous-skills que si le parent est sélectionné */}
                {isSelected && relatedSubs.length > 0 && (
                  <div className="pur-subskill-list">
                    {relatedSubs.map((sub) => {
                      const isSubSelected = skills.selectedSubSkills.includes(sub.id)
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => toggleSubSkill(sub.id, sub.parent_skill_id)}
                          className={`pur-skill pur-skill--sub ${isSubSelected ? "pur-skill--selected" : ""}`}
                        >
                          {sub.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <fieldset className="pur-fieldset" style={{ gridColumn: "1 / -1" }}>
        <legend className="pur-legend">Disponibilités</legend>
        <div className="pur-availability">
          {Object.keys(availability).map((day) => (
            <label key={day} className="pur-availability-item">
              <input
                type="checkbox"
                name={day}
                checked={(availability as any)[day]}
                onChange={handleAvailabilityChange}
              />
              <span className="pur-capitalize">{day}</span>
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

      <fieldset className="pur-fieldset" style={{ gridColumn: "1 / -1" }}>
        <legend className="pur-legend">Entreprises</legend>
        <input
          type="text"
          className="pur-input"
          placeholder="Rechercher une entreprise..."
          value={companyQuery}
          onChange={(e) => setCompanyQuery(e.target.value)}
        />
        <div className="pur-search-list">
          {filteredCompanies.slice(0, 8).map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => handleSelectCompany(company.id)}
              className={`pur-skill ${selectedCompanies.includes(company.id) ? "pur-skill--selected" : ""}`}
            >
              {company.name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="pur-fieldset" style={{ gridColumn: "1 / -1" }}>
        <legend className="pur-legend">Enfants</legend>
        {childrenInfo.map((child, i) => (
          <div key={i} className="pur-child-card">
            <input
              className="pur-input"
              type="text"
              name="childFirstName"
              placeholder="Prénom"
              value={child.childFirstName}
              onChange={(e) => handleChildChange(i, e)}
            />
            <input
              className="pur-input"
              type="text"
              name="childLastName"
              placeholder="Nom"
              value={child.childLastName}
              onChange={(e) => handleChildChange(i, e)}
            />
            <input
              className="pur-input"
              type="date"
              name="childBirthday"
              value={child.childBirthday}
              onChange={(e) => handleChildChange(i, e)}
            />
            <button type="button" className="pur-link danger" onClick={() => handleRemoveChild(i)}>
              Supprimer cet enfant
            </button>
          </div>
        ))}
        <button type="button" className="pur-link" onClick={handleAddChild}>
          + Ajouter un enfant
        </button>
      </fieldset>

      <label className="flex items-center gap-2" style={{ gridColumn: "1 / -1" }}>
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

      <button type="submit" className="pur-button" style={{ gridColumn: "1 / -1" }}>
        S'inscrire
      </button>
    </form>
  )
}

export default PersonalUserRegisterForm
