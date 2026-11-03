import { COLOR } from '../../constants/theme';
import { succeeded } from '../../utils/requiemEngine';
import RequiemIcon from './RequiemIcon';

// Shown in place of the recommendation once a stab has won: the adversary is
// finished, so suggesting another setup would only confuse.
export default function RequiemDone({ attempts, tally }) {
  const winning = [...attempts].reverse().find(succeeded);
  const stabs = attempts.length;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: COLOR.agedInk }}>Finished</p>
        <p className="text-xl sm:text-2xl font-bold tracking-wide" style={{ color: COLOR.success }}>
          {winning.equipped.join(' → ').toUpperCase()}
        </p>
        <p className="text-xs mt-1" style={{ color: COLOR.mutedInk }}>
          This setup won, so there is nothing left to try on this adversary.
        </p>
      </div>
      <div className="flex gap-2">
        {winning.equipped.map((m, i) => <RequiemIcon key={i} mod={m} size={48} />)}
      </div>
      <p className="text-sm" style={{ color: COLOR.ink }}>
        {stabs} stab{stabs === 1 ? '' : 's'} in total: {tally.consumed} with an Ultimatum, {tally.natural} on natural encounters.
        {' '}{tally.available} Ultimatum{tally.available === 1 ? '' : 's'} left.
      </p>
    </div>
  );
}
