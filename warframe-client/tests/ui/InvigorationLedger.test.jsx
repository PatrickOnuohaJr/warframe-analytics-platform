import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OfferStatus, OverridePanel } from '../../src/components/InvigorationLedger';

const OFFER = { id: 1, slot: 'A', week_start: '2026-11-02', frame_name: 'Mirage', offense_buff: 'Ability Strength +200%', utility_buff: 'Energy Max +200%' };
const FRAMES = [{ my_frame_id: 1, warframe_name: 'Mirage' }, { my_frame_id: 2, warframe_name: 'Frost' }];
const mkLog = (events = [], over = {}) => ({
  events, loaded: true, missing: false, loadError: null,
  record: vi.fn(async () => null), voidEvent: vi.fn(async () => null), ...over,
});

describe('OfferStatus', () => {
  it('defaults to Pending and records Applied or Skipped', async () => {
    const user = userEvent.setup();
    const log = mkLog();
    render(<OfferStatus offer={OFFER} log={log} onError={() => {}} />);
    expect(screen.getByTestId('offer-status-A').textContent).toBe('Pending');
    await user.click(screen.getByRole('button', { name: 'Applied' }));
    expect(log.record).toHaveBeenCalledWith({ type: 'applied' }, OFFER);
    await user.click(screen.getByRole('button', { name: 'Skipped' }));
    expect(log.record).toHaveBeenLastCalledWith({ type: 'skipped' }, OFFER);
  });

  it('shows Applied with Undo, and Undo voids the event', async () => {
    const user = userEvent.setup();
    const log = mkLog([{ event_id: 5, event_type: 'applied', offer_id: 1, recipient_role: 'original', voided_at: null }]);
    render(<OfferStatus offer={OFFER} log={log} onError={() => {}} />);
    expect(screen.getByTestId('offer-status-A').textContent).toBe('Applied');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(log.voidEvent).toHaveBeenCalledWith(5, expect.any(String)));
  });
});

describe('OverridePanel', () => {
  it('shows progress from the events and calibrates with Set count', async () => {
    const user = userEvent.setup();
    const log = mkLog([{ event_id: 1, event_type: 'counter_set', counter_value: 6, voided_at: null }]);
    render(<OverridePanel offers={[OFFER]} frames={FRAMES} log={log} onError={() => {}} />);
    expect(screen.getByTestId('override-progress').textContent).toContain('6 / 10');
    expect(screen.queryByText('Override Ready')).toBeNull();
    await user.type(screen.getByLabelText('Match the game'), '8');
    await user.click(screen.getByRole('button', { name: 'Set count' }));
    expect(log.record).toHaveBeenCalledWith({ type: 'counter_set', counterValue: '8' }, undefined);
  });

  it('at 10 shows Override Ready and records the slot and new recipient', async () => {
    const user = userEvent.setup();
    const log = mkLog([{ event_id: 1, event_type: 'counter_set', counter_value: 10, voided_at: null }]);
    render(<OverridePanel offers={[OFFER]} frames={FRAMES} log={log} onError={() => {}} />);
    expect(screen.getByText('Override Ready')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Override slot'), 'A');
    await user.selectOptions(screen.getByLabelText('Override recipient'), 'Frost');
    await user.click(screen.getByRole('button', { name: 'Record Override' }));
    expect(log.record).toHaveBeenCalledWith({ type: 'override_selected', recipient: 'Frost' }, OFFER);
  });

  it('tells you to run the migration when the table is missing, and lists history', async () => {
    const { unmount } = render(<OverridePanel offers={[]} frames={FRAMES} log={mkLog([], { missing: true })} onError={() => {}} />);
    expect(screen.getByText(/20261103_add_invigoration_events/)).toBeTruthy();
    unmount();
    const user = userEvent.setup();
    const log = mkLog([{ event_id: 2, event_type: 'counter_set', counter_value: 3, occurred_at: '2026-11-03T00:00:00Z', voided_at: null }]);
    render(<OverridePanel offers={[]} frames={FRAMES} log={log} onError={() => {}} />);
    await user.click(screen.getByRole('button', { name: /History/ }));
    expect(screen.getByText(/Counter set to 3/)).toBeTruthy();
  });
});
