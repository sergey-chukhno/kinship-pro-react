"use client"

import type React from "react"
import { useState } from "react"
import "./AuthPage.css"
import { login } from "../../api/Authentication"
import PersonalUserRegisterForm from "../RegisterForm/PersonalUserRegisterForm"
import TeacherRegisterForm from "../RegisterForm/TeacherRegisterForm"
import CompanyRegisterForm from "../RegisterForm/CompanyRegisterForm"
import SchoolRegisterForm from "../RegisterForm/SchoolRegisterForm"
import { useAppContext } from '../../context/AppContext';

type RegisterType = "user" | "teacher" | "school" | "company" | ""

interface LoginData {
  email: string
  password: string
}

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
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
            alert("Connexion réussie en tant qu'utilisateur (simulation)")
          }
          else if (response.data.user.available_contexts.teacher_dashboard) {
            setShowingPageType("teacher")
            setCurrentPage("dashboard")
            alert("Connexion réussie en tant qu'enseignant (simulation)")
          }
          else if (response.data.user.available_contexts.schools?.length > 0) {
            setShowingPageType("edu")
            setCurrentPage("dashboard")
            alert("Connexion réussie en tant qu'établissement (simulation)")
          }
          else if (response.data.user.available_contexts.companies?.length > 0) {
            setShowingPageType("pro");
            setCurrentPage("dashboard");
            alert("Connexion réussie en tant qu'entreprise (simulation)");
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

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Register type:", registerType)
    alert(`Inscription ${registerType} réussie (simulation)`)
  }

  const renderRegisterForm = () => {
    if (!registerType) {
      return (
        <div className="register-type-grid">
          <h2 className="register-title">Choisissez votre type d'inscription</h2>
          <div className="register-grid">
            <button className="register-type-button" onClick={() => setRegisterType("user")}>
              <div className="register-type-icon">👤</div>
              <div className="register-type-title">Utilisateur</div>
              <div className="register-type-description">Créez un compte personnel</div>
            </button>
            <button className="register-type-button" onClick={() => setRegisterType("teacher")}>
              <div className="register-type-icon">👨‍🏫</div>
              <div className="register-type-title">Enseignant</div>
              <div className="register-type-description">Inscription pour enseignants</div>
            </button>
            <button className="register-type-button" onClick={() => setRegisterType("school")}>
              <div className="register-type-icon">🏫</div>
              <div className="register-type-title">École</div>
              <div className="register-type-description">Inscription pour établissements</div>
            </button>
            <button className="register-type-button" onClick={() => setRegisterType("company")}>
              <div className="register-type-icon">🏢</div>
              <div className="register-type-title">Entreprise</div>
              <div className="register-type-description">Inscription pour entreprises</div>
            </button>
          </div>
        </div>
      )
    }

    return (
      <div>
        <button className="form-back-button" onClick={() => setRegisterType("")}>
          ← Retour au choix du type
        </button>
        {registerType === "user" && <PersonalUserRegisterForm />}
        {registerType === "teacher" && <TeacherRegisterForm />}
        {registerType === "company" && <CompanyRegisterForm />}
        {registerType === "school" && <SchoolRegisterForm />}
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

        <button
          type="button"
          className="toggle-button"
          onClick={() => {
            setIsLogin(false)
            setRegisterType("")
          }}
        >
          Pas encore de compte ? S'inscrire
        </button>
      </form>
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-content">
          {isLogin ? (
            renderLoginForm()
          ) : (
            <>
              {renderRegisterForm()}
              {!registerType && (
                <button
                  className="back-to-login"
                  onClick={() => {
                    setIsLogin(true)
                    setRegisterType("")
                  }}
                >
                  Déjà un compte ? Se connecter
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthPage
