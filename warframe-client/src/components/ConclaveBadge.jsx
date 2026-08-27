import conclaveIcon from '../assets/misc/conclave.png';

// Real Conclave sigil, pulled from the Warframe wiki (same "download the
// actual game icon locally" approach as PolaritySymbol) -- mods with this
// badge are Conclave-exclusive or Conclave-origin (WFCD uniqueName contains
// "/PvPMods/"), not a real fake -- just PvP content mixed into the catalog.
export default function ConclaveBadge({ size = 14, className = '' }) {
  return (
    <img
      src={conclaveIcon}
      alt="Conclave"
      title="Conclave mod"
      className={className}
      style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }}
    />
  );
}
