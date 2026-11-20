/**
 * A crumbling ledge the other player stood on falls on this screen too, at the same moment.
 *
 * The other game sends `crumble{ledgeId}` stamped with the shared clock when its candle starts the ledge's timer.
 * Here the ledge's timer is started as if it had begun at that moment: already `elapsedMs` into its hold, or
 * already fallen if the hold is over. A ledge that is crumbling here already (this candle stood on it too) keeps
 * its own timer, which started no later. After that, crumble.ts runs it like any other (it grows back once this
 * candle is clear of it).
 *
 * Bounded: the other player's names are untrusted, so no more than `maxEntries` ledges crumble at once here (a name
 * that is no ledge of this world is dropped by the next physics step anyway); a ledge past the cap is left whole.
 */
import { NETPLAY_CONFIG } from '../../config/netplay.config';
import type { LedgeKindsConfig } from '../../shared/contracts/config';
import type { CrumbleState } from '../player/crumble';

export function startRemoteCrumble(crumble: CrumbleState, ledgeId: string, elapsedMs: number, rules: LedgeKindsConfig['crumble'],
  maxEntries: number = NETPLAY_CONFIG.maxCrumbling): CrumbleState {
  if (crumble.has(ledgeId) || crumble.size >= maxEntries) return crumble;
  const elapsed = Math.max(0, elapsedMs);
  if (elapsed >= rules.holdMs + rules.regrowMs) return crumble;
  const next = new Map(crumble);
  next.set(ledgeId, elapsed < rules.holdMs ? { heldMs: elapsed, goneMs: null } : { heldMs: rules.holdMs, goneMs: elapsed - rules.holdMs });
  return next;
}
