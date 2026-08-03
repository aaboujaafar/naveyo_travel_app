import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { resolveShellRedirect, type ShellRouteGroup } from './shell-helpers';

type ShellSessionContextValue = {
  isAuthenticated: boolean;
  signInForShell: () => void;
  signOut: () => void;
};

const ShellSessionContext = createContext<ShellSessionContextValue | null>(null);

export function ShellSessionProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const value = useMemo(
    () => ({
      isAuthenticated,
      signInForShell: () => setIsAuthenticated(true),
      signOut: () => setIsAuthenticated(false),
    }),
    [isAuthenticated],
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
  const { isAuthenticated } = useShellSession();

  useEffect(() => {
    if (!navigationState?.key) return;
    const redirect = resolveShellRedirect(isAuthenticated, routeGroupFromSegments(segments));
    if (redirect) router.replace(redirect);
  }, [isAuthenticated, navigationState?.key, router, segments]);

  return children;
}
