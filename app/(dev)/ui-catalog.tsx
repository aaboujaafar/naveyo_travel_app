import { Redirect } from "expo-router";
import { UiCatalogScreen } from "../../src/ui/UiCatalogScreen";

export default function UiCatalogRoute() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return <UiCatalogScreen />;
}
