import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MOCK_PB_NOMINAL } from '../../data/mockProofs';
import { ProofData } from '../../types/proof';
import { mapPbProofApiToProofData, normalizeBadgeProofResponse } from '../../utils/pbProofMapper';
import ProofCardIntermediate from './ProofCardIntermediate';
import ProofFullView from './ProofFullView';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({
      children,
      to,
      ...rest
    }: {
      children?: React.ReactNode;
      to: string;
      [key: string]: unknown;
    }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  }),
  { virtual: true }
);

jest.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showInfo: jest.fn(),
    showWarning: jest.fn(),
  }),
}));

function proofWith(overrides: Partial<ProofData>): ProofData {
  return { ...MOCK_PB_NOMINAL, ...overrides };
}

function openDetailsAccordion() {
  fireEvent.click(screen.getByRole('button', { name: /Détails et vérification/i }));
}

describe('Proof compétences display (Patrick public proof)', () => {
  describe('ProofFullView', () => {
    it('shows label Compétences (not Compétences validées) when skills are present', () => {
      render(<ProofFullView proof={MOCK_PB_NOMINAL} />);

      expect(screen.getByText('Compétences')).toBeInTheDocument();
      expect(screen.queryByText('Compétences validées')).not.toBeInTheDocument();
      expect(
        screen.getByText("Parle et argumente à l'oral de façon claire et organisée")
      ).toBeInTheDocument();
    });

    it('hides the compétences zone when skills are empty and presence is not verified', () => {
      render(<ProofFullView proof={proofWith({ skills: [], presenceVerified: false })} />);

      expect(screen.queryByText('Compétences')).not.toBeInTheDocument();
      expect(screen.queryByText('Compétences validées')).not.toBeInTheDocument();
    });

    it('keeps the presence block when presenceVerified even if skills are empty', () => {
      render(
        <ProofFullView
          proof={proofWith({
            skills: [],
            presenceVerified: true,
            presenceDate: '1 mars 2026',
            presenceLocation: 'Paris',
          })}
        />
      );

      expect(screen.getByText('Compétences')).toBeInTheDocument();
      expect(screen.getByText('Présence physique vérifiée')).toBeInTheDocument();
    });
  });

  describe('ProofCardIntermediate', () => {
    it('shows label Compétences when skills are present', () => {
      render(<ProofCardIntermediate proof={MOCK_PB_NOMINAL} />);

      expect(screen.getByText('Compétences')).toBeInTheDocument();
      expect(screen.queryByText('Compétences validées')).not.toBeInTheDocument();
    });

    it('hides the compétences block when skills are empty and presence is not verified', () => {
      render(
        <ProofCardIntermediate proof={proofWith({ skills: [], presenceVerified: false })} />
      );

      expect(screen.queryByText('Compétences')).not.toBeInTheDocument();
    });
  });
});

describe('ProofFullView UX hide (Patrick)', () => {
  it('hides integrity hashes, JSON export, empty evidence, absent PP, and rights link', () => {
    render(
      <ProofFullView
        proof={proofWith({
          evidence: { filename: null, type: null, hash: null },
          senderComment: null,
          senderCommentLang: null,
          ppProofNumber: null,
          showRightsLink: false,
        })}
      />
    );

    expect(screen.queryByRole('button', { name: /Détails et vérification/i })).not.toBeInTheDocument();
    expect(screen.queryByText('payload_hash')).not.toBeInTheDocument();
    expect(screen.queryByText('hash_version')).not.toBeInTheDocument();
    expect(screen.queryByText('Exporter JSON')).not.toBeInTheDocument();
    expect(screen.queryByText('Non renseigné')).not.toBeInTheDocument();
    expect(screen.queryByText(/Preuve Projet — non encore générée/)).not.toBeInTheDocument();
    expect(screen.queryByText('Exercer mes droits')).not.toBeInTheDocument();
    // Zone 6 stays outside accordion
    expect(screen.getByText('Partager et exporter')).toBeInTheDocument();
    expect(screen.getByText('Ajouter à un profil')).toBeInTheDocument();
  });

  it('shows justificatif and PP link when data is present', () => {
    render(
      <ProofFullView
        proof={proofWith({
          evidence: { filename: 'preuve.pdf', type: 'pdf', hash: 'abc' },
          ppProofNumber: 'PP·2026·FR·TEST',
        })}
      />
    );

    openDetailsAccordion();

    expect(screen.getByText("Justificatif de l'attribution")).toBeInTheDocument();
    expect(screen.getByText('preuve.pdf')).toBeInTheDocument();
    expect(screen.getByText('Voir la Preuve Projet →')).toBeInTheDocument();
  });

  it('shows Titulaire label without Porteur/badge role copy', () => {
    render(<ProofFullView proof={proofWith({ holderRole: '' })} />);

    expect(screen.getByText('Titulaire')).toBeInTheDocument();
    expect(screen.queryByText(/Porteur/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/badge/i)).not.toBeInTheDocument();
  });

  it('hides Détails accordion when evidence, comment and PP are all absent', () => {
    render(
      <ProofFullView
        proof={proofWith({
          evidence: { filename: null, type: null, hash: null },
          senderComment: null,
          senderCommentLang: null,
          ppProofNumber: null,
        })}
      />
    );

    expect(screen.queryByRole('button', { name: /Détails et vérification/i })).not.toBeInTheDocument();
    expect(screen.getByText('Partager et exporter')).toBeInTheDocument();
  });

  it('keeps Détails accordion when only sender comment is present', () => {
    render(
      <ProofFullView
        proof={proofWith({
          evidence: { filename: null, type: null, hash: null },
          senderComment: 'Bien joué',
          ppProofNumber: null,
        })}
      />
    );

    expect(screen.getByRole('button', { name: /Détails et vérification/i })).toBeInTheDocument();
  });
});

describe('pbProofMapper showRightsLink', () => {
  it('maps public proof with showRightsLink false', () => {
    const api = normalizeBadgeProofResponse(
      {
        proof_number: 'PB·1',
        proof_type: 'PB',
        holder_display: 'Titulaire',
      },
      'TOKEN'
    );
    expect(mapPbProofApiToProofData(api).showRightsLink).toBe(false);
  });

  it('maps default holderRole empty (no Porteur du badge)', () => {
    const api = normalizeBadgeProofResponse(
      {
        proof_number: 'PB·1',
        proof_type: 'PB',
        holder_display: 'Titulaire',
      },
      'TOKEN'
    );
    expect(mapPbProofApiToProofData(api).holderRole).toBe('');
  });
});
