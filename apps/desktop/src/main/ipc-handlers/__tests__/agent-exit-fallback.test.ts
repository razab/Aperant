import { describe, expect, it } from 'vitest';

import { resolveActiveExitFallbackEvent } from '../agent-exit-fallback';

describe('resolveActiveExitFallbackEvent', () => {
  it('never promotes a clean exit to QA_PASSED', () => {
    expect(resolveActiveExitFallbackEvent(0, true)).toEqual({
      type: 'USER_STOPPED',
      hasPlan: true,
    });
  });

  it('preserves hasPlan for non-zero exits', () => {
    expect(resolveActiveExitFallbackEvent(1, false)).toEqual({
      type: 'USER_STOPPED',
      hasPlan: false,
    });
  });
});
