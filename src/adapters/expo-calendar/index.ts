import * as Calendar from "expo-calendar/legacy";
import type { CalendarEventDraft } from "../../screens/calendar-export-model";

const CALENDAR_COLOR = "#D9381E";

/**
 * Writes the Voyage into its own iPhone calendar. An earlier export of the same
 * Voyage is replaced as a whole, so exporting twice never duplicates events.
 */
export async function exportTripCalendar(tripName: string, events: readonly CalendarEventDraft[]): Promise<number> {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) throw new Error("Autorisez l’accès au Calendrier dans Réglages › Naveyo pour exporter le Voyage.");

  const title = `Naveyo · ${tripName}`;
  const existing = (await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)).filter((calendar) => calendar.title === title);
  for (const calendar of existing) await Calendar.deleteCalendarAsync(calendar.id);

  const source = (await Calendar.getDefaultCalendarAsync()).source;
  const calendarId = await Calendar.createCalendarAsync({
    title,
    name: title,
    color: CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: source.id,
    source,
    ownerAccount: "personal",
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  for (const event of events) {
    await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      allDay: event.allDay,
      ...(event.allDay ? {} : { timeZone: event.timeZone }),
      ...(event.location ? { location: event.location } : {}),
      ...(event.notes ? { notes: event.notes } : {}),
      ...(event.alarmOffsetMinutes !== undefined ? { alarms: [{ relativeOffset: event.alarmOffsetMinutes }] } : {}),
    });
  }
  return events.length;
}
