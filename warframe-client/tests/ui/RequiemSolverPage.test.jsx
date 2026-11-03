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

// The Kuva cycle tracker on the same page has its own store; keep it offline too.
vi.mock('../../src/lib/weaponCycleStore', () => ({
  loadCycle: vi.fn(async () => ({ state: null, error: null })),
  saveCycle: vi.fn(async () => null),
  isMissingTable: () => false,
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
      const selects = [1, 2, 3].map(n => screen.getByLabelText(`Slot ${n}`));
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

  it('replaces the recommendation with a done summary once a stab wins', async () => {
    const user = userEvent.setup();
    render(<RequiemSolverPage />);
    await screen.findByText('Requiem Solver');
    await user.click(screen.getByRole('button', { name: 'Record a stab' }));
    const selects = [1, 2, 3].map(n => screen.getByLabelText(`Slot ${n}`));
    for (const [i, m] of ['Netra', 'Oull', 'Khra'].entries()) await user.selectOptions(selects[i], m);
    await user.click(screen.getByLabelText('All three passed'));
    await user.click(screen.getByRole('button', { name: 'Record stab' }));

    await waitFor(() => expect(screen.getByText('Finished')).toBeTruthy());
    expect(screen.getByText(/Sequence cracked/)).toBeTruthy();
    expect(screen.queryByText('Try next')).toBeNull();
    expect(screen.queryByText('OPTIONAL ULTIMATUM')).toBeNull();
  });

  // Block headings in the order they appear in the page.
  const headingOrder = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);

  it('stacks the answer first on narrow screens, each block once', async () => {
    render(<RequiemSolverPage />);
    await screen.findByText('Requiem Solver');
    expect(headingOrder()).toEqual([
      'Recommendation', 'What the evidence says', 'Active adversary', 'Known Requiems', 'Stab history', 'Kuva Weapon Cycle',
    ]);
  });

  it('spreads three columns on screens 1536px and wider: settings, answer, evidence and tracker', async () => {
    window.matchMedia = vi.fn(query => ({
      matches: query === '(min-width: 1536px)', media: query, addEventListener() {}, removeEventListener() {},
    }));
    try {
      render(<RequiemSolverPage />);
      await screen.findByText('Requiem Solver');
      expect(headingOrder()).toEqual([
        'Active adversary', 'Known Requiems', 'Stab history', 'Recommendation', 'What the evidence says', 'Kuva Weapon Cycle',
      ]);
      expect(screen.getAllByRole('button', { name: 'Record a stab' }).length).toBe(1);
    } finally {
      delete window.matchMedia;
    }
  });

  it('flags contradictory evidence instead of inventing a solution', async () => {
    const user = userEvent.setup();
    render(<RequiemSolverPage />);
    await screen.findByText('Requiem Solver');
    const record = async (failedAt) => {
      await user.click(screen.getByRole('button', { name: 'Record a stab' }));
      const selects = [1, 2, 3].map(n => screen.getByLabelText(`Slot ${n}`));
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
