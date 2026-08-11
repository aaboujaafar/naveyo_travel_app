export interface CreateTripFormValues {
  name: string;
  startsOn: string;
  endsOn: string;
}

export interface TripDuration {
  days: number;
  nights: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function calculateTripDuration(
  startsOn: string,
  endsOn: string,
): TripDuration | null {
  const start = parseLocalDate(startsOn);
  const end = parseLocalDate(endsOn);
  if (start === null || end === null) return null;

  const nights = Math.round((end - start) / 86_400_000);
  if (nights <= 0) return null;

  return { days: nights + 1, nights };
}

export function isCreateTripReady(values: CreateTripFormValues): boolean {
  return (
    values.name.trim().length > 0 &&
    calculateTripDuration(values.startsOn, values.endsOn) !== null
  );
}

function parseLocalDate(value: string): number | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}
