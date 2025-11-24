import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../api/Authentication';
import './AuthPage.css'; // Reusing AuthPage styles for consistency

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await forgotPassword(email);
            // We show success regardless of whether the email exists to prevent enumeration
            setSuccess(true);
        } catch (err: any) {
            console.error("Forgot password error:", err);
            // If the backend returns a specific message, we could use it, but for security generic is often better
            // However, if it's a network error or 500, we should let the user know to try again.
            setError(err.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-content">
                    <div className="login-form-wrapper">
                        <h2 className="login-title">Instructions envoyées</h2>
                        <p className="auth-description" style={{ textAlign: 'center', color: '#4b5563', marginBottom: '24px' }}>
                            Si un compte existe avec cet email, les instructions de réinitialisation
                            de mot de passe ont été envoyées.
                        </p>
                        <div className="auth-footer" style={{ textAlign: 'center' }}>
                            <Link to="/login" className="auth-link" style={{ color: '#5b7cff', textDecoration: 'none', fontWeight: 500 }}>Retour à la connexion</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-content">
                <div className="login-form-wrapper">
                    <h2 className="login-title">Mot de passe oublié ?</h2>
                    <p className="auth-description" style={{ marginBottom: '24px', textAlign: 'center', color: '#4b5563' }}>
                        Entrez votre adresse email pour recevoir les instructions de réinitialisation.
                    </p>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-field">
                            <label htmlFor="email" className="form-label">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                                className="form-input"
                                placeholder="votre@email.com"
                            />
                        </div>

                        {error && <div className="error-message" style={{ color: 'red', fontSize: '14px' }}>{error}</div>}

                        <button type="submit" disabled={loading} className="submit-button">
                            {loading ? 'Envoi...' : 'Envoyer les instructions'}
                        </button>

                        <div className="auth-footer" style={{ textAlign: 'center', marginTop: '16px' }}>
                            <Link to="/login" className="auth-link" style={{ color: '#5b7cff', textDecoration: 'none', fontWeight: 500 }}>Retour à la connexion</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
