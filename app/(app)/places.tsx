import { Redirect } from "expo-router";
import { useNaveyoBootstrap } from "../../src/bootstrap";

export default function LegacyPlacesRoute() {
  const tripId = useNaveyoBootstrap()?.currentTripId;
  return (
    <Redirect
      href={tripId ? `/trips/${tripId}` : "/(app)/trips"}
    />
  );
}
