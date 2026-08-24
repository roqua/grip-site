const DUTCH_MONTHS = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
] as const;

/** Formats a date the way the site prints publication dates, e.g. "26 mei 2021". */
export function formatDutchDate(date: Date): string {
  return `${date.getUTCDate()} ${DUTCH_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
