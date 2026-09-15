import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './CheckinStudent.css';
import '../RegisterForm/CommonForms.css';
import {
  ClaimVerificationPayload,
  downloadClaimPersonalKeyPdf,
  revealClaimPersonalKey,
  updateStudentCredentials,
  verifyStudentClaim,
} from '../../api/Claim';
import { useToast } from '../../hooks/useToast';
import { privatePolicy } from '../../data/PrivacyPolicy';

type Step = 'verify' | 'choice' | 'credentials' | 'pik_revealed' | 'completed';

interface PasswordCriteria {
  minLength: boolean;
  lowercase: boolean;
  uppercase: boolean;
  specialChar: boolean;
}

const FEATURE_PIK_REMISE = process.env.REACT_APP_FEATURE_PIK_REMISE === 'true';

const CheckinStudent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const claimToken = searchParams.get('confirmation_token') || '';
  const { showError, showSuccess } = useToast();

  const [step, setStep] = useState<Step>('verify');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [pikLoading, setPikLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [verifiedStudent, setVerifiedStudent] = useState<Record<string, unknown> | null>(null);
  const [pikPlaintext, setPikPlaintext] = useState<string | null>(null);
  const [pikPdfToken, setPikPdfToken] = useState<string | null>(null);

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

  const [acceptPrivacyPolicy, setAcceptPrivacyPolicy] = useState(false);

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

      if (FEATURE_PIK_REMISE) {
        setStep('choice');
        showSuccess('Identité confirmée.');
      } else {
        setStep('credentials');
        showSuccess('Identité confirmée, merci de définir vos identifiants.');
      }
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

  const handleRevealPersonalKey = async () => {
    if (isTokenMissing) {
      const message = 'Lien invalide. Merci de scanner un QR code valide.';
      setServerMessage(message);
      showError(message);
      return;
    }

    setPikLoading(true);
    setServerMessage(null);
    try {
      const { data } = await revealClaimPersonalKey({
        ...verificationForm,
        claim_token: claimToken,
      });
      setPikPlaintext(data.plaintext);
      setPikPdfToken(data.pdf_token);
      setStep('pik_revealed');
      showSuccess('Clé personnelle remise. Enregistrez-la maintenant.');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Impossible de récupérer la clé personnelle.';
      setServerMessage(message);
      showError(message);
    } finally {
      setPikLoading(false);
    }
  };

  const handleDownloadPikPdf = async () => {
    if (!pikPdfToken) return;
    setPikLoading(true);
    try {
      await downloadClaimPersonalKeyPdf(pikPdfToken);
      setPikPdfToken(null);
      showSuccess('PDF téléchargé.');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Téléchargement impossible ou expiré.';
      setServerMessage(message);
      showError(message);
    } finally {
      setPikLoading(false);
    }
  };

  const handleCopyPik = async () => {
    if (!pikPlaintext) return;
    try {
      await navigator.clipboard.writeText(pikPlaintext.replace(/\s+/g, ''));
      showSuccess('Clé copiée.');
    } catch {
      showError('Copie impossible.');
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
        accept_privacy_policy: acceptPrivacyPolicy,
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

  const showSteps = step === 'verify' || step === 'choice' || step === 'credentials';

  return (
    <div className="checkin-page">
      <div className="checkin-card">
        <header className="checkin-header">
          <img src="/Kinship_logo.png" alt="Kinship" className="object-contain m-auto w-40 h-10" />

          <h1>
            {step === 'pik_revealed' || step === 'choice'
              ? 'Votre clé personnelle'
              : 'Activation de votre compte'}
          </h1>
          <p className="checkin-subtitle">
            {step === 'choice'
              ? 'Une clé vous appartient. Elle vous permettra de retrouver et de gérer vos preuves plus tard — même sans compte.'
              : step === 'pik_revealed'
                ? 'Enregistrez-la maintenant. Nous ne pourrons pas vous la réafficher — et nous ne vous l’enverrons jamais par email.'
                : 'Merci de confirmer votre identité pour créer vos identifiants personnels.'}
          </p>
        </header>

        {showSteps && (
          <div className="checkin-steps">
            <div className={`checkin-step ${step !== 'verify' ? 'completed' : 'current'}`}>
              <span>1</span>
              <p>Confirmer l&apos;identité</p>
            </div>
            <div
              className={`checkin-step ${
                step === 'completed' ? 'completed' : step === 'credentials' || step === 'choice' ? 'current' : ''
              }`}
            >
              <span>2</span>
              <p>{FEATURE_PIK_REMISE ? 'Suite' : 'Créer ses identifiants'}</p>
            </div>
          </div>
        )}

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

        {step === 'choice' && FEATURE_PIK_REMISE && (
          <div className="checkin-form">
            <p className="checkin-context">
              Bonjour{' '}
              <strong>
                {verificationForm.first_name} {verificationForm.last_name}
              </strong>
              .
            </p>
            <button
              type="button"
              className="checkin-button checkin-button-pik"
              disabled={pikLoading || isTokenMissing}
              onClick={() => void handleRevealPersonalKey()}
            >
              {pikLoading ? 'Remise en cours…' : 'Récupérer ma clé personnelle'}
            </button>
            <button
              type="button"
              className="checkin-button checkin-button-secondary"
              disabled={pikLoading}
              onClick={() => setStep('credentials')}
            >
              Créer mes identifiants
            </button>
            <p className="checkin-pik-hint">
              Récupérer la clé consomme ce code document — comme une activation. Vous ne pourrez plus
              l&apos;utiliser ensuite pour créer un compte depuis ce lien.
            </p>
          </div>
        )}

        {step === 'pik_revealed' && (
          <div className="checkin-form">
            <div className="checkin-pik-reveal">
              <p className="checkin-pik-label">Votre Clé personnelle Kinship</p>
              <p className="checkin-pik-value">{pikPlaintext}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="checkin-button"
                disabled={pikLoading || !pikPdfToken}
                onClick={() => void handleDownloadPikPdf()}
              >
                Télécharger le PDF
              </button>
              <button
                type="button"
                className="checkin-button checkin-button-secondary"
                disabled={!pikPlaintext}
                onClick={() => void handleCopyPik()}
              >
                Copier
              </button>
            </div>
          </div>
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

            <div className="form-group">
              <label>Politique de confidentialité</label>
              <div className="privacy-policy-scroll-box !bg-white">
                <pre>{privatePolicy}</pre>
              </div>
              <label className="checkbox-toggle">
                <input
                  type="checkbox"
                  checked={acceptPrivacyPolicy}
                  onChange={(e) => setAcceptPrivacyPolicy(e.target.checked)}
                  required
                />
                <span>J&apos;accepte la politique de confidentialité *</span>
              </label>
            </div>

            {verifiedStudent && (
              <p className="checkin-context">
                Compte de{' '}
                <strong>
                  {verificationForm.first_name} {verificationForm.last_name}
                </strong>
              </p>
            )}

            {FEATURE_PIK_REMISE ? (
              <button
                type="button"
                className="checkin-button checkin-button-secondary"
                onClick={() => setStep('choice')}
              >
                Retour
              </button>
            ) : null}

            <button type="submit" className="checkin-button" disabled={updateLoading || !acceptPrivacyPolicy}>
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
