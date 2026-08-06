export type { DocumentKind, TravelDocument } from "../_shared/model";

export const documentMimeTypes: Readonly<Record<string, string>> = {
  pdf: "application/pdf",
  image: "image/jpeg",
  text: "text/plain",
  url: "text/plain",
  ics: "text/calendar",
};
