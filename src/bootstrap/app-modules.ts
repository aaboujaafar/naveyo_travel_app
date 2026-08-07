import * as FileSystem from "expo-file-system/legacy";
import { createSupabaseIdentityModule } from "../adapters/supabase/identity";
import {
  createSupabaseDocumentsModule,
  type SupabaseDocumentsClientLike,
} from "../adapters/supabase/documents";
import { createSupabaseTripsModule } from "../adapters/supabase/trips";
import { createSupabaseTripAssistant } from "../adapters/supabase/trip-assistant";
import { createSupabaseClient } from "./supabase";

export function createAppModules() {
  const client = createSupabaseClient();
  const identity = createSupabaseIdentityModule(client);
  const trips = createSupabaseTripsModule(client, () => true);
  const tripAssistant = createSupabaseTripAssistant(client);
  const documents = createSupabaseDocumentsModule(
    client as unknown as SupabaseDocumentsClientLike,
    persistDownloadedDocument,
  );
  return { identity, trips, tripAssistant, documents };
}

async function persistDownloadedDocument(input: {
  data: Blob;
  storagePath: string;
  fileName?: string;
}): Promise<string> {
  const directory = `${FileSystem.documentDirectory ?? ""}naveyo-documents/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const safeName = (input.fileName ?? input.storagePath.split("/").at(-1) ?? "document")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  const target = `${directory}${safeName}`;
  const bytes = new Uint8Array(await input.data.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  await FileSystem.writeAsStringAsync(target, btoa(binary), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return target;
}
