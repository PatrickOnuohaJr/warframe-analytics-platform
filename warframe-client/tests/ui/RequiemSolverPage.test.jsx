import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// The page talks to Supabase only through lib/requiemStore, so mock that.
vi.mock('../../src/lib/requiemStore', () => ({
  loadActive: vi.fn(async () => ({ session: null, attempts: [], error: null })),
  createSession: vi.fn(async () => ({ id: 's1', error: null })),
  updateSession: vi.fn(async () => null),
  syncAttempts: vi.fn(async () => null),
  nextAttemptNumber: attempts => attempts.length + 1,
  newId: (() => { let n = 0; return () => `id${n++}`; })(),
  isMissingTable: () => false,
  validateSessionFields: () => [],
}));

import RequiemSolverPage from '../../src/pages/RequiemSolverPage';

describe('RequiemSolverPage', () => {
  it('solves the Khra / Netra scenario from recorded stabs', async () => {
    const user = userEvent.setup();
    render(<RequiemSolverPage />);
    await screen.findByText('Requiem Solver');

    await user.click(screen.getByLabelText('I have an Oull to use'));
    await user.click(screen.getByRole('button', { name: /^Khra.*Unknown/ }));
    await user.click(screen.getByRole('button', { name: /^Netra.*Unknown/ }));

    // Record the three historical stabs through the form.
    const record = async (mods, failedAt) => {
      await user.click(screen.getByRole('button', { name: 'Record a stab' }));
      const selects = screen.getAllByRole('combobox').slice(-3);
      for (let i = 0; i < 3; i++) await user.selectOptions(selects[i], mods[i]);
      await user.click(screen.getByLabelText(`Failed at ${failedAt}`));
      await user.click(screen.getByRole('button', { name: 'Record stab' }));
    };
    await record(['Oull', 'Netra', 'Khra'], 2);
    await record(['Oull', 'Khra', 'Netra'], 2);
    await record(['Netra', 'Oull', 'Khra'], 1);

    await waitFor(() => expect(screen.getByText('KHRA → OULL → NETRA')).toBeTruthy());
    expect(screen.getByText(/Guaranteed win/)).toBeTruthy();
    expect(screen.getByText('OPTIONAL ULTIMATUM')).toBeTruthy();

    // Undo removes the last stab and the recommendation changes.
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(screen.queryByText('KHRA → OULL → NETRA')).toBeNull());
  });

  it('flags contradictory evidence instead of inventing a solution', async () => {
    const user = userEvent.setup();
    render(<RequiemSolverPage />);
    await screen.findByText('Requiem Solver');
    const record = async (failedAt) => {
      await user.click(screen.getByRole('button', { name: 'Record a stab' }));
      const selects = screen.getAllByRole('combobox').slice(-3);
      for (const [i, m] of ['Khra', 'Netra', 'Lohk'].entries()) await user.selectOptions(selects[i], m);
      await user.click(screen.getByLabelText(`Failed at ${failedAt}`));
      await user.click(screen.getByRole('button', { name: 'Record stab' }));
    };
    await record(2);
    await record(3);
    await waitFor(() => expect(screen.getByText(/Evidence conflict/)).toBeTruthy());
    expect(within(screen.getByText(/Evidence conflict/).parentElement).getByText(/Likely typo/)).toBeTruthy();
  });
});
