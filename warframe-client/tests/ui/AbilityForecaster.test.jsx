import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AbilityForecaster from '../../src/components/AbilityForecaster';

// Mirage's Eclipse as stored in wf_base.ability_parameters.
const ECLIPSE = [
  { parameter_key: 'energy_cost', label: 'Energy Cost', base_value: 25, unit: 'flat', scales_with: 'efficiency', context: 'base', sort_order: 0 },
  { parameter_key: 'damage_reduction', label: 'damage reduction', base_value: 75, unit: 'percent', scales_with: 'strength', context: 'base', sort_order: 1 },
  { parameter_key: 'damage_bonus', label: 'damage bonus', base_value: 200, unit: 'percent', scales_with: 'strength', context: 'base', sort_order: 2 },
  { parameter_key: 'duration', label: 'Duration', base_value: 25, unit: 'flat', scales_with: 'duration', context: 'base', sort_order: 3 },
  { parameter_key: 'damage_reduction_cap', label: 'damage reduction cap', base_value: 90, unit: 'percent', scales_with: 'none', context: 'base', sort_order: 4 },
];
const ABILITIES = [{ slot: 3, name: 'Eclipse', parameters: ECLIPSE, context: 'base' }];
const BUILD = { strength: 243, duration: 100, range: 100, efficiency: 100, armor: 300 };

describe('AbilityForecaster', () => {
  it('starts with one +60% Strength row and shows Eclipse moving', () => {
    render(<AbilityForecaster abilities={ABILITIES} buildStats={BUILD} accent="#C9A961" />);
    // 243 + 60 = 303% total strength; damage bonus 200% x 3.03 = 606%.
    expect(screen.getByTestId('forecast-totals').textContent).toContain('243%');
    expect(screen.getByTestId('forecast-totals').textContent).toContain('303%');
    expect(screen.getByTestId('forecast-3-damage_bonus').textContent).toContain('486% → 606%');
  });

  it('adds Patrick\'s sources together and hides numbers the change does not touch', async () => {
    const user = userEvent.setup();
    render(<AbilityForecaster abilities={ABILITIES} buildStats={BUILD} accent="#C9A961" />);

    await user.click(screen.getByRole('button', { name: /Tauforged Crimson shard \+15% Strength/ }));
    await user.click(screen.getByRole('button', { name: /Tauforged Crimson shard \+15% Strength/ }));
    // 60 + 15 + 15 = +90 -> 333% -> damage bonus 666%.
    expect(screen.getByTestId('forecast-totals').textContent).toContain('333%');
    expect(screen.getByTestId('forecast-3-damage_bonus').textContent).toContain('666%');
    // Strength does not touch duration or energy cost, so they are not listed.
    expect(screen.queryByTestId('forecast-3-duration')).toBeNull();
    expect(screen.queryByTestId('forecast-3-energy_cost')).toBeNull();
    // Damage reduction is held at its 90% cap.
    expect(screen.getByTestId('forecast-3-damage_reduction').textContent).toContain('capped at 90%');
  });

  it('switching a row to Efficiency lowers Energy cost instead of raising it', async () => {
    const user = userEvent.setup();
    render(<AbilityForecaster abilities={ABILITIES} buildStats={BUILD} accent="#C9A961" />);
    await user.selectOptions(screen.getByLabelText('Source 1 stat'), 'efficiency');
    await user.clear(screen.getByLabelText('Source 1 percent'));
    await user.type(screen.getByLabelText('Source 1 percent'), '30');
    expect(screen.getByTestId('forecast-3-energy_cost').textContent).toContain('25 → 17.5');
    expect(screen.queryByTestId('forecast-3-damage_bonus')).toBeNull();
  });

  it('has one-click Grimoire Invocation sources: Vome adds 60% Strength', async () => {
    const user = userEvent.setup();
    render(<AbilityForecaster abilities={ABILITIES} buildStats={BUILD} accent="#C9A961" />);
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    await user.click(screen.getByRole('button', { name: /Grimoire Vome Invocation.*\+60% Strength/ }));
    expect(screen.getByTestId('forecast-totals').textContent).toContain('303%');
    expect(screen.getByRole('button', { name: /Grimoire Ris Invocation.*\+60% Duration/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Grimoire Netra Invocation.*\+60% Efficiency/ })).toBeTruthy();
  });

  it('renders nothing before build stats exist', () => {
    const { container } = render(<AbilityForecaster abilities={ABILITIES} buildStats={null} accent="#C9A961" />);
    expect(container.firstChild).toBeNull();
  });
});
