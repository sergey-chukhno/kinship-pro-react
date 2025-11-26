"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import "./AuthPage.css"
import { login } from "../../api/Authentication"
import PersonalUserRegisterForm from "../RegisterForm/PersonalUserRegisterForm"
import TeacherRegisterForm from "../RegisterForm/TeacherRegisterForm"
import CompanyRegisterForm from "../RegisterForm/CompanyRegisterForm"
import SchoolRegisterForm from "../RegisterForm/SchoolRegisterForm"
import PrivacyPolicy from "../RegisterForm/PrivacyPolicy"
import CGU from "../RegisterForm/CGU"
import { useAppContext } from "../../context/AppContext"


type RegisterType = "user" | "teacher" | "school" | "company" | "privacy-policy" | "CGU" | ""

interface LoginData {
  email: string
  password: string
}

const AuthPage: React.FC = () => {
  const { registerType: urlRegisterType } = useParams<{ registerType?: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [isLogin, setIsLogin] = useState(false)
  const [registerType, setRegisterType] = useState<RegisterType>("")
  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    password: "",
  })
  const { setCurrentPage, setShowingPageType } = useAppContext()

  // Synchroniser le type de formulaire avec l'URL
  useEffect(() => {
    if (location.pathname === "/login") {
      setIsLogin(true)
      setRegisterType("")
    } else if (location.pathname === "/register") {
      setIsLogin(false)
      setRegisterType("")
    } else if (urlRegisterType && ["user", "teacher", "school", "company"].includes(urlRegisterType)) {
      setIsLogin(false)
      setRegisterType(urlRegisterType as RegisterType)
    } else if (location.pathname === "/privacy-policy") {
      setRegisterType("privacy-policy")
    } else if (location.pathname === "/CGU") {
      setRegisterType("CGU")
    }
  }, [location.pathname, urlRegisterType])

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setLoginData({ ...loginData, [name]: value })
  }

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Login:", loginData)
    const loginDataQuery = login(loginData.email, loginData.password)
    loginDataQuery
      .then((response) => {
        console.log("Login successful:", response.data)
        if (response.data.token) {
          localStorage.setItem("jwt_token", response.data.token)

          // Check if user has admin access to any company
          const hasAdminCompany = response.data.user.available_contexts.companies?.some(
            (c: any) => c.role === 'admin' || c.role === 'superadmin'
          );

          // Check if user has admin access to any school
          const hasAdminSchool = response.data.user.available_contexts.schools?.some(
            (s: any) => s.role === 'admin' || s.role === 'superadmin'
          );

          // Priority 1: Personal dashboard
          if (response.data.user.available_contexts.user_dashboard) {
            setShowingPageType("user")
            setCurrentPage("projects")
            navigate("/projects")
          }
          // Priority 2: Companies (only if admin/superadmin)
          else if (
            hasAdminCompany ||
            [
              "president_association",
              "president_fondation",
              "directeur_organisation",
              "directeur_entreprise",
              "responsable_rh_formation_secteur",
            ].includes(response.data.user.role)
          ) {
            setShowingPageType("pro")
            setCurrentPage("dashboard")
            navigate("/dashboard")
          }
          // Priority 3: Schools (only if admin/superadmin)
          else if (
            hasAdminSchool ||
            [
              "directeur_ecole",
              "directeur_academique",
              "principal",
              "proviseur",
              "responsable_academique",
            ].includes(response.data.user.role)
          ) {
            setShowingPageType("edu")
            setCurrentPage("dashboard")
            navigate("/dashboard")
          }
          // Priority 4: Teacher dashboard
          else if (
            response.data.user.available_contexts.teacher_dashboard ||
            [
              "primary_school_teacher",
              "secondary_school_teacher",
              "education_rectorate_personnel",
              "administrative_staff",
              "cpe_student_life",
            ].includes(response.data.user.role)
          ) {
            setShowingPageType("teacher")
            setCurrentPage("dashboard")
            navigate("/dashboard")
          }
        } else {
          alert("Échec de la connexion (simulation)")
        }
      })
      .catch((error) => {
        console.error("Login error:", error)
        alert("Erreur de connexion (simulation)")
      })
  }

  const navigateToRegisterType = (type: RegisterType) => {
    navigate(`/register/${type}`)
  }

  const handleBackToSelection = () => {
    navigate("/register")
  }

  const renderRegisterForm = () => {
    if (!registerType) {
      return (
        <div className="register-type-grid">
          <div className="register-grid">
            {/* Teacher en haut à gauche */}
            <button className="register-type-card register-user" onClick={() => navigateToRegisterType("user")}>
              <h3 className="register-card-title">Je suis un Parent, un Volontaire...</h3>
              <p className="register-card-description">
                Devenez le partenaire idéal de l'école de vos enfants et mettez vos compétences, votre temps et votre réseau au service de vos enfants
              </p>
              <button className="register-card-button register-user-button" type="button">Je veux découvrir l'outil</button>
            </button>

            <button className="register-type-card register-teacher" onClick={() => navigateToRegisterType("teacher")}>
              <h3 className="register-card-title">Je suis un Enseignant</h3>
              <p className="register-card-description">
                Favorisez le passage à l'action de vos idées et de vos projets grace à la digitalisation de votre réseau local (parents d'élèves, partenaires associatifs et professionnels)
              </p>
              <button className="register-card-button register-teacher-button" type="button">Je veux découvrir l'outil</button>
            </button>

            <button className="register-type-card register-volunteer" onClick={() => navigateToRegisterType("company")}>
              <h3 className="register-card-title">Je suis une Organisation, un Partenaire, un Professionnel...</h3>
              <p className="register-card-description">
                Valorisez vos activités en proposant des ateliers de découverte dans votre réseau ou en prenant des élèves en stage. Valoriser les compétences de vos membres.
              </p>
              <button className="register-card-button register-volunteer-button" type="button">Je veux découvrir l'outil</button>
            </button>

            <button className="register-type-card register-partner" onClick={() => navigateToRegisterType("school")}>
              <h3 className="register-card-title">Je suis un Etablissement</h3>
              <p className="register-card-description">
                Créez votre réseau local en fédérant votre communauté (parents, associations, entreprises) et pilotez votre établissement en outillant votre équipe pour gérer les projets et mesurer l’impact sur les soft skills mobilisées par vos élèves.
              </p>
              <button className="register-card-button register-partner-button" type="button">Je veux découvrir l'outil</button>
            </button>
          </div>
        </div>
      )
    }

    return (
      <div>
        {registerType === "user" && <PersonalUserRegisterForm onBack={handleBackToSelection} />}
        {registerType === "teacher" && <TeacherRegisterForm onBack={handleBackToSelection} />}
        {registerType === "company" && <CompanyRegisterForm onBack={handleBackToSelection} />}
        {registerType === "school" && <SchoolRegisterForm onBack={handleBackToSelection} />}
        {location.pathname.includes("/privacy-policy") && <PrivacyPolicy />}
        {location.pathname.includes("/CGU") && <CGU />}
      </div>
    )
  }

  const renderLoginForm = () => (
    <div className="login-form-wrapper">
      <h2 className="login-title">Connexion</h2>
      <form onSubmit={handleLoginSubmit} className="login-form">
        <div className="form-field">
          <label className="form-label">Adresse email</label>
          <input
            type="email"
            name="email"
            placeholder="votre@email.com"
            value={loginData.email}
            onChange={handleLoginChange}
            required
            className="form-input"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Mot de passe</label>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            value={loginData.password}
            onChange={handleLoginChange}
            required
            className="form-input"
          />
        </div>

        <div className="forgot-password-wrapper" style={{ textAlign: 'right', marginBottom: '1rem' }}>
          <button
            type="button"
            className="text-button"
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
            onClick={() => navigate("/forgot-password")}
          >
            Mot de passe oublié ?
          </button>
        </div>

        <button type="submit" className="submit-button">
          Se connecter
        </button>

        <button
          type="button"
          className="toggle-button"
          onClick={() => {
            navigate("/register")
          }}
        >
          Pas encore de compte ? S'inscrire
        </button>
      </form>
    </div>
  )

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-header-content">
          <div className="auth-header-logo">
            <a href="/">
              <img className="auth-header-logo-image" src="/Kinship_logo.png" alt="Kinship Logo" />
            </a>
          </div>

          <nav className="auth-header-nav">
            <button className="auth-header-link" onClick={() => navigateToRegisterType("teacher")}>
              Pour les enseignants
            </button>
            <button className="auth-header-link" onClick={() => navigateToRegisterType("user")}>
              Pour les utilisateurs
            </button>
            <button className="auth-header-link" onClick={() => navigateToRegisterType("company")}>
              Pour les entreprises & asso
            </button>
            <button className="auth-header-link" onClick={() => navigateToRegisterType("school")}>
              Pour les écoles
            </button>
            <button
              className="auth-header-button"
              onClick={() => {
                navigate("/login")
              }}
            >
              Je me connecte
            </button>
          </nav>
        </div>
      </header>

      <div className="auth-container">
        <div className="auth-content">{isLogin ? renderLoginForm() : <>{renderRegisterForm()}</>}</div>
      </div>
    </div>
  )
}

export default AuthPage