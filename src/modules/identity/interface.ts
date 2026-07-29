import type { Account } from './model'
export interface IdentityModule { currentAccount(): Promise<Account | null>; signOut(): Promise<void> }
