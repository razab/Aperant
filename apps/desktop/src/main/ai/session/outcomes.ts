import type { SessionOutcome } from './types';

export function isCompletedOutcome(outcome: SessionOutcome | undefined): boolean {
  return outcome === 'completed';
}

export function isIncompleteOutcome(outcome: SessionOutcome | undefined): boolean {
  return outcome === 'max_steps' || outcome === 'context_window';
}
