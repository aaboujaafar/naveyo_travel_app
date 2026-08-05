import React, { createContext, useContext } from 'react'
import type { TripsModule } from './interface'

const TripsContext = createContext<TripsModule | null>(null)

export function TripsModuleProvider({ module, children }: { module: TripsModule; children: React.ReactNode }) {
  return <TripsContext.Provider value={module}>{children}</TripsContext.Provider>
}

export function useTripsModule(): TripsModule | null {
  return useContext(TripsContext)
}
