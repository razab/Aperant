export interface ActiveExitFallbackEvent {
  type: 'USER_STOPPED';
  hasPlan: boolean;
}

export function resolveActiveExitFallbackEvent(
  _exitCode: number | null,
  hasPlan: boolean,
): ActiveExitFallbackEvent {
  return {
    type: 'USER_STOPPED',
    hasPlan,
  };
}
