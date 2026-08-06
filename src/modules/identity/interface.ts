import type { Account } from './model'
export interface IdentityCredentials {
  email: string
  password: string
}

export interface IdentityModule {
  currentAccount(): Promise<Account | null>
  signIn(credentials: IdentityCredentials): Promise<Account>
  signUp(credentials: IdentityCredentials & { displayName: string }): Promise<Account>
  signOut(): Promise<void>
}
