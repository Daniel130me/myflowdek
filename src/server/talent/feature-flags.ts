/**
 * Talent is enabled unless operators explicitly disable it. This preserves
 * existing environments while giving controlled rollouts a single switch.
 */
export function isTalentNetworkEnabled(value = process.env.TALENT_NETWORK_ENABLED) {
  return value?.trim().toLowerCase() !== 'false';
}
