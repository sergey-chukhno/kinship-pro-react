import React, { useState } from "react";
import './AuthPage.css';
import {login} from '../../api/Authentication';

type RegisterType = "user" | "teacher" | "school" | "";

interface RegisterData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    subject?: string;
    schoolName?: string;
    companyName?: string;
}

interface LoginData {
    email: string;
    password: string;
    }

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [registerType, setRegisterType] = useState<RegisterType>("");
    const [loginData, setLoginData] = useState<LoginData>({
        email: "",
        password: "",
    });
    const [registerData, setRegisterData] = useState<RegisterData>({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoginData({ ...loginData, [name]: value });
    };

    const handleRegisterChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setRegisterData({ ...registerData, [name]: value });
    };

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Login:", loginData);
        login(loginData.email, loginData.password);
    };

    const handleRegisterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Register type:", registerType);
        console.log("Register data:", registerData);
        alert(`Inscription ${registerType} réussie (simulation)`);
    };

    const renderRegisterForm = () => {
    if (!registerType) {
        return (
            <div className="flex flex-col gap-3">
            <p className="text-center">Choisissez votre type d'inscription :</p>
            <button
                onClick={() => setRegisterType("user")}
            >
                Utilisateur
            </button>
            <button
                onClick={() => setRegisterType("teacher")}
                className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
                Enseignant
            </button>
            <button
                onClick={() => setRegisterType("school")}
                className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
            >
                École / Compagnie
            </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3 mt-4">
            <button
            type="button"
            onClick={() => setRegisterType("")}
            className="text-sm text-blue-500 hover:underline mb-2 self-start"
            >
            ← Retour au choix
            </button>

            <input
            type="text"
            name="name"
            placeholder="Nom complet"
            value={registerData.name}
            onChange={handleRegisterChange}
            required
            className="border rounded p-2"
            />
            <input
            type="email"
            name="email"
            placeholder="Adresse email"
            value={registerData.email}
            onChange={handleRegisterChange}
            required
            className="border rounded p-2"
            />
            <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            value={registerData.password}
            onChange={handleRegisterChange}
            required
            className="border rounded p-2"
            />
            <input
            type="password"
            name="confirmPassword"
            placeholder="Confirmer le mot de passe"
            value={registerData.confirmPassword}
            onChange={handleRegisterChange}
            required
            className="border rounded p-2"
            />

            {registerType === "teacher" && (
            <input
                type="text"
                name="subject"
                placeholder="Matière enseignée"
                value={registerData.subject || ""}
                onChange={handleRegisterChange}
                className="border rounded p-2"
            />
            )}

            {registerType === "school" && (
            <>
                <input
                type="text"
                name="schoolName"
                placeholder="Nom de l'école"
                value={registerData.schoolName || ""}
                onChange={handleRegisterChange}
                className="border rounded p-2"
                />
                <input
                type="text"
                name="companyName"
                placeholder="Nom de la compagnie (si applicable)"
                value={registerData.companyName || ""}
                onChange={handleRegisterChange}
                className="border rounded p-2"
                />
            </>
            )}

            <button
            type="submit"
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
            >
            S'inscrire
            </button>
        </form>
        );
    };

    const renderLoginForm = () => (
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3 mt-4">
        <input
            type="email"
            name="email"
            placeholder="Adresse email"
            value={loginData.email}
            onChange={handleLoginChange}
            required
            className="border rounded p-2"
        />
        <input
            type="password"
            name="password"
            placeholder="Mot de passe"
            value={loginData.password}
            onChange={handleLoginChange}
            required
            className="border rounded p-2"
        />
        <button
            type="submit"
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
        >
            Se connecter
        </button>
        </form>
    );

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-tabs">
                <button
                    className={isLogin ? "active" : ""}
                    onClick={() => {
                    setIsLogin(true);
                    setRegisterType("");
                    }}
                >
                    Connexion
                </button>
                <button
                    className={!isLogin ? "active" : ""}
                    onClick={() => setIsLogin(false)}
                >
                    Inscription
                </button>
                </div>

                <div className="auth-content">
                {isLogin ? (
                    renderLoginForm()
                ) : (
                    renderRegisterForm()
                )}
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
