import { Redirect } from "expo-router";
import { useNaveyoBootstrap } from "../../src/bootstrap";

export default function LegacyItineraryRoute() {
  const tripId = useNaveyoBootstrap()?.currentTripId;
  return (
    <Redirect
      href={
        tripId
          ? `/trips/${tripId}/itinerary`
          : "/(app)/trips"
      }
    />
  );
}
