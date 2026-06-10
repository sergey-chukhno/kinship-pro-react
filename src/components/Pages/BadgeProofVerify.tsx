import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyBadgeProof } from '../../api/BadgeProofVerify';
import {
  VERIFY_ANOMALY_SUBTITLE,
  VERIFY_ANOMALY_TITLE,
  VERIFY_INPUT_PLACEHOLDER,
  VERIFY_NOT_FOUND_SUBTITLE,
  VERIFY_NOT_FOUND_TITLE,
  VERIFY_PAGE_EYEBROW,
  VERIFY_PAGE_SUBTITLE,
  VERIFY_PAGE_TITLE,
  VERIFY_SUCCESS_TITLE,
} from '../../constants/badgeProofVerify';
import { BadgeProofVerifyResult } from '../../types/badgeProofVerify';
import { getBadgeProofVerifyDisplayPath } from '../../utils/badgeProofShareHost';
import './BadgeProofVerify.css';

const BadgeProofVerify: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery =
    searchParams.get('proof') ||
    searchParams.get('proof_number') ||
    searchParams.get('hash') ||
    searchParams.get('q') ||
    '';

  const [input, setInput] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BadgeProofVerifyResult | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);

  const runVerify = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Saisissez un numéro de preuve, une URL de partage ou un payload_hash.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await verifyBadgeProof(trimmed);
      setResult(data);
      setStepsOpen(false);
    } catch (err: any) {
      setResult(null);
      setError(
        err?.message ||
          err?.response?.data?.error ||
          'Impossible d’effectuer la vérification. Réessayez plus tard.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery.trim()) {
      void runVerify(initialQuery);
    }
  }, [initialQuery, runVerify]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runVerify(input);
  };

  const isSuccess = result?.status === 'authentic';
  const resultTitle = isSuccess
    ? VERIFY_SUCCESS_TITLE
    : result?.status === 'anomaly'
      ? VERIFY_ANOMALY_TITLE
      : VERIFY_NOT_FOUND_TITLE;

  const resultSubtitle =
    result?.subtitle ||
    (result?.status === 'anomaly' ? VERIFY_ANOMALY_SUBTITLE : VERIFY_NOT_FOUND_SUBTITLE);

  return (
    <div className="badge-proof-verify-page">
      <div className="badge-proof-verify-wrap">
        <Link to="/badges" className="badge-proof-verify-back">
          ← Retour à Kinship
        </Link>

        <div className="badge-proof-verify-card">
          <header className="badge-proof-verify-header">
            <img
              src="/Kinship_logo.png"
              alt="Kinship"
              className="badge-proof-verify-logo-img"
            />
            <p className="badge-proof-verify-eyebrow">{VERIFY_PAGE_EYEBROW}</p>
            <h1 className="badge-proof-verify-title">{VERIFY_PAGE_TITLE}</h1>
            <p className="badge-proof-verify-subtitle">{VERIFY_PAGE_SUBTITLE}</p>
            <div className="badge-proof-verify-url">{getBadgeProofVerifyDisplayPath()}</div>
          </header>

          <div className="badge-proof-verify-body">
            <form className="badge-proof-verify-input-row" onSubmit={handleSubmit}>
              <input
                className="badge-proof-verify-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={VERIFY_INPUT_PLACEHOLDER}
                aria-label="Référence de preuve à vérifier"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                className="badge-proof-verify-submit"
                disabled={loading}
              >
                {loading ? 'Vérification…' : 'Vérifier'}
              </button>
            </form>

            {error && <div className="badge-proof-verify-error">{error}</div>}

            {result && (
              <>
                <div
                  className={`badge-proof-verify-result ${
                    isSuccess
                      ? 'badge-proof-verify-result--success'
                      : 'badge-proof-verify-result--fail'
                  }`}
                >
                  <div className="badge-proof-verify-result-icon" aria-hidden>
                    {isSuccess ? '✓' : '✗'}
                  </div>
                  <h2
                    className={`badge-proof-verify-result-title ${
                      isSuccess
                        ? 'badge-proof-verify-result-title--success'
                        : 'badge-proof-verify-result-title--fail'
                    }`}
                  >
                    {resultTitle}
                  </h2>
                  <p className="badge-proof-verify-result-sub">{resultSubtitle}</p>
                </div>

                {result.summary.length > 0 && (
                  <div className="badge-proof-verify-summary">
                    {result.summary.map((field) => (
                      <div key={field.label} className="badge-proof-verify-field">
                        <div className="badge-proof-verify-field-label">{field.label}</div>
                        <div
                          className={`badge-proof-verify-field-value${
                            field.mono ? ' badge-proof-verify-field-value--mono' : ''
                          }`}
                        >
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="badge-proof-verify-steps-title"
                  onClick={() => setStepsOpen((o) => !o)}
                  aria-expanded={stepsOpen}
                >
                  <span aria-hidden>{stepsOpen ? '▼' : '▶'}</span>
                  Détail technique de la vérification (6 étapes)
                </button>

                {stepsOpen && (
                  <div className="badge-proof-verify-steps">
                    {result.steps.map((step) => (
                      <div key={step.num} className="badge-proof-verify-step">
                        <div className="badge-proof-verify-step-num">{step.num}</div>
                        <div>
                          <div className="badge-proof-verify-step-label">{step.label}</div>
                          <div className="badge-proof-verify-step-desc">{step.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgeProofVerify;
