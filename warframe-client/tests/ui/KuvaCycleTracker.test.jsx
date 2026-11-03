import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// The tracker talks to Supabase only through lib/weaponCycleStore, so mock that.
const store = vi.hoisted(() => ({
  loadCycle: vi.fn(async () => ({ state: { rejected: ['Kuva Grattler'], target: 'Kuva Karak', currentLich: null }, error: null })),
  saveCycle: vi.fn(async () => null),
}));
vi.mock('../../src/lib/weaponCycleStore', () => ({ ...store, isMissingTable: () => false }));

import KuvaCycleTracker from '../../src/components/requiem/KuvaCycleTracker';

describe('KuvaCycleTracker', () => {
  it('loads the saved cycle, cycles a weapon, undoes it, then takes a weapon as the current Lich', async () => {
    const user = userEvent.setup();
    render(<KuvaCycleTracker />);
    await screen.findByText(/1 of 21 cycled/);
    expect(screen.getByLabelText('Kuva Grattler').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/At most 20 more finished missions/)).toBeTruthy();

    await user.click(screen.getByLabelText('Kuva Tonkor'));
    expect(screen.getByText(/2 of 21 cycled/)).toBeTruthy();
    await waitFor(() => expect(store.saveCycle).toHaveBeenLastCalledWith({
      rejected: ['Kuva Grattler', 'Kuva Tonkor'], target: 'Kuva Karak', currentLich: null,
    }));

    await user.click(screen.getByRole('button', { name: 'Undo cycle change' }));
    expect(screen.getByText(/1 of 21 cycled/)).toBeTruthy();

    // Taking the Quartakk resets the list and makes it the current Lich; the hunt for Karak stays.
    await user.selectOptions(screen.getByLabelText(/I took/), 'Kuva Quartakk');
    expect(screen.getByText(/0 of 21 cycled/)).toBeTruthy();
    expect(screen.getByText(/Current Lich:/).textContent).toContain('Kuva Quartakk');
    await waitFor(() => expect(store.saveCycle).toHaveBeenLastCalledWith({
      rejected: [], target: 'Kuva Karak', currentLich: 'Kuva Quartakk',
    }));

    // Finishing that Lich frees the slot.
    await user.click(screen.getByRole('button', { name: 'Converted or vanquished' }));
    expect(screen.queryByText(/Current Lich:/)).toBeNull();
    await waitFor(() => expect(store.saveCycle).toHaveBeenLastCalledWith({
      rejected: [], target: 'Kuva Karak', currentLich: null,
    }));
  });

  it('says when the hunted weapon was already cycled', async () => {
    const user = userEvent.setup();
    render(<KuvaCycleTracker />);
    await screen.findByText(/1 of 21 cycled/);
    await user.click(screen.getByLabelText('Kuva Karak'));
    expect(screen.getByText(/Already cycled/)).toBeTruthy();
  });
});
