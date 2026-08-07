export interface SupabaseResponse<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export interface SupabaseQuery<T = unknown>
  extends PromiseLike<SupabaseResponse<T>> {
  select(columns?: string): SupabaseQuery<T>;
  insert(
    values: Record<string, unknown> | Record<string, unknown>[],
  ): SupabaseQuery<T>;
  update(values: Record<string, unknown>): SupabaseQuery<T>;
  eq(column: string, value: string): SupabaseQuery<T>;
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery<T>;
  single(): SupabaseQuery<T>;
}

export interface SupabaseUser {
  id: string;
  email?: string;
}
export interface SupabaseAuth {
  getUser(): Promise<SupabaseResponse<{ user: SupabaseUser | null }>>;
  signInWithPassword(input: {
    email: string;
    password: string;
  }): Promise<SupabaseResponse<{ user: SupabaseUser | null }>>;
  signUp(input: {
    email: string;
    password: string;
    options?: { data?: Record<string, string> };
  }): Promise<SupabaseResponse<{ user: SupabaseUser | null }>>;
  signOut(): Promise<SupabaseResponse<null>>;
}
export interface SupabaseClientLike {
  auth: SupabaseAuth;
  from(table: string): SupabaseQuery;
  rpc<T = unknown>(functionName: string, args?: Record<string, unknown>): SupabaseQuery<T>;
}
