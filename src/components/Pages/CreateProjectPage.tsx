import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createProject, getTags, Tag } from '../../api/Projects';
import { useAppContext } from '../../context/AppContext';
import { OrganizationContext } from '../../types';
import { getSelectedOrganizationId } from '../../utils/contextUtils';
import { openProjectSpace } from '../../utils/projectSpaceStore';
import {
  getContextFromPageType,
  getTagIdByPathway,
  mapApiProjectToFrontendProject,
  validateImages,
} from '../../utils/projectMapper';
import './CreateProjectPage.css';

type CreateKind = 'project' | 'stage' | 'formation';
type ParticipationMode = 'presentiel' | 'distanciel' | 'hybride';

type CarrierOrg = {
  key: string;
  name: string;
  subtitle: string;
  initials: string;
  organizationId?: number;
};

const KIND_TO_PROJECT: Record<CreateKind, 'standard' | 'stage' | 'formation'> = {
  project: 'standard',
  stage: 'stage',
  formation: 'formation',
};

const PARTICIPATION_TO_API: Record<ParticipationMode, 'on_site' | 'online' | 'blended'> = {
  presentiel: 'on_site',
  distanciel: 'online',
  hybride: 'blended',
};

function orgInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function orgSubtitle(org: OrganizationContext, fallback: string): string {
  return org.school_type || org.company_type || fallback;
}

function fromOrg(org: OrganizationContext, fallback: string): CarrierOrg {
  return {
    key: String(org.id),
    name: org.name,
    subtitle: orgSubtitle(org, fallback),
    initials: orgInitials(org.name),
    organizationId: org.id,
  };
}

function parseCreateKind(value: string | null): CreateKind | null {
  if (value === 'project' || value === 'stage' || value === 'formation') return value;
  return null;
}

