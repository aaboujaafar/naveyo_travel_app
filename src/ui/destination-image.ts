import type { ImageSourcePropType } from "react-native";

/** Returns a stable destination cover, while allowing provider-supplied photos. */
export function destinationImageSource(name: string, imageUrl?: string): ImageSourcePropType {
  if (imageUrl) return { uri: imageUrl };
  const normalized = name.trim().toLowerCase();
  // The Lisbon photo is only truthful for Lisbon; other places get a generic travel illustration.
  if (/lisbo[an]|lisbon/.test(normalized)) return require("../../assets/trip-lisbon-cover.png");
  let hash = 0;
  for (const character of normalized) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % 2 === 0
    ? require("../../assets/photo-album-2.png")
    : require("../../assets/photo-album-3.png");
}

/** VoiceOver label that does not claim a generic illustration shows the destination. */
export function destinationImageLabel(name: string, imageUrl?: string): string {
  const normalized = name.trim().toLowerCase();
  return imageUrl || /lisbo[an]|lisbon/.test(normalized)
    ? `Photo de ${name}`
    : "Illustration de voyage";
}
