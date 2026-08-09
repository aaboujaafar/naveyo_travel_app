import React, { createContext, useContext } from 'react'
import type { NaveyoBootstrap } from './index'

export const NaveyoBootstrapContext = createContext<NaveyoBootstrap | null>(null)

export function NaveyoBootstrapProvider({
  bootstrap,
  children,
}: {
  bootstrap: NaveyoBootstrap | null
  children: React.ReactNode
}) {
  return <NaveyoBootstrapContext.Provider value={bootstrap}>{children}</NaveyoBootstrapContext.Provider>
}

export const useNaveyoBootstrap = (): NaveyoBootstrap | null => useContext(NaveyoBootstrapContext)
