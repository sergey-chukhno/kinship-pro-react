import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AddSessionParticipantModal from './AddSessionParticipantModal';

describe('AddSessionParticipantModal', () => {
  const onClose = jest.fn();
  const onAdd = jest.fn();

  beforeEach(() => {
    onClose.mockReset();
    onAdd.mockReset();
  });

  function fillValidAdult() {
    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: 'Benali' } });
    fireEvent.change(screen.getByLabelText(/^Prénom/), { target: { value: 'Nadia' } });
    fireEvent.change(screen.getByLabelText(/^Date de naissance/), {
      target: { value: '1996-06-14' },
    });
    fireEvent.change(screen.getByLabelText(/^E-mail/), {
      target: { value: 'n.benali@exemple.fr' },
    });
  }

  it('renders nothing when closed', () => {
    const { container } = render(
      <AddSessionParticipantModal open={false} onClose={onClose} onAdd={onAdd} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows under-15 warning without disabling Ajouter', () => {
    render(<AddSessionParticipantModal open onClose={onClose} onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: 'Benali' } });
    fireEvent.change(screen.getByLabelText(/^Prénom/), { target: { value: 'Nadia' } });
    fireEvent.change(screen.getByLabelText(/^Date de naissance/), {
      target: { value: '2012-06-14' },
    });
    fireEvent.change(screen.getByLabelText(/^E-mail/), {
      target: { value: 'n.benali@exemple.fr' },
    });

    expect(
      screen.getByText(/Date de naissance : moins de 15 ans\./i)
    ).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /^Ajouter$/i });
    expect(addBtn).not.toBeDisabled();
  });

  it('does not warn when birthdate is 15+', () => {
    render(<AddSessionParticipantModal open onClose={onClose} onAdd={onAdd} />);
    fillValidAdult();
    expect(
      screen.queryByText(/Date de naissance : moins de 15 ans\./i)
    ).not.toBeInTheDocument();
  });

  it('submits an inscrit participant (pending false)', () => {
    render(<AddSessionParticipantModal open onClose={onClose} onAdd={onAdd} />);
    fillValidAdult();

    fireEvent.click(screen.getByRole('button', { name: /^Ajouter$/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      name: 'Nadia Benali',
      email: 'n.benali@exemple.fr',
      role: 'participant',
      pending: false,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps Ajouter disabled until required fields are filled', () => {
    render(<AddSessionParticipantModal open onClose={onClose} onAdd={onAdd} />);
    expect(screen.getByRole('button', { name: /^Ajouter$/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: 'Benali' } });
    expect(screen.getByRole('button', { name: /^Ajouter$/i })).toBeDisabled();

    fillValidAdult();
    expect(screen.getByRole('button', { name: /^Ajouter$/i })).not.toBeDisabled();
  });
});
