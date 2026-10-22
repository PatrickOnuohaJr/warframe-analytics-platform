import { COLOR } from '../constants/theme';
import { deriveSurvivabilityStatus } from '../utils/survivabilityStatus';

// Glanceable Jade Light standing for a build.
//   tested    -> solid filled chip ("proven")
//   candidate -> dashed outline with a "?" ("promised, not proven")
//   failed    -> red outline, "Back to the drawing board"
//   untested  -> nothing on the card (compact); a faint label in the modal
// `compact` is the codex-card version (short text); otherwise the modal's
// fuller wording ("Tier 0 · tested", "Tier 0 candidate").
export default function SurvivabilityBadge({ claim, latestTest, compact = false, className = '' }) {
  const status = deriveSurvivabilityStatus(claim, latestTest);

  if (status.state === 'untested') {
    return compact ? null : (
      <span className={`text-xs uppercase tracking-widest ${className}`} style={{ color: COLOR.mutedInk }}>
        Untested
      </span>
    );
  }

  const tone = status.state === 'failed' ? COLOR.danger : status.tier === 'Tier 0' ? COLOR.success : COLOR.gold;
  const solid = status.state === 'tested';

  return (
    <span
      className={`font-bold rounded border whitespace-nowrap ${compact ? 'text-[10px] px-2 py-0.5 tracking-wider' : 'text-sm px-3 py-1'} ${className}`}
      style={{
        background: solid ? tone : `${tone}12`,
        color: solid ? COLOR.page : tone,
        borderColor: tone,
        borderStyle: solid ? 'solid' : 'dashed',
      }}
      title={status.label}
    >
      {compact ? status.short : status.label}
    </span>
  );
}
