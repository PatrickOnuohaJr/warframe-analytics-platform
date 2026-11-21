"""Curated rank-3 Equinox values. Wiki checked 2026-11-21, not in-game verified.
Dual-form templates need explicit curation rather than the generic parser.
"""
from urllib.parse import quote


def r(key, label, value, scale='none', unit='flat', formula=None):
    return dict(parameter_key=key, label=label, base_value=value, unit=unit,
                scales_with=scale, formula_key=formula, context='base', source='manual',
                verified_note='Wiki rank 3, 2026-11-21; not in-game verified.')


ABILITIES = {
    'Metamorphosis': [
        r('energy_cost', 'Energy Cost', 25, 'efficiency'),
        r('duration', 'Bonus decay duration (s)', 25, 'duration', 'seconds'),
        r('armor_bonus', 'Night: initial armor bonus', 250, 'strength'),
        r('shield_bonus', 'Night: initial shield bonus', 150, 'strength'),
        r('day_damage_bonus', 'Day: initial weapon damage bonus', 25, 'strength', 'percent'),
        r('day_speed_bonus', 'Day: initial movement speed bonus', 15, 'strength', 'percent'),
    ],
    'Rest & Rage': [
        r('energy_cost', 'Energy Cost', 25, 'efficiency'),
        r('duration', 'Rest / Rage duration (s)', 22, 'duration', 'seconds'),
        r('area_radius', 'Rest / Rage radius (m)', 5, 'range', 'meters'),
        r('cast_range', 'Cast range (m)', 50, 'range', 'meters'),
        r('wakeup_threshold', 'Rest: remaining-health wake threshold', 50, unit='percent'),
        r('rage_vulnerability', 'Rage: damage vulnerability', 50, 'strength', 'percent'),
        r('rage_enemy_speed', 'Rage: enemy speed bonus', 20, 'strength', 'percent'),
    ],
    'Pacify & Provoke': [
        r('energy_cost', 'Energy Cost', 10, 'efficiency'),
        r('radius', 'Aura outer radius (m)', 16, 'range', 'meters'),
        r('pacify_multiplier', 'Pacify: enemy damage multiplier (inner ring)', .5, unit='multiplier', formula='equinox_pacify_multiplier'),
        r('pacify_drain', 'Pacify: Energy/s/enemy', .5, 'efficiency'),
        r('provoke_strength', 'Provoke: added Ability Strength', 20, 'strength', 'percent'),
        r('provoke_strength_cap', 'Provoke: base bonus cap', 50, unit='percent'),
        r('provoke_cast_cost', 'Provoke: Energy per ability cast', 3, 'efficiency'),
    ],
    'Mend & Maim': [
        r('energy_cost', 'Energy Cost', 50, 'efficiency'),
        r('channel_drain', 'Energy drain per second', 3.5, formula='equinox_channel_drain'),
        r('radius', 'Aura radius (m)', 18, 'range', 'meters'),
        r('mend_shields', 'Mend: shields per kill', 25, 'strength'),
        r('maim_damage', 'Maim: initial aura Slash damage', 150, 'strength'),
        r('charge_conversion', 'Mend / Maim: kill hitpoint conversion', 75, unit='percent'),
    ],
}

NOTES = {
    'Metamorphosis': 'Night gains armor/shields; Day gains weapon damage/speed. Bonuses decay. Passive converts 10% of health-orb restoration into extra Energy and 10% of Energy-orb restoration into extra Health.',
    'Rest & Rage': 'Rest sleeps; Rage increases damage vulnerability and enemy speed. Helminth uses the same numbers; primary emission color selects the form. Calm & Frenzy spreads on kills.',
    'Pacify & Provoke': 'Pacify suppression weakens in outer rings and uses inverse Strength scaling. Per-enemy/per-cast Energy costs use Efficiency, not Duration. Provoke is an available buff, not automatically added to all build stats.',
    'Mend & Maim': 'Mend releases healing; Maim releases damage. Charge depends on kills, not a fixed forecast. Conversion does not scale with Strength. Channel drain uses Efficiency and Duration. Energy Transfer preserves charge while changing forms.',
}


def parameters(name):
    return [dict(item, sort_order=i + 1,
                 source_ref='https://wiki.warframe.com/w/' + quote(name.replace(' ', '_'), safe='_'))
            for i, item in enumerate(ABILITIES[name])]
