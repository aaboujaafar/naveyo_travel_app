import type { ISO4217 } from "../modules/_shared/model";

export interface TripSettingsValues {
  name: string;
  startsOn: string;
  endsOn: string;
  referenceCurrency: string;
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const currencyPattern = /^[A-Z]{3}$/;

export function validateTripSettings(
  values: TripSettingsValues,
): Partial<Record<keyof TripSettingsValues, string>> {
  const errors: Partial<Record<keyof TripSettingsValues, string>> = {};
  if (!values.name.trim()) errors.name = "Le nom du Voyage est requis.";
  if (values.startsOn && !isoDatePattern.test(values.startsOn)) {
    errors.startsOn = "Utilisez le format AAAA-MM-JJ.";
  }
  if (values.endsOn && !isoDatePattern.test(values.endsOn)) {
    errors.endsOn = "Utilisez le format AAAA-MM-JJ.";
  }
  if (
    !errors.startsOn &&
    !errors.endsOn &&
    values.startsOn &&
    values.endsOn &&
    values.endsOn < values.startsOn
  ) {
    errors.endsOn = "La fin doit être postérieure au début.";
  }
  if (!currencyPattern.test(values.referenceCurrency.trim().toUpperCase())) {
    errors.referenceCurrency = "Utilisez un code ISO 4217 sur trois lettres.";
  }
  return errors;
}

export function normalizeTripSettings(values: TripSettingsValues): {
  name: string;
  startsOn?: string;
  endsOn?: string;
  referenceCurrency: ISO4217;
} {
  return {
    name: values.name.trim(),
    ...(values.startsOn ? { startsOn: values.startsOn } : {}),
    ...(values.endsOn ? { endsOn: values.endsOn } : {}),
    referenceCurrency: values.referenceCurrency.trim().toUpperCase() as ISO4217,
  };
}
