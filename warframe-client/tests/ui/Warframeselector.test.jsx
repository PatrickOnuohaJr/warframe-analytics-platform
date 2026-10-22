import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Catalog fixture served in place of the live wf_base.warframes read.
const FRAMES = [
  { warframe_id: 1, name: 'Frost', is_prime: false },
  { warframe_id: 2, name: 'Frost Prime', is_prime: true },
  { warframe_id: 3, name: 'Excalibur', is_prime: false },
];

vi.mock('../../src/lib/supabase', () => ({
  wfUser: {
    schema: () => ({
      from: () => ({
        select: () => ({ order: () => Promise.resolve({ data: FRAMES, error: null }) }),
      }),
    }),
  },
}));

import WarframeSelector from '../../src/components/Warframeselector';

describe('WarframeSelector', () => {
  it('shows a placeholder, filters as you type, and reports the pick', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<WarframeSelector currentWarframeId={null} currentDisplayName="" onSelect={onSelect} />);

    await user.click(screen.getByText('Click to set Warframe...'));
    await waitFor(() => expect(screen.getByText('Excalibur')).toBeTruthy());

    await user.type(screen.getByPlaceholderText('Search Warframe name...'), 'frost');
    expect(screen.queryByText('Excalibur')).toBeNull();
    expect(screen.getByText('Frost Prime')).toBeTruthy();

    await user.click(screen.getByText('Frost Prime'));
    expect(onSelect).toHaveBeenCalledWith({ warframe_id: 2, name: 'Frost Prime' });
    // Collapsed back to display mode with the picked name.
    expect(screen.queryByPlaceholderText('Search Warframe name...')).toBeNull();
  });

  it('discards unselected typed text on outside click', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <div>
        <WarframeSelector currentWarframeId={3} currentDisplayName="Excalibur" onSelect={onSelect} />
        <button>outside</button>
      </div>
    );

    await user.click(screen.getByText('Excalibur'));
    await user.clear(screen.getByPlaceholderText('Search Warframe name...'));
    await user.type(screen.getByPlaceholderText('Search Warframe name...'), 'zzz');
    expect(await screen.findByText('No matches.')).toBeTruthy();

    await user.click(screen.getByText('outside'));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText('Excalibur')).toBeTruthy();
  });
});
