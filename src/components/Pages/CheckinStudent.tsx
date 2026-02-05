import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './CheckinStudent.css';
import {
  ClaimVerificationPayload,
  updateStudentCredentials,
  verifyStudentClaim,
} from '../../api/Claim';
import { useToast } from '../../hooks/useToast';

type Step = 'verify' | 'credentials' | 'completed';

interface PasswordCriteria {
  minLength: boolean;
  lowercase: boolean;
  uppercase: boolean;
  specialChar: boolean;
}

const CheckinStudent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const claimToken = searchParams.get('confirmation_token') || '';
  const { showError, showSuccess } = useToast();

  const [step, setStep] = useState<Step>('verify');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [verifiedStudent, setVerifiedStudent] = useState<Record<string, unknown> | null>(null);

  const [verificationForm, setVerificationForm] = useState<
    Omit<ClaimVerificationPayload, 'claim_token'>
  >({
    first_name: '',
    last_name: '',
    birthday: '',
  });

  const [credentialsForm, setCredentialsForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    minLength: false,
    lowercase: false,
    uppercase: false,
    specialChar: false,
  });

  useEffect(() => {
    const password = credentialsForm.password;
    setPasswordCriteria({
      minLength: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      specialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    });
  }, [credentialsForm.password]);

  const isTokenMissing = useMemo(() => !claimToken, [claimToken]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const handleVerificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVerificationForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentialsForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVerificationSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isTokenMissing) {
      const message = 'Lien invalide. Merci de scanner un QR code valide.';
      setServerMessage(message);
      showError(message);
      return;
    }

    setVerifyLoading(true);
    setServerMessage(null);

    try {
      const payload: ClaimVerificationPayload = {
        ...verificationForm,
        claim_token: claimToken,
      };
      const { data } = await verifyStudentClaim(payload);
      const student = (data?.data ?? data) as Record<string, unknown>;
      setVerifiedStudent(student);

      const emailFromApi = (student?.email as string) || '';
      if (emailFromApi) {
        setCredentialsForm((prev) => ({ ...prev, email: emailFromApi }));
      }

      setStep('credentials');
      showSuccess('Identité confirmée, merci de définir vos identifiants.');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Impossible de vérifier les informations fournies.';
      setServerMessage(message);
      showError(message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCredentialsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isTokenMissing) {
      const message = 'Lien invalide. Merci de scanner un QR code valide.';
      setServerMessage(message);
      showError(message);
      return;
    }

    if (credentialsForm.password !== credentialsForm.confirmPassword) {
      const message = 'Les mots de passe ne correspondent pas.';
      setServerMessage(message);
      showError(message);
      return;
    }

    setUpdateLoading(true);
    setServerMessage(null);

    try {
      await updateStudentCredentials({
        claim_token: claimToken,
        email: credentialsForm.email.trim(),
        password: credentialsForm.password,
        password_confirmation: credentialsForm.confirmPassword,
        birthday: verificationForm.birthday,
      });

      setStep('completed');
      showSuccess('Compte mis à jour avec succès. Vous pouvez maintenant vous connecter.');
      navigate('/login', { replace: true });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Impossible de mettre à jour vos identifiants.';
      setServerMessage(message);
      showError(message);
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="checkin-page">
      <div className="checkin-card">
        <header className="checkin-header">
          <img src="/Kinship_logo.png" alt="Kinship" className="object-contain m-auto w-40 h-10" />

          <h1>Activation de votre compte élève</h1>
          <p className="checkin-subtitle">
            Merci de confirmer votre identité pour créer vos identifiants personnels.
          </p>
        </header>

        <div className="checkin-steps">
          <div className={`checkin-step ${step !== 'verify' ? 'completed' : 'current'}`}>
            <span>1</span>
            <p>Confirmer l&apos;identité</p>
          </div>
          <div className={`checkin-step ${step === 'completed' ? 'completed' : step === 'credentials' ? 'current' : ''}`}>
            <span>2</span>
            <p>Créer ses identifiants</p>
          </div>
        </div>

        {serverMessage && <div className="checkin-alert">{serverMessage}</div>}

        {isTokenMissing && (
          <div className="checkin-alert error">
            Lien de confirmation introuvable. Merci de rouvrir le lien depuis votre QR code.
          </div>
        )}

        {step === 'verify' && (
          <form className="checkin-form" onSubmit={handleVerificationSubmit}>
            <div className="form-group">
              <label htmlFor="first_name">Prénom</label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                autoComplete="given-name"
                value={verificationForm.first_name}
                onChange={handleVerificationChange}
                placeholder="Prénom de l'élève"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Nom</label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                autoComplete="family-name"
                value={verificationForm.last_name}
                onChange={handleVerificationChange}
                placeholder="Nom de famille de l'élève"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="birthday">Date de naissance</label>
              <input
                id="birthday"
                name="birthday"
                type="date"
                max={today}
                value={verificationForm.birthday}
                onChange={handleVerificationChange}
                required
              />
            </div>

            <button type="submit" className="checkin-button" disabled={verifyLoading || isTokenMissing}>
              {verifyLoading ? 'Vérification...' : 'Confirmer le profil'}
            </button>
          </form>
        )}

        {step === 'credentials' && (
          <form className="checkin-form" onSubmit={handleCredentialsSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email de connexion</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={credentialsForm.email}
                onChange={handleCredentialsChange}
                placeholder="exemple@domaine.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={credentialsForm.password}
                onChange={handleCredentialsChange}
                placeholder="8 caractères minimum"
                minLength={8}
                required
              />
              <ul className="password-criteria-list">
                <li className={passwordCriteria.minLength ? 'valid' : 'invalid'}>
                  {passwordCriteria.minLength ? '✅' : '❌'} 8 caractères minimum
                </li>
                <li className={passwordCriteria.lowercase ? 'valid' : 'invalid'}>
                  {passwordCriteria.lowercase ? '✅' : '❌'} Une lettre minuscule
                </li>
                <li className={passwordCriteria.uppercase ? 'valid' : 'invalid'}>
                  {passwordCriteria.uppercase ? '✅' : '❌'} Une lettre majuscule
                </li>
                <li className={passwordCriteria.specialChar ? 'valid' : 'invalid'}>
                  {passwordCriteria.specialChar ? '✅' : '❌'} Un caractère spécial (!@#...)
                </li>
              </ul>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={credentialsForm.confirmPassword}
                onChange={handleCredentialsChange}
                placeholder="Répéter le mot de passe"
                minLength={8}
                required
              />
            </div>

            {verifiedStudent && (
              <p className="checkin-context">
                Compte de{' '}
                <strong>
                  {(verifiedStudent.first_name as string) || verificationForm.first_name}{' '}
                  {(verifiedStudent.last_name as string) || verificationForm.last_name}
                </strong>
              </p>
            )}

            <button type="submit" className="checkin-button" disabled={updateLoading}>
              {updateLoading ? 'Mise à jour en cours...' : 'Enregistrer mes identifiants'}
            </button>
          </form>
        )}

        {step === 'completed' && (
          <div className="checkin-success">
            <h2>Bienvenue dans Kinship !</h2>
            <p>
              Vos identifiants ont été enregistrés. Vous pouvez vous connecter depuis l&apos;application
              Kinship Pro ou attendre les prochaines instructions de votre établissement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckinStudent;

