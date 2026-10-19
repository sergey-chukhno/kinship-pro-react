import React from 'react';
import { render, screen } from '@testing-library/react';
import CatalogueSessionTodoTile from './CatalogueSessionTodoTile';

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => jest.fn(),
  }),
  { virtual: true }
);

jest.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    setCurrentPage: jest.fn(),
  }),
}));

describe('CatalogueSessionTodoTile (P4.0)', () => {
  it('uses exact À faire catalogue copy', () => {
    render(<CatalogueSessionTodoTile />);
    expect(screen.getByText('Votre catalogue')).toBeInTheDocument();
    expect(screen.getByText('Ouvrir une session')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Choisissez une formation dans votre catalogue : dates, formateur responsable, participants/
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ouvrir une session →/ })).toBeInTheDocument();
  });
});
