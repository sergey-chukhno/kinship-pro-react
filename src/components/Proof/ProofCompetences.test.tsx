import React from 'react';
import { render, screen } from '@testing-library/react';
import { MOCK_PB_NOMINAL } from '../../data/mockProofs';
import { ProofData } from '../../types/proof';
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
