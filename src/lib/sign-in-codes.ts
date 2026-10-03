/**
 * The reasons a sign-in can be refused for a reason other than a wrong
 * password. Each is the `code` of a CredentialsSignin subclass thrown from
 * authorize() in auth.ts; Auth.js carries it back to the browser as
 * `result.code` on signIn() (result.error is always "CredentialsSignin").
 *
 * Shared with the login form so the two sides cannot drift: the form used to
 * look these up on result.error, which never matched, and every refused
 * account read "อีเมลหรือรหัสผ่านไม่ถูกต้อง".
 */
export const SIGN_IN_CODES = [
  "account-pending",
  "account-suspended",
  "password-reset-required",
  "too-many-attempts",
] as const;

export type SignInCode = (typeof SIGN_IN_CODES)[number];
