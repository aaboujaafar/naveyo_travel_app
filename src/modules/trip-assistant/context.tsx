import React, { createContext, useContext } from 'react'
import type { TripAssistant } from './interface'

const TripAssistantContext = createContext<TripAssistant | null>(null)

export function TripAssistantProvider({ module, children }: { module: TripAssistant; children: React.ReactNode }) {
  return <TripAssistantContext.Provider value={module}>{children}</TripAssistantContext.Provider>
}

export function useTripAssistant(): TripAssistant | null {
  return useContext(TripAssistantContext)
}
