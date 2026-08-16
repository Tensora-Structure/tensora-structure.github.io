import { useCallback, useEffect, useState } from 'react';

export interface AuthUser {
  name: string;
  email: string;
  picture?: string;
  exp: number;
}

export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
export const sheetsWebhookUrl = import.meta.env.VITE_SHEETS_WEBHOOK_URL ?? '';

const SESSION_KEY = 'tensora-auth-session';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              width?: number;
            },
          ) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

function decodeJwt(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = payload.length % 4 === 0 ? '' : '='.repeat(4 - (payload.length % 4));
    return JSON.parse(atob(payload + padding));
  } catch {
    return null;
  }
}

function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as AuthUser;
    if (!user.email || user.exp * 1000 < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

let gsiScriptPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiScriptPromise) return gsiScriptPromise;
  gsiScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In script'));
    document.head.appendChild(script);
  });
  return gsiScriptPromise;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => loadSession());

  const signIn = useCallback((credential: string) => {
    const payload = decodeJwt(credential);
    if (!payload) throw new Error('Invalid credential token');
    if (payload.aud !== googleClientId) throw new Error('Token audience does not match this app');
    if (payload.email_verified !== true) throw new Error('Email is not verified by Google');
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
      throw new Error('Credential has expired');
    }
    const nextUser: AuthUser = {
      name: typeof payload.name === 'string' ? payload.name : '',
      email: typeof payload.email === 'string' ? payload.email : '',
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
      exp: payload.exp,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return { user, signIn, signOut };
}

let buttonRenderedFor: string | null = null;

export async function renderGoogleButton(
  container: HTMLElement,
  onCredential: (credential: string) => void,
): Promise<void> {
  if (!googleClientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not configured');
  await loadGsiScript();
  const g = window.google!.accounts.id;
  if (buttonRenderedFor !== container.id || container.childElementCount === 0) {
    container.innerHTML = '';
    buttonRenderedFor = container.id;
    g.initialize({
      client_id: googleClientId,
      auto_select: false,
      callback: (response) => onCredential(response.credential),
    });
    g.renderButton(container, { theme: 'outline', size: 'large', shape: 'rectangular', width: 280 });
  }
}

export async function sendLoginToSheet(user: AuthUser): Promise<boolean> {
  if (!sheetsWebhookUrl) return false;
  try {
    const response = await fetch(sheetsWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        source: 'tensora-structure.github.io',
      }),
    });
    const text = await response.text();
    const data = JSON.parse(text || '{}');
    return data.ok === true;
  } catch {
    return false;
  }
}
