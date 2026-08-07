import { assertStableId } from "../../../modules/_shared/validation";
import type {
  Account,
  IdentityCredentials,
  IdentityModule,
} from "../../../modules/identity";
import { IdentityError } from "../../../modules/identity/errors";
import type { SupabaseClientLike } from "./client";

const accountFromUser = (user: { id: string; email?: string }): Account => ({
  id: assertStableId(user.id),
  email: user.email ?? "",
});
const throwIfError = (
  error: { message: string } | null,
  fallback: string,
): void => {
  if (error) throw new IdentityError(error.message || fallback);
};

export const createSupabaseIdentityModule = (
  client: SupabaseClientLike,
): IdentityModule => ({
  async currentAccount() {
    const { data, error } = await client.auth.getUser();
    throwIfError(error, "Unable to read the current account");
    return data?.user ? accountFromUser(data.user) : null;
  },
  async signIn(credentials: IdentityCredentials) {
    const { data, error } = await client.auth.signInWithPassword(credentials);
    throwIfError(error, "Unable to sign in");
    if (!data?.user)
      throw new IdentityError("Supabase did not return an account");
    return accountFromUser(data.user);
  },
  async signUp({
    email,
    password,
    displayName,
  }: IdentityCredentials & { displayName: string }) {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    throwIfError(error, "Unable to create the account");
    if (!data?.user)
      throw new IdentityError(
        "Account created but no authenticated session was returned",
      );
    return accountFromUser(data.user);
  },
  async signOut() {
    const { error } = await client.auth.signOut();
    throwIfError(error, "Unable to sign out");
  },
});

export type {
  SupabaseClientLike,
  SupabaseQuery,
  SupabaseResponse,
} from "./client";
