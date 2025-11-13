"use client"

import type React from "react"
import { useState } from "react"
import "./AuthPage.css"
import { login } from "../../api/Authentication"
import PersonalUserRegisterForm from "../RegisterForm/PersonalUserRegisterForm"
import TeacherRegisterForm from "../RegisterForm/TeacherRegisterForm"
import CompanyRegisterForm from "../RegisterForm/CompanyRegisterForm"
import SchoolRegisterForm from "../RegisterForm/SchoolRegisterForm"
import { useAppContext } from "../../context/AppContext"


type RegisterType = "user" | "teacher" | "school" | "company" | ""

interface LoginData {
  email: string
  password: string
}

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(false)
  const [registerType, setRegisterType] = useState<RegisterType>("")
  const [loginData, setLoginData] = useState<LoginData>({
    email: "",
    password: "",
  })
  const { setCurrentPage, setShowingPageType } = useAppContext()

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
          if (response.data.user.available_contexts.user_dashboard) {
            setShowingPageType("user")
            setCurrentPage("projects")
          }
          else if (response.data.user.available_contexts.teacher_dashboard) {
            setShowingPageType("teacher")
            setCurrentPage("dashboard")
          }
          else if (response.data.user.available_contexts.schools?.length > 0) {
            setShowingPageType("edu")
            setCurrentPage("dashboard")
          }
          else if (response.data.user.available_contexts.companies?.length > 0) {
            setShowingPageType("pro");
            setCurrentPage("dashboard");
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
    setIsLogin(false)
    setRegisterType(type)
  }

  const handleBackToSelection = () => {
    setRegisterType("")
  }

  const renderRegisterForm = () => {
    if (!registerType) {
      return (
        <div className="register-type-grid">
          <div className="register-grid">
            {/* Teacher en haut à gauche */}
            <button className="register-type-card register-teacher" onClick={() => setRegisterType("teacher")}>
              <h3 className="register-card-title">Enseignant</h3>
              <p className="register-card-description">
                Créez votre profil d'enseignant et partagez vos compétences avec votre réseau
              </p>
              <button className="register-card-button register-teacher-button">Je veux découvrir l'outil</button>
            </button>

            <button className="register-type-card register-user" onClick={() => setRegisterType("user")}>
              <h3 className="register-card-title">Personal User</h3>
              <p className="register-card-description">
                Inscrivez-vous en tant qu'utilisateur personnel pour accéder à toutes les fonctionnalités de la
                plateforme
              </p>
              <button className="register-card-button register-user-button">Je veux découvrir l'outil</button>
            </button>

            <button className="register-type-card register-partner" onClick={() => setRegisterType("school")}>
              <h3 className="register-card-title">Ecole</h3>
              <p className="register-card-description">
                Enregistrez votre établissement scolaire et connectez-vous avec la communauté
              </p>
              <button className="register-card-button register-partner-button">Je veux découvrir l'outil</button>
            </button>

            <button className="register-type-card register-volunteer" onClick={() => setRegisterType("company")}>
              <h3 className="register-card-title">Organisation</h3>
              <p className="register-card-description">
                Inscrivez votre entreprise et proposez des opportunités de collaboration
              </p>
              <button className="register-card-button register-volunteer-button">Je veux découvrir l'outil</button>
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

        <button type="submit" className="submit-button">
          Se connecter
        </button>
      </form>
    </div>
  )

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-header-content">
          <div className="auth-header-logo">
            <img className="auth-header-logo-image" src="Kinship_logo.png" alt="Kinship Logo" />
          </div>

          <nav className="auth-header-nav">
            <button className="auth-header-link" onClick={() => navigateToRegisterType("teacher")}>
              Pour les enseignants
            </button>
            <button className="auth-header-link" onClick={() => navigateToRegisterType("user")}>
              Pour les utilisateurs
            </button>
            <button className="auth-header-link" onClick={() => navigateToRegisterType("company")}>
              Pour les entreprises
            </button>
            <button className="auth-header-link" onClick={() => navigateToRegisterType("school")}>
              Pour les écoles
            </button>
            <button
              className="auth-header-button"
              onClick={() => {
                setIsLogin(true)
                setRegisterType("")
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