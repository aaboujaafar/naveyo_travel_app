import { useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { destinationImageLabel, destinationImageSource } from "./destination-image";

/** Destination cover that falls back to the bundled illustration when the remote photo fails. */
export function DestinationImage({ name, imageUrl, style }: { name: string; imageUrl?: string; style?: StyleProp<ImageStyle> }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = imageUrl && imageUrl !== failedUrl ? imageUrl : undefined;
  return (
    <Image
      source={destinationImageSource(name, url)}
      resizeMode="cover"
      style={style}
      accessibilityLabel={destinationImageLabel(name, url)}
      onError={() => {
        if (url) setFailedUrl(url);
      }}
    />
  );
}
