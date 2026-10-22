import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RivenEditorModal from '../../src/components/RivenEditorModal';

// Stat tags/labels come from the real rivenStats util so the test tracks it.
import { statsForCategory } from '../../src/utils/rivenStats';
const PRIMARY = statsForCategory('Primary');
const POSITIVE_ONLY = PRIMARY.find(s => s.tag === 'WeaponFireDamageMod');
const SIGNED = PRIMARY.find(s => s.tag !== 'WeaponFireDamageMod');

function setup(props = {}) {
  const onSave = vi.fn().mockResolvedValue({ riven_id: 9 });
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(
    <RivenEditorModal weaponName="Vectis" category="Primary" riven={null}
      onSave={onSave} onDelete={vi.fn()} onClose={onClose} {...props} />
  );
  return { user, onSave, onClose };
}

const selects = () => screen.getAllByRole('combobox');
const signButtons = () => screen.getAllByTitle(/positive|negative/i);

describe('RivenEditorModal', () => {
  it('only allows a negative on slots 3-4, and only one at a time', async () => {
    const { user } = setup();
    // Slots 1-2 sign toggles are locked from the start.
    expect(signButtons()[0].disabled).toBe(true);
    expect(signButtons()[1].disabled).toBe(true);

    await user.selectOptions(selects()[2], SIGNED.tag);
    await user.selectOptions(selects()[3], SIGNED.tag === PRIMARY[0].tag ? PRIMARY[1].tag : PRIMARY[0].tag);
    expect(signButtons()[2].disabled).toBe(false);

    await user.click(signButtons()[2]);
    expect(signButtons()[2].textContent).toBe('-');
    // Slot 4 locks to positive once slot 3 is negative.
    expect(signButtons()[3].disabled).toBe(true);
  });

  it('forces a positive-only stat back to + and locks its sign', async () => {
    const { user } = setup();
    await user.selectOptions(selects()[2], SIGNED.tag);
    await user.click(signButtons()[2]);
    expect(signButtons()[2].textContent).toBe('-');

    await user.selectOptions(selects()[2], POSITIVE_ONLY.tag);
    expect(signButtons()[2].textContent).toBe('+');
    expect(signButtons()[2].disabled).toBe(true);
  });

  it('saves composed stat lines and closes with the saved row', async () => {
    const { user, onSave, onClose } = setup();
    await user.type(screen.getByPlaceholderText('e.g. Argonak Vittena'), '  Test Riven ');
    await user.selectOptions(selects()[0], SIGNED.tag);
    await user.type(screen.getAllByRole('spinbutton')[0], '120');
    await user.click(screen.getByText('Save Riven'));

    const payload = onSave.mock.calls[0][0];
    expect(payload.weapon_name).toBe('Vectis');
    expect(payload.riven_name).toBe('Test Riven');
    expect(payload.stat_1).toBe(`+120${SIGNED.unit} ${SIGNED.label}`);
    expect(payload.stat_2).toBeNull();
    expect(onClose).toHaveBeenCalledWith({ riven_id: 9 });
  });

  it('round-trips an existing riven and Max sets the rank to the cap', async () => {
    const riven = { riven_id: 4, riven_name: 'Old', owned_rank: 2, polarity: null,
      stat_1: `+90${SIGNED.unit} ${SIGNED.label}`, stat_2: null, stat_3: null, stat_4: null };
    const { user, onSave } = setup({ riven });
    expect(selects()[0].value).toBe(SIGNED.tag);
    expect(screen.getAllByRole('spinbutton')[0].value).toBe('90');

    await user.click(screen.getByText('Max'));
    await user.click(screen.getByText('Save Riven'));
    const payload = onSave.mock.calls[0][0];
    expect(payload.riven_id).toBe(4);
    expect(payload.owned_rank).toBeGreaterThan(2);
    expect(payload.stat_1).toBe(`+90${SIGNED.unit} ${SIGNED.label}`);
  });
});
