import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SlotBox from '../../src/components/SlotBox';
import LoadoutSlotPickerModal from '../../src/components/LoadoutSlotPickerModal';
import { DRAG_MIME } from '../../src/utils/slotMoves';

const mod = { mod_id: 1, name: 'Teeming Virulence', max_rank: 3, polarity: 'madurai' };

function box(props = {}) {
  return render(
    <SlotBox label="Slot 1" slot={{ polarity: null }} mod={mod} rank={3} cost={5} accent="#c9a14a"
      description="Hitting 4 enemies grants Crit Chance" onOpenPicker={() => {}} onSetPolarity={() => {}}
      onSetRank={() => {}} {...props} />
  );
}

// A DataTransfer stand-in: jsdom has none, fireEvent lets us pass one in.
function transfer(payload) {
  const data = payload ? { [DRAG_MIME]: JSON.stringify(payload) } : {};
  return { types: Object.keys(data), getData: t => data[t] ?? '', setData: (t, v) => { data[t] = v; }, effectAllowed: '', dropEffect: '' };
}

describe('compact mod card', () => {
  it('keeps name and rank on the face; effect text lives in a hover tooltip, not in flow', () => {
    box();
    expect(screen.getAllByText('Teeming Virulence').length).toBeGreaterThan(0);
    expect(screen.getByText('Rank 3/3')).toBeTruthy();
    const tip = screen.getByRole('tooltip');
    expect(tip.textContent).toContain('Crit Chance');
    // Absolute + hidden until group-hover: it cannot stretch the card.
    expect(tip.className).toMatch(/absolute/);
    expect(tip.className).toMatch(/\bhidden\b/);
  });

  it('is draggable only when filled and drag-enabled, and reports drops', () => {
    const onDropMod = vi.fn();
    const { container, rerender } = box({ slotId: '1', onDropMod });
    const card = container.firstChild;
    expect(card.getAttribute('draggable')).toBe('true');

    const dt = transfer({ kind: 'slot', from: '4' });
    fireEvent.dragOver(card, { dataTransfer: dt });
    fireEvent.drop(card, { dataTransfer: dt });
    expect(onDropMod).toHaveBeenCalledWith({ kind: 'slot', from: '4' });

    // foreign drags (no mod payload) are ignored
    onDropMod.mockClear();
    fireEvent.drop(card, { dataTransfer: transfer(null) });
    expect(onDropMod).not.toHaveBeenCalled();

    rerender(<SlotBox label="Slot 1" slot={{ polarity: null }} mod={null} rank={0} cost={0} accent="#c9a14a"
      slotId="1" onDropMod={onDropMod} onOpenPicker={() => {}} onSetPolarity={() => {}} onSetRank={() => {}} />);
    expect(container.firstChild.getAttribute('draggable')).toBe('false');
  });
});

describe('picker usage ordering', () => {
  const mods = [
    { mod_id: 1, name: 'Archon Continuity', polarity: 'madurai', max_rank: 5, base_drain: 4, raw_json: {} },
    { mod_id: 2, name: 'Primed Continuity', polarity: 'madurai', max_rank: 10, base_drain: 7, raw_json: {} },
    { mod_id: 3, name: 'Zebra', polarity: 'madurai', max_rank: 3, base_drain: 2, raw_json: {} },
  ];
  const owned = new Map(mods.map(m => [m.mod_id, { owned_rank: m.max_rank }]));

  it('lists most-used first, rest in name order', () => {
    render(
      <LoadoutSlotPickerModal mods={mods} category="Warframe" ownedByModId={owned}
        usageByModId={new Map([[2, 9], [1, 1]])} slotPolarity={null}
        onSelect={() => {}} onClear={() => {}} onClose={() => {}} />
    );
    const names = ['Primed Continuity', 'Archon Continuity', 'Zebra'];
    const order = names.map(n => screen.getByText(n)).map(el => el.compareDocumentPosition(screen.getByText('Zebra')));
    // each earlier name precedes Zebra (bit 4 = following)
    expect(order[0] & 4).toBe(4);
    expect(order[1] & 4).toBe(4);
    const rows = screen.getAllByText(/Continuity|Zebra/).map(e => e.textContent);
    expect(rows).toEqual(names);
    expect(screen.getByText('used 9×')).toBeTruthy();
  });
});

describe('picker hides mods equipped in other slots', () => {
  it('drops excluded mods from the list', () => {
    const mods = [
      { mod_id: 1, name: 'Blind Rage', polarity: 'madurai', max_rank: 10, base_drain: 6, raw_json: {} },
      { mod_id: 2, name: 'Primed Flow', polarity: 'madurai', max_rank: 10, base_drain: 6, raw_json: {} },
    ];
    render(
      <LoadoutSlotPickerModal mods={mods} category="Warframe"
        ownedByModId={new Map(mods.map(m => [m.mod_id, { owned_rank: 10 }]))}
        excludeModIds={new Set([1])} excludeRivenIds={new Set()} slotPolarity={null}
        onSelect={() => {}} onClear={() => {}} onClose={() => {}} />
    );
    expect(screen.queryByText('Blind Rage')).toBeNull();
    expect(screen.getByText('Primed Flow')).toBeTruthy();
  });
});
