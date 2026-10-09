"use client";

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AuthPage.css";
import { loginWithStudentCode } from "../../api/Authentication";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../hooks/useToast";
import { getSafePostAuthRedirect } from "../../utils/authRedirect";
import {
  STUDENT_CODE_LOST_HINT,
  STUDENT_CODE_MISMATCH,
} from "../../utils/studentCodeAccess";
import type { PageType } from "../../types";

type FormState = {
  first_name: string;
  last_name: string;
  birthday: string;
  code: string;
};

const mapApiUserToAppUser = (apiUser: any) => {
  if (!apiUser) return null;
  const fullName =
    apiUser.full_name ||
    [apiUser.first_name, apiUser.last_name].filter(Boolean).join(" ").trim();
  return {
    id: apiUser.id ? apiUser.id.toString() : "",
    name: fullName || apiUser.email,
    email: apiUser.email,
    role: apiUser.role,
    avatar: apiUser.avatar_url || "/default-avatar.png",
    organization:
      apiUser.available_contexts?.companies?.[0]?.name ||
      apiUser.available_contexts?.schools?.[0]?.name ||
      "",
    available_contexts: apiUser.available_contexts,
    birthday: apiUser.birthday,
    read_only_until_email: Boolean(apiUser.read_only_until_email),
    account_activated: Boolean(apiUser.account_activated),
    has_temporary_email: Boolean(apiUser.has_temporary_email),
    is_claimed: Boolean(apiUser.is_claimed),
  };
};

const StudentCodeLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentPage, setShowingPageType, setUser } = useAppContext();
  const { showError, showSuccess } = useToast();
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    birthday: "",
    code: "",
  });
  const [error, setError] = useState("");
  const [showLostHint, setShowLostHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await loginWithStudentCode({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        birthday: form.birthday,
        code: form.code.trim(),
      });
      if (!response.data?.token) {
        throw new Error(STUDENT_CODE_MISMATCH);
      }
      localStorage.setItem("jwt_token", response.data.token);
      const normalizedUser = mapApiUserToAppUser(response.data.user);
      if (normalizedUser) setUser(normalizedUser);

      showSuccess("Connexion réussie.");
      localStorage.setItem("selectedPageType", "user");
      localStorage.setItem("selectedContextId", "user-dashboard");
      localStorage.setItem("selectedContextType", "user");
      setShowingPageType("user");

      const redirect = getSafePostAuthRedirect(location.search);
      if (redirect) {
        const fromPath = redirect.replace(/^\//, "") as PageType;
        setCurrentPage(fromPath || "dashboard");
        navigate(redirect);
      } else {
        setCurrentPage("dashboard");
        navigate("/dashboard");
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || STUDENT_CODE_MISMATCH;
      setError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-header-content">
          <div className="auth-header-logo">
            <a href="/">
              <img
                className="auth-header-logo-image"
                src="/Kinship_logo.png"
                alt="Kinship Logo"
              />
            </a>
          </div>
        </div>
      </header>

      <div className="auth-container">
        <div className="auth-content">
          <div className="login-form-wrapper">
            <button
              type="button"
              className="text-button"
              style={{
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                marginBottom: "0.75rem",
              }}
              onClick={() => navigate("/login")}
            >
              ← Retour
            </button>
            <h2 className="login-title">Me connecter avec mon code</h2>
            <p className="student-code-intro">
              C&apos;est ta façon de te connecter tant que tu n&apos;as pas donné
              d&apos;adresse email. Tu peux revenir autant de fois que tu veux,
              avec le même code.
            </p>
            <form onSubmit={onSubmit} className="login-form">
              <div className="form-field">
                <label className="form-label">Prénom</label>
                <input
                  className="form-input"
                  name="first_name"
                  value={form.first_name}
                  onChange={onChange}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Nom</label>
                <input
                  className="form-input"
                  name="last_name"
                  value={form.last_name}
                  onChange={onChange}
                  required
                  autoComplete="family-name"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Date de naissance</label>
                <input
                  className="form-input"
                  type="date"
                  name="birthday"
                  value={form.birthday}
                  onChange={onChange}
                  required
                />
              </div>
              <div className="form-field">
                <label className="form-label">Code élève</label>
                <input
                  className="form-input"
                  name="code"
                  value={form.code}
                  onChange={onChange}
                  required
                  placeholder="Il est sur le papier que ton établissement t'a donné."
                  autoComplete="one-time-code"
                />
              </div>
              {error ? (
                <p className="student-code-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? "Connexion…" : "Me connecter"}
              </button>
              <p className="student-code-hint">
                Pas de mot de passe : ton code et tes trois informations suffisent.
              </p>
              <button
                type="button"
                className="text-button student-code-lost"
                onClick={() => setShowLostHint(true)}
              >
                Code perdu ou oublié ?
              </button>
              {showLostHint ? (
                <p className="student-code-lost-hint">{STUDENT_CODE_LOST_HINT}</p>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCodeLogin;
