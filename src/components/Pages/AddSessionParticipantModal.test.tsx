import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddSessionParticipantModal from './AddSessionParticipantModal';

describe('AddSessionParticipantModal', () => {
  const onClose = jest.fn();
  const onSubmit = jest.fn();

  beforeEach(() => {
    onClose.mockReset();
    onSubmit.mockReset();
    onSubmit.mockResolvedValue(undefined);
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
      <AddSessionParticipantModal open={false} onClose={onClose} onSubmit={onSubmit} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows under-15 warning without disabling Ajouter', () => {
    render(<AddSessionParticipantModal open onClose={onClose} onSubmit={onSubmit} />);

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
    render(<AddSessionParticipantModal open onClose={onClose} onSubmit={onSubmit} />);
    fillValidAdult();
    expect(
      screen.queryByText(/Date de naissance : moins de 15 ans\./i)
    ).not.toBeInTheDocument();
  });

  it('submits pre_register payload and closes on success', async () => {
    render(<AddSessionParticipantModal open onClose={onClose} onSubmit={onSubmit} />);
    fillValidAdult();

    fireEvent.click(screen.getByRole('button', { name: /^Ajouter$/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      first_name: 'Nadia',
      last_name: 'Benali',
      birthday: '1996-06-14',
      email: 'n.benali@exemple.fr',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('keeps modal open and shows error when submit fails', async () => {
    onSubmit.mockRejectedValue(new Error('Déjà inscrit à la session.'));
    render(<AddSessionParticipantModal open onClose={onClose} onSubmit={onSubmit} />);
    fillValidAdult();

    fireEvent.click(screen.getByRole('button', { name: /^Ajouter$/i }));

    await waitFor(() =>
      expect(screen.getByText(/Déjà inscrit à la session\./i)).toBeInTheDocument()
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /Ajouter un participant/i })).toBeInTheDocument();
  });

  it('keeps Ajouter disabled until required fields are filled', () => {
    render(<AddSessionParticipantModal open onClose={onClose} onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: /^Ajouter$/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: 'Benali' } });
    expect(screen.getByRole('button', { name: /^Ajouter$/i })).toBeDisabled();

    fillValidAdult();
    expect(screen.getByRole('button', { name: /^Ajouter$/i })).not.toBeDisabled();
  });
});
