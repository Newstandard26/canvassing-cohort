/**
 * NSR Ramp Cohort Dashboard — live configuration.
 *
 * The API key below ships to every visitor's browser; that is how browser-side
 * Google Sheets API access works. It is restricted to the Google Sheets API in
 * Google Cloud Console (add an HTTP-referrer restriction for the dashboard
 * domain there for extra protection). The sheet itself is read-only.
 */

var NSR_CONFIG = {
  sheetId: '1r1uCdINsvbS0upMKVw4Zc7Z1NjtxemgNqh7yCVObb9c',
  apiKey: 'AIzaSyDSNl5VnmzRHjBVW6ja0qOh_qtu_HalhQU',

  // Auto-refresh settings
  refreshMinutes: 5,
  autoRefresh: false
};
