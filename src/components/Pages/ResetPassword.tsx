import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../../api/Authentication';
import './AuthPage.css'; // Reusing AuthPage styles

const ResetPassword: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [token, setToken] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const tokenParam = searchParams.get('reset_password_token');
        if (!tokenParam) {
            setError('Token de réinitialisation manquant. Veuillez utiliser le lien reçu par email.');
        } else {
            setToken(tokenParam);
        }
    }, [searchParams]);

    const validatePassword = (pwd: string): string[] => {
        const validationErrors: string[] = [];

        if (pwd.length < 8) {
            validationErrors.push('Le mot de passe doit contenir au moins 8 caractères');
        }
        if (!/[A-Z]/.test(pwd)) {
            validationErrors.push('Le mot de passe doit contenir au moins une majuscule');
        }
        if (!/[a-z]/.test(pwd)) {
            validationErrors.push('Le mot de passe doit contenir au moins une minuscule');
        }
        if (!/[@!#$%^&*(),.?":{}|<>]/.test(pwd)) {
            validationErrors.push('Le mot de passe doit contenir au moins un caractère spécial');
        }

        return validationErrors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setErrors([]);

        // Validation côté client
        const clientErrors = validatePassword(password);
        if (clientErrors.length > 0) {
            setErrors(clientErrors);
            setLoading(false);
            return;
        }

        if (password !== passwordConfirmation) {
            setErrors(['Les mots de passe ne correspondent pas']);
            setLoading(false);
            return;
        }

        if (!token) {
            setError('Token de réinitialisation manquant');
            setLoading(false);
            return;
        }

        try {
            await resetPassword(token, password, passwordConfirmation);
            setSuccess(true);
            // Rediriger vers login après 2 secondes
            setTimeout(() => {
                navigate('/login', {
                    state: { message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' }
                });
            }, 3000);
        } catch (err: any) {
            console.error("Reset password error:", err);
            const data = err.response?.data;
            if (data?.errors && Array.isArray(data.errors)) {
                setErrors(data.errors);
            } else {
                setError(data?.message || 'Une erreur est survenue. Veuillez réessayer.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="auth-container">
                <div className="auth-content">
                    <div className="login-form-wrapper">
                        <h2 className="login-title">Erreur</h2>
                        <p className="error-message" style={{ textAlign: 'center', marginBottom: '24px' }}>{error}</p>
                        <div className="auth-footer" style={{ textAlign: 'center' }}>
                            <Link to="/forgot-password" className="auth-link" style={{ color: '#5b7cff', textDecoration: 'none', fontWeight: 500 }}>Demander un nouveau lien</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-content">
                    <div className="login-form-wrapper">
                        <h2 className="login-title">Succès</h2>
                        <p className="auth-description" style={{ textAlign: 'center', color: '#4b5563', marginBottom: '16px' }}>Votre mot de passe a été réinitialisé avec succès.</p>
                        <p className="auth-description" style={{ textAlign: 'center', color: '#4b5563' }}>Redirection vers la page de connexion...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-content">
                <div className="login-form-wrapper">
                    <h2 className="login-title">Changer votre mot de passe</h2>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-field">
                            <label htmlFor="password" className="form-label">Nouveau mot de passe</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                minLength={8}
                                className="form-input"
                            />
                        </div>
                        <div className="form-field">
                            <label htmlFor="passwordConfirmation" className="form-label">Confirmation du mot de passe</label>
                            <input
                                type="password"
                                id="passwordConfirmation"
                                value={passwordConfirmation}
                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                                required
                                disabled={loading}
                                minLength={8}
                                className="form-input"
                            />
                        </div>

                        {error && <div className="error-message" style={{ color: 'red', fontSize: '14px' }}>{error}</div>}
                        {errors.length > 0 && (
                            <div className="error-list" style={{ color: 'red', fontSize: '14px' }}>
                                <ul style={{ paddingLeft: '20px', margin: '0' }}>
                                    {errors.map((err, index) => (
                                        <li key={index} className="error-item">{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="submit-button">
                            {loading ? 'Réinitialisation...' : 'Changer mon mot de passe'}
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

export default ResetPassword;
