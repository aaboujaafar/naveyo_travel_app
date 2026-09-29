/** Maps Places gateway errors (English, technical) to traveller-facing French messages. */
export function describePlacesError(cause: unknown, fallback = "Recherche de lieux indisponible pour le moment."): string {
  const message = cause instanceof Error ? cause.message.toLowerCase() : "";
  if (message.includes("quota")) return "Trop de recherches pour le moment. Réessayez dans quelques minutes.";
  if (message.includes("timed out") || message.includes("network") || message.includes("fetch"))
    return "Recherche impossible : vérifiez la connexion puis réessayez.";
  if (message.includes("place_not_found") || message.includes("(404)"))
    return "Ce lieu n’est plus disponible. Relancez la recherche.";
  if (message.includes("authentication") || message.includes("(401)") || message.includes("(403)"))
    return "Votre session a expiré ou vous n’avez plus accès à ce Voyage.";
  return fallback;
}
