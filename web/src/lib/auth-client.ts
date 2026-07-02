// Authorization-Code + PKCE client for Authentik (adapted from lunacycle's
// oauth-client.ts). Framework-agnostic; Preact islands are thin wrappers.
// Config comes from window.__BYOI_CONFIG__ (runtime config.js, by-9td.8).

export interface ByoiConfig {
  AUTHENTIK_URL: string; // https://auth.example.org/application/o
  CLIENT_ID: string;
  APPLICATION_SLUG: string;
  REDIRECT_URI: string; // https://www.example.org/auth/callback
}

export interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface AuthUser {
  username: string;
  email?: string;
  groups: string[];
}

const TOKENS_KEY = 'byoi_tokens';
const STATE_KEY = 'byoi_auth_state';
const VERIFIER_KEY = 'byoi_pkce_verifier';
const SCOPE = 'openid profile email groups';

export function getConfig(): ByoiConfig | null {
  return (typeof window !== 'undefined' && window.__BYOI_CONFIG__) || null;
}

export function base64UrlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

// Decode JWT payload without verification — display + UI gating only, not authorization.
export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/** Build the authorize URL, stash state+verifier, and redirect to Authentik. */
export async function initiateLogin(): Promise<void> {
  const config = getConfig();
  if (!config) {
    console.error('auth: window.__BYOI_CONFIG__ missing — is /config.js deployed?');
    return;
  }
  const state = crypto.randomUUID();
  const verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: config.CLIENT_ID,
    redirect_uri: config.REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    state,
    code_challenge: await generateCodeChallenge(verifier),
    code_challenge_method: 'S256',
  });
  window.location.assign(`${config.AUTHENTIK_URL}/authorize/?${params}`);
}

/** On /auth/callback: verify state, exchange code for tokens, store them. */
export async function handleCallback(): Promise<void> {
  const config = getConfig();
  if (!config) throw new Error('window.__BYOI_CONFIG__ missing');

  const query = new URLSearchParams(window.location.search);
  const code = query.get('code');
  const state = query.get('state');
  if (!code || !state) throw new Error(query.get('error_description') || 'Missing code or state in callback URL');

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  if (!expectedState || state !== expectedState) throw new Error('State mismatch — possible CSRF or stale login attempt');
  if (!verifier) throw new Error('Missing PKCE verifier — restart login');

  const response = await fetch(`${config.AUTHENTIK_URL}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.CLIENT_ID,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: config.REDIRECT_URI,
    }).toString(),
  });
  if (!response.ok) throw new Error(`Token exchange failed: ${await response.text()}`);

  const tokens: TokenResponse = await response.json();
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

/** Current user from the stored ID token, or null if logged out/expired. */
export function getUser(): AuthUser | null {
  // by-9td.4: dev-mode auto-login. Only the `dev` script sets PUBLIC_AUTH_MODE;
  // prod builds leave it unset, so Vite dead-code-eliminates this branch.
  if (import.meta.env.PUBLIC_AUTH_MODE === 'dev') {
    return { username: 'dev', groups: ['byoi-admins'] };
  }
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    if (!raw) return null;
    const tokens: TokenResponse = JSON.parse(raw);
    const claims = decodeJWT(tokens.id_token);
    if (!claims) return null;
    if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) {
      localStorage.removeItem(TOKENS_KEY);
      return null;
    }
    return {
      username: String(claims.preferred_username ?? claims.name ?? claims.sub ?? 'user'),
      email: typeof claims.email === 'string' ? claims.email : undefined,
      groups: Array.isArray(claims.groups) ? claims.groups.map(String) : [],
    };
  } catch {
    return null;
  }
}

/** Clear local tokens and end the Authentik session. */
export function logout(): void {
  const raw = localStorage.getItem(TOKENS_KEY);
  localStorage.removeItem(TOKENS_KEY);
  const config = getConfig();
  if (!config) {
    window.location.assign('/');
    return;
  }
  const params = new URLSearchParams({ post_logout_redirect_uri: window.location.origin });
  try {
    const tokens: TokenResponse = JSON.parse(raw ?? '');
    if (tokens.id_token) params.set('id_token_hint', tokens.id_token);
  } catch {
    // no stored tokens — end-session still works without the hint
  }
  window.location.assign(`${config.AUTHENTIK_URL}/${config.APPLICATION_SLUG}/end-session/?${params}`);
}
