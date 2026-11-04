/** Single public invite shape shared by the registration UI and backend. */
export const INVITE_CODE_PATTERN = /^MM-[A-F0-9]{40}$/i;

export function isValidInviteCode(value: string): boolean {
  return INVITE_CODE_PATTERN.test(value.trim());
}
