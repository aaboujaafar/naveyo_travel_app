import type { UUID } from "./model";

const hex = (value: number): string => value.toString(16).padStart(2, "0");

export function createUuid(): UUID {
  const nativeUuid = globalThis.crypto?.randomUUID?.();
  if (nativeUuid) return nativeUuid as UUID;

  const bytes = new Uint8Array(16);
  const randomValues = globalThis.crypto?.getRandomValues;
  if (randomValues) {
    randomValues.call(globalThis.crypto, bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1)
      bytes[index] = Math.floor(Math.random() * 256);
  }

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const value = Array.from(bytes, hex).join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}` as UUID;
}
