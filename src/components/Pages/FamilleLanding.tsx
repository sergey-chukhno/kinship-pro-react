import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getFamillePage } from '../../api/ParentLinks';
import './FamilleLanding.css';

type Status = 'loading' | 'ready' | 'error';

const FamilleLanding: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const hasJwt = Boolean(localStorage.getItem('jwt_token'));

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await getFamillePage(token);
        if (cancelled) return;
        setSchoolName(res.data.data.school_name);
        setSchoolCity(res.data.data.school_city);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const redirectTarget = encodeURIComponent('/mes-enfants');

  return (
    <div className="famille-landing-page">
      <div className="famille-landing-inner">
        <img src="/Kinship_logo.png" alt="Kinship" className="famille-landing-logo" />

        {status === 'loading' && <p className="famille-muted">Chargement…</p>}

        {status === 'error' && (
          <>
            <h1 className="famille-title">Lien indisponible</h1>
            <hr className="famille-title-rule" />
            <p className="famille-body">
              Ce lien n&apos;est pas valide. Adressez-vous à l&apos;établissement si besoin.
            </p>
            <Link className="famille-btn-secondary" to="/login">
              Se connecter
            </Link>
          </>
        )}

        {status === 'ready' && (
          <>
            <h1 className="famille-title">
              Le {schoolName}
              {schoolCity ? `, à ${schoolCity}` : ''}, a inscrit votre enfant sur Kinship — pour
              valoriser ses expériences et son implication dans les différents projets du collège.
            </h1>
            <hr className="famille-title-rule" />

            <section className="famille-block">
              <div className="famille-label">Ce que vous pourrez suivre</div>
              <ul>
                <li>
                  Les <strong>projets</strong> auxquels il participe et ce qu&apos;il y fait
                </li>
                <li>
                  Les <strong>compétences</strong> qu&apos;il y développe — travail d&apos;équipe,
                  prise de parole, création — <strong>attestées par le collège</strong> au fil de
                  l&apos;année
                </li>
                <li>
                  Et son <strong>parcours</strong>, qui se construit d&apos;année en année
                </li>
              </ul>
            </section>

            <section className="famille-block">
              <div className="famille-label">Pour le suivre</div>
              <p className="famille-body">
                Créez votre compte — ou connectez-vous si vous en avez déjà un — puis, dans
                l&apos;onglet « Mes enfants »,{' '}
                <strong>
                  saisissez le code que l&apos;école vous remet et la date de naissance de votre
                  enfant.
                </strong>
              </p>

              {hasJwt ? (
                <button
                  type="button"
                  className="famille-btn-primary"
                  onClick={() => navigate('/mes-enfants')}
                >
                  Continuer vers Mes enfants
                </button>
              ) : (
                <>
                  <Link
                    className="famille-btn-primary"
                    to={`/register/user?redirect=${redirectTarget}`}
                  >
                    Créer mon compte
                  </Link>
                  <p className="famille-login-hint">
                    Déjà un compte ?{' '}
                    <Link to={`/login?redirect=${redirectTarget}`}>Se connecter</Link>
                  </p>
                </>
              )}
            </section>

            <section className="famille-block famille-block-last">
              <div className="famille-label">Vous pensez qu&apos;il y a une erreur ?</div>
              <p className="famille-body">
                Adressez-vous directement à l&apos;établissement — c&apos;est lui qui tient le
                dossier d&apos;inscription.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default FamilleLanding;
