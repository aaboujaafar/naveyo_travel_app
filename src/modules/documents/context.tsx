import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { DocumentsModule } from './interface'

const DocumentsContext = createContext<DocumentsModule | null>(null)

export function DocumentsProvider({ module, children }: { module: DocumentsModule | null; children: ReactNode }) {
  return <DocumentsContext.Provider value={module}>{children}</DocumentsContext.Provider>
}

export function useDocuments(): DocumentsModule | null {
  return useContext(DocumentsContext)
}
