import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

// Lets the in-app browser hand control back to the app after auth.
WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'apple' | 'google' | 'github';

// Where the provider sends the user back to. In a dev/standalone build this is
// the app's custom scheme (kova://); in Expo Go it's the exp:// dev URL.
export const redirectTo = makeRedirectUri();

/**
 * Runs the full OAuth flow for a provider: asks Supabase for the provider's
 * authorization URL, opens it in an in-app browser, then turns the redirect
 * back into a Supabase session. Returns the session, or null if the user
 * dismissed the browser.
 */
export async function signInWithOAuth(provider: OAuthProvider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Could not start sign in. Please try again.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null; // cancelled / dismissed

  return createSessionFromUrl(result.url);
}

/** Whether the native "Sign in with Apple" sheet is usable (iOS 13+ device). */
export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Native Sign in with Apple. Opens the system sheet, then exchanges the
 * returned identity token for a Supabase session via `signInWithIdToken`.
 * Returns null if the user cancelled the sheet.
 *
 * Apple sends the user's real name only on the *first* authorization, so we
 * persist it to user metadata (and the profile) when present; later sign-ins
 * legitimately omit it.
 */
export async function signInWithAppleNative() {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (err: any) {
    if (err?.code === 'ERR_REQUEST_CANCELED') return null;
    throw err;
  }

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token. Please try again.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;

  const name = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (name && data.user) {
    // Apple only sends the name on the first authorization (account creation),
    // and it never appears in the JWT, so the DB trigger can't see it. Carry it
    // into auth metadata and the freshly-created profile here.
    await supabase.auth.updateUser({ data: { full_name: name, display_name: name } });
    await supabase.from('profiles').update({ display_name: name }).eq('id', data.user.id);
  }

  return data.session;
}

export async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  if (params.error) throw new Error(params.error_description || params.error);

  // PKCE flow returns a code to exchange; implicit flow returns tokens directly.
  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session;
  }

  const { access_token, refresh_token } = params;
  if (access_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;
    return data.session;
  }

  return null;
}
