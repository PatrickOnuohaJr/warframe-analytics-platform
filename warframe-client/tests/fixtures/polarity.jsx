import { createRoot } from 'react-dom/client';
import SlotBox from '../../src/components/SlotBox';
import LoadoutSlotPickerModal from '../../src/components/LoadoutSlotPickerModal';
import { effectiveDrain, isDiscounted } from '../../src/utils/modCapacity';
import '../../src/index.css';

const mod = { mod_id: 1, name: 'Blind Rage', base_drain: 6, max_rank: 10, polarity: 'madurai', raw_json: {} };
const cost = effectiveDrain(mod, 10, 'zenurik');
const noop = () => {};
// Inferred regression state, not a copy of Patrick's saved Equinox build.
createRoot(document.getElementById('root')).render(
  <main style={{ padding: 20, color: '#e8dfce', background: '#171511', minHeight: '100vh' }}>
    <h1>Equinox Prime · polarity fixture</h1>
    <p>Representative state · no database connection</p>
    <p>Capacity remaining: {74 - 53 - cost} / 74 (other drains: 53)</p>
    <div style={{ maxWidth: 380, marginTop: 24 }}>
      <SlotBox label="Slot 1" slot={{ polarity: 'zenurik' }} mod={mod} rank={10} cost={cost}
        discounted={isDiscounted(mod, 'zenurik')} accent="#c9a14a" onOpenPicker={noop}
        onSetPolarity={noop} onSetRank={noop} />
    </div>
    {new URLSearchParams(location.search).has('picker') && <LoadoutSlotPickerModal
      mods={[mod]} category="Warframe" ownedByModId={new Map([[1, { owned_rank: 10 }]])}
      slotPolarity="zenurik" onSelect={noop} onClear={noop} onClose={noop} />}
  </main>
);
