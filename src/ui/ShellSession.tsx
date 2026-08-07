import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { resolveShellRedirect, type ShellRouteGroup } from './shell-helpers';
import type { Account, IdentityCredentials, IdentityModule } from '../modules/identity';

type ShellSessionContextValue = {
  isReady: boolean;
  isAuthenticated: boolean;
  account: Account | null;
  signIn: (credentials: IdentityCredentials) => Promise<void>;
  signUp: (credentials: IdentityCredentials & { displayName: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const ShellSessionContext = createContext<ShellSessionContextValue | null>(null);

export function ShellSessionProvider({ children, identity }: { children: React.ReactNode; identity: IdentityModule }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void identity.currentAccount().then((account) => {
      if (!mounted) return;
      setAccount(account);
      setIsAuthenticated(account !== null);
      setIsReady(true);
    }).catch(() => {
      if (mounted) setIsReady(true);
    });
    return () => { mounted = false; };
  }, [identity]);

  const value = useMemo(
    () => ({
      isReady,
      isAuthenticated,
      account,
      signIn: async (credentials: IdentityCredentials) => {
        const nextAccount = await identity.signIn(credentials);
        setAccount(nextAccount);
        setIsAuthenticated(true);
      },
      signUp: async (credentials: IdentityCredentials & { displayName: string }) => {
        const nextAccount = await identity.signUp(credentials);
        setAccount(nextAccount);
        setIsAuthenticated(true);
      },
      signOut: async () => {
        await identity.signOut();
        setAccount(null);
        setIsAuthenticated(false);
      },
    }),
    [account, identity, isAuthenticated, isReady],
  );

  return <ShellSessionContext.Provider value={value}>{children}</ShellSessionContext.Provider>;
}

export function useShellSession() {
  const session = useContext(ShellSessionContext);
  if (!session) throw new Error('useShellSession must be used inside ShellSessionProvider');
  return session;
}

function routeGroupFromSegments(segments: string[]): ShellRouteGroup {
  const firstSegment = segments[0];
  return firstSegment === '(auth)' || firstSegment === '(app)' ? firstSegment : 'unknown';
}

export function ShellNavigationGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { isAuthenticated, isReady } = useShellSession();

  useEffect(() => {
    if (!navigationState?.key || !isReady) return;
    const redirect = resolveShellRedirect(isAuthenticated, routeGroupFromSegments(segments));
    if (redirect) router.replace(redirect);
  }, [isAuthenticated, isReady, navigationState?.key, router, segments]);

  return children;
}
