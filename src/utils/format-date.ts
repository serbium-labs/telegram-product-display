const DATE_LOCALE = 'en-GB';
const MILLISECONDS_PER_SECOND = 1_000;
const UTC_TIME_ZONE = 'UTC';

export function formatCreationDate(unixTimestampSeconds: number): string {
  const date = new Date(unixTimestampSeconds * MILLISECONDS_PER_SECOND);
  const formatter = new Intl.DateTimeFormat(DATE_LOCALE, {
    dateStyle: 'long',
    timeZone: UTC_TIME_ZONE,
  });

  return formatter.format(date);
}
