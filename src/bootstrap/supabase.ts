import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import type { SupabaseClientLike } from "../adapters/supabase/identity/client";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

export function createSupabaseClient(): SupabaseClientLike {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY",
    );
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client as unknown as SupabaseClientLike;
}

const nativeStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const memoryStorage = new Map<string, string>();
const webStorage = {
  async getItem(key: string) {
    return globalThis.localStorage?.getItem(key) ?? memoryStorage.get(key) ?? null;
  },
  async setItem(key: string, value: string) {
    if (globalThis.localStorage) globalThis.localStorage.setItem(key, value);
    else memoryStorage.set(key, value);
  },
  async removeItem(key: string) {
    if (globalThis.localStorage) globalThis.localStorage.removeItem(key);
    else memoryStorage.delete(key);
  },
};

const secureStorage = Platform.OS === "web" ? webStorage : nativeStorage;
