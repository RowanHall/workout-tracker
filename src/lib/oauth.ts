import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

// Lets the in-app browser hand control back to the app after auth.
WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'apple' | 'google' | 'github';

// Where the provider sends the user back to. In a dev/standalone build this is
// the app's custom scheme (kova://); in Expo Go it's the exp:// dev URL.
const redirectTo = makeRedirectUri();

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

async function createSessionFromUrl(url: string) {
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