const CreateProjectPage: React.FC = () => {
  const { state, setCurrentPage, setSelectedProject, addProject } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeFromUrl = parseCreateKind(searchParams.get('type'));

  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<CreateKind | null>(typeFromUrl);

  useEffect(() => {
    if (typeFromUrl) setKind(typeFromUrl);
  }, [typeFromUrl]);
  const [euMc, setEuMc] = useState(false);
  const [selectedOrgKey, setSelectedOrgKey] = useState<string>('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [pathways, setPathways] = useState<string[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState('');
  const [participationMode, setParticipationMode] = useState<ParticipationMode>('presentiel');

  const [availablePathways, setAvailablePathways] = useState<Tag[]>([]);
  const [pathwaySearch, setPathwaySearch] = useState('');
  const [pathwayOpen, setPathwayOpen] = useState(false);
  const pathwayRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const carrierOrgs = useMemo<CarrierOrg[]>(() => {
    const contexts = state.user.available_contexts;
    const pageType = state.showingPageType;

    if (pageType === 'pro') {
      const selectedId = getSelectedOrganizationId(state.user, pageType);
      const companies = contexts?.companies || [];
      const current = companies.find((c) => c.id === selectedId) || companies[0];
      return current ? [fromOrg(current, 'Entreprise')] : [];
    }

    if (pageType === 'edu') {
      const selectedId = getSelectedOrganizationId(state.user, pageType);
      const schools = contexts?.schools || [];
      const current = schools.find((s) => s.id === selectedId) || schools[0];
      return current ? [fromOrg(current, 'Établissement scolaire')] : [];
    }

    if (pageType === 'teacher') {
      const schools = contexts?.schools || [];
      const orgs = schools.map((s) => fromOrg(s, 'Établissement scolaire'));
      const independent = contexts?.independent_teacher as
        | { id?: number; organization_name?: string }
        | null
        | undefined;
      if (orgs.length === 0 || independent) {
        const name =
          independent?.organization_name || state.user.name || 'Enseignant indépendant';
        orgs.push({
          key: independent?.id != null ? `independent-${independent.id}` : 'independent',
          name,
          subtitle: 'Enseignant indépendant',
          initials: orgInitials(name),
          organizationId: independent?.id,
        });
      }
      return orgs;
    }

    return [];
  }, [state.user, state.showingPageType]);

  const selectedOrg = carrierOrgs.find((o) => o.key === selectedOrgKey) || carrierOrgs[0];
  const orgLocked = carrierOrgs.length <= 1;

  useEffect(() => {
    if (!selectedOrgKey && carrierOrgs[0]) {
      setSelectedOrgKey(carrierOrgs[0].key);
    }
  }, [carrierOrgs, selectedOrgKey]);

  useEffect(() => {
    const load = async () => {
      try {
        const tags = await getTags();
        setAvailablePathways(Array.isArray(tags) ? tags : []);
      } catch {
        setAvailablePathways([]);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (pathwayRef.current && !pathwayRef.current.contains(event.target as Node)) {
        setPathwayOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const canContinueStep1 = Boolean(kind && selectedOrg);
  const canSubmitForm =
    Boolean(title.trim() && description.trim() && startDate && endDate) &&
    !(startDate && endDate && endDate < startDate);
  const proofEnriched = Boolean(learningOutcomes.trim() && participationMode);

  const kindLabel =
    kind === 'stage' ? 'Stage' : kind === 'formation' ? 'Formation' : 'Projet';

  const goBack = () => {
    if (step === 2) {
      setStep(1);
      setSubmitError(null);
      return;
    }
    setCurrentPage('projects');
    navigate('/projects');
  };

  const togglePathway = (name: string) => {
    setPathways((prev) => {
      if (prev.includes(name)) return prev.filter((p) => p !== name);
      if (prev.length >= 2) return prev;
      return [...prev, name];
    });
  };

  const handleImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = validateImages(file, []);
    if (!validation.valid) {
      setSubmitError(validation.errors.join(', '));
      return;
    }
    setSubmitError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const saveProject = async (intent: 'draft' | 'next') => {
    if (!canSubmitForm || !kind || !selectedOrg) {
      setSubmitError('Quatre champs suffisent pour exister : titre, description, date de début, date de fin.');
      return;
    }
    if (endDate < startDate) {
      setSubmitError('La date de fin doit être postérieure à la date de début.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const tagIds = pathways
        .map((name) => getTagIdByPathway(name, availablePathways))
        .filter((id): id is number => typeof id === 'number');

      const created = await createProject(
        {
          context: getContextFromPageType(state.showingPageType),
          organization_id: selectedOrg.organizationId,
          project: {
            title: title.trim(),
            description: description.trim(),
            start_date: startDate,
            end_date: endDate,
            status: 'draft',
            private: true,
            tag_ids: tagIds,
            project_kind: KIND_TO_PROJECT[kind],
            is_eu_mc_declared: euMc,
            learning_outcomes: learningOutcomes.trim() || undefined,
            participation_mode: PARTICIPATION_TO_API[participationMode],
          },
        },
        imageFile
      );

      const mapped = mapApiProjectToFrontendProject(created, state.showingPageType, state.user);
      if (!mapped.id && created.id != null) mapped.id = String(created.id);
      addProject(mapped);

      if (intent === 'next') {
        setSelectedProject(mapped);
        openProjectSpace(mapped.id, 'gestion');
        setCurrentPage('project-space');
        navigate('/project-space');
        return;
      }

      setCurrentPage('projects');
      navigate('/projects');
    } catch (error: any) {
      if (error?.response?.data?.details) {
        setSubmitError(
          Array.isArray(error.response.data.details)
            ? error.response.data.details.join(', ')
            : String(error.response.data.details)
        );
      } else if (error?.response?.data?.message) {
        setSubmitError(error.response.data.message);
      } else {
        setSubmitError('Une erreur est survenue lors de l’enregistrement. Veuillez réessayer.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPathways = availablePathways.filter((p) => {
    const name = p.name_fr || p.name || '';
    return !pathwaySearch.trim() || name.toLowerCase().includes(pathwaySearch.toLowerCase());
  });

  return (
    <div className="create-project-page">
      <div className="cp-screen">
        <header className="cp-bar">
          <span>{step === 1 ? 'Créer' : kindLabel}</span>
          <span className="cp-bar-meta">
            {step === 1 ? 'Que voulez-vous créer ?' : selectedOrg?.name}
          </span>
        </header>

        {step === 1 ? (
          <div className="cp-inner">
            <h1 className="cp-title">Que voulez-vous créer&nbsp;?</h1>
            <p className="cp-sub">
              Trois choix pour commencer — ils deviendront définitifs au premier enregistrement.
            </p>

            <section className="cp-blk">
              <h2>
                Organisation porteuse <sup>1</sup>
              </h2>
              {carrierOrgs.length === 0 ? (
                <p className="cp-empty">Aucune organisation porteuse n’est disponible dans cet espace.</p>
              ) : orgLocked && selectedOrg ? (
                <div className="cp-orgchip">
                  <div className="cp-dot">{selectedOrg.initials}</div>
                  <div>
                    <div className="cp-orgname">{selectedOrg.name}</div>
                    <div className="cp-orgsub">{selectedOrg.subtitle}</div>
                  </div>
                  <div className="cp-lock">définitive</div>
                </div>
              ) : (
                <div className="cp-org-list">
                  {carrierOrgs.map((org) => (
                    <button
                      key={org.key}
                      type="button"
                      className={`cp-orgchip selectable ${selectedOrgKey === org.key ? 'sel' : ''}`}
                      onClick={() => setSelectedOrgKey(org.key)}
                    >
                      <div className="cp-dot">{org.initials}</div>
                      <div>
                        <div className="cp-orgname">{org.name}</div>
                        <div className="cp-orgsub">{org.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="cp-blk">
              <h2>
                Le type <sup>2</sup>
              </h2>
              <div className="cp-cards">
                <button
                  type="button"
                  className={`cp-card ${kind === 'project' ? 'sel' : ''}`}
                  onClick={() => setKind('project')}
                >
                  Projet
                  <small>il raconte ce qui s’est fait</small>
                </button>
                <div className="cp-card off">
                  Stage
                  <small>en milieu professionnel — bientôt disponible</small>
                </div>
                <div className="cp-card off">
                  Formation
                  <small>réservé aux organismes vérifiés et agréés</small>
                  <button
                    type="button"
                    className="cp-card-link"
                    onClick={() => {
                      setCurrentPage('settings');
                      navigate('/settings');
                    }}
                  >
                    Vérifier mon organisme →
                  </button>
                </div>
              </div>
            </section>

            <section className="cp-blk">
              <h2>
                Le cadre <sup>3</sup>
              </h2>
              <div className="cp-mc">
                <input type="checkbox" checked={euMc} disabled onChange={() => setEuMc(false)} />
                <div>
                  <b>Microcertification européenne</b> — réservée aux organismes vérifiés et agréés
                </div>
                <button
                  type="button"
                  className="cp-card-link"
                  onClick={() => {
                    setCurrentPage('settings');
                    navigate('/settings');
                  }}
                >
                  Vérifier mon organisme →
                </button>
              </div>
            </section>

            <div className="cp-warn">
              ⚠
              <div>
                <b>Ces trois choix seront définitifs au premier enregistrement</b> — brouillon compris.
                Avant lui, vous pouvez revenir en arrière librement.
              </div>
            </div>

            <div className="cp-cta">
              <button type="button" className="cp-btn ghost" onClick={goBack}>
                Annuler
              </button>
              <button
                type="button"
                className="cp-btn primary"
                disabled={!canContinueStep1}
                onClick={() => setStep(2)}
              >
                Continuer →
              </button>
            </div>
          </div>
        ) : (
          <div className="cp-inner">
            <h1 className="cp-title">Votre projet</h1>
            <p className="cp-sub">
              Quatre champs suffisent pour exister — le reste enrichit votre preuve.
            </p>

            <label className="cp-field">
              <span>
                Titre du projet <span className="ob">✱</span>
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ateliers radio — Paroles de quartier"
              />
            </label>

            <label className="cp-field">
              <span>
                Description <span className="ob">✱</span>
              </span>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ce que le projet raconte, pour qui, et ce qui s’y fait."
              />
            </label>

            <div className="cp-two">
              <label className="cp-field">
                <span>
                  Date estimée de début <span className="ob">✱</span>
                </span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className="cp-field">
                <span>
                  Date estimée de fin <span className="ob">✱</span>
                </span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
            </div>

            <div className="cp-field">
              <span>
                Image du projet <em>— optionnelle</em>
              </span>
              <div className="cp-imgzone">
                <div
                  className={`cp-imgprev ${imagePreview ? 'has-img' : ''}`}
                  style={imagePreview ? { backgroundImage: `url(${imagePreview})` } : undefined}
                >
                  {!imagePreview && (title.trim() || 'Titre du projet')}
                </div>
                <div className="cp-imgnote">
                  Sans image, votre affiche porte le titre sur la couleur de votre espace.
                  <button type="button" className="cp-card-link" onClick={() => fileInputRef.current?.click()}>
                    {imagePreview ? 'Changer l’image →' : 'Ajouter une image →'}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  hidden
                  onChange={handleImage}
                />
              </div>
            </div>

            <div className="cp-field" ref={pathwayRef}>
              <span>
                Parcours <em>— choisir parmi les parcours proposés (max 2)</em>
              </span>
              {pathways.length > 0 && (
                <div className="cp-chips">
                  {pathways.map((name) => (
                    <button key={name} type="button" className="cp-chip" onClick={() => togglePathway(name)}>
                      {name} ✓
                    </button>
                  ))}
                </div>
              )}
              <input
                type="search"
                value={pathwaySearch}
                placeholder={pathways.length >= 2 ? 'Maximum 2 parcours sélectionnés' : 'Rechercher…'}
                disabled={pathways.length >= 2}
                onChange={(e) => setPathwaySearch(e.target.value)}
                onFocus={() => pathways.length < 2 && setPathwayOpen(true)}
              />
              {pathwayOpen && pathways.length < 2 && (
                <div className="cp-pathway-drop">
                  {filteredPathways.map((p) => {
                    const name = p.name_fr || p.name;
                    const selected = pathways.includes(name);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={selected ? 'sel' : ''}
                        onClick={() => {
                          togglePathway(name);
                          setPathwaySearch('');
                          if (pathways.length >= 1) setPathwayOpen(false);
                        }}
                      >
                        {name}
                      </button>
                    );
                  })}
                  {filteredPathways.length === 0 && <p>Aucun parcours trouvé.</p>}
                </div>
              )}
            </div>

            <div className="cp-gold">
              <label className="cp-field">
                <span>Acquis d’apprentissage</span>
                <textarea
                  rows={3}
                  value={learningOutcomes}
                  onChange={(e) => setLearningOutcomes(e.target.value)}
                  placeholder="S’exprimer au micro · préparer et mener une interview · travailler en équipe"
                />
              </label>
              <div className="cp-field">
                <span>Mode de participation</span>
                <div className="cp-radio">
                  {([
                    ['presentiel', 'Présentiel'],
                    ['distanciel', 'Distanciel'],
                    ['hybride', 'Hybride'],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`cp-ropt ${participationMode === id ? 'sel' : ''}`}
                      onClick={() => setParticipationMode(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="cp-gold-note">
                  {proofEnriched
                    ? <>Acquis + participation remplis → votre preuve passera en <b>Enrichie</b>.</>
                    : 'Acquis + participation remplis → votre preuve passera en Enrichie.'}
                </p>
              </div>
            </div>

            {submitError && <div className="cp-error">{submitError}</div>}

            <div className="cp-foot">
              <button type="button" className="cp-btn ghost cp-foot-cancel" onClick={goBack} disabled={isSubmitting}>
                Annuler
              </button>
              <div className="cp-fcol">
                <button
                  type="button"
                  className="cp-btn outline"
                  disabled={!canSubmitForm || isSubmitting}
                  onClick={() => void saveProject('draft')}
                >
                  {isSubmitting ? 'Enregistrement…' : 'Sauvegarder en brouillon'}
                </button>
                <p className="cp-micro">
                  Les co-responsables et vos partenaires pourront y accéder une fois le projet créé.
                </p>
              </div>
              <div className="cp-fcol">
                <button
                  type="button"
                  className="cp-btn primary"
                  disabled={!canSubmitForm || isSubmitting}
                  onClick={() => void saveProject('next')}
                >
                  {isSubmitting ? 'Enregistrement…' : 'Suivant →'}
                </button>
                <p className="cp-micro">L’espace de gestion : préparez tout, puis créez.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateProjectPage;
