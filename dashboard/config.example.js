/**
 * NSR Ramp Cohort Dashboard configuration.
 *
 * Copy this file to config.js and fill in your values. Without a config.js
 * (or with placeholder values) the dashboard runs in demo mode.
 *
 * Setup:
 *  1. Run sheet/nsr-master-tracking-sheet.gs in Google Apps Script to create
 *     the Master Tracking Sheet — the log prints the Sheet ID.
 *  2. In Google Cloud Console: create a project, enable the Google Sheets API,
 *     create an API key, and restrict the key to the Google Sheets API.
 *  3. Share the sheet as "Anyone with the link" → Viewer.
 *
 * Note: this API key ships to the browser, so it is public by design. Restrict
 * it to the Sheets API (and to your dashboard's domain via HTTP referrer
 * restrictions) in Google Cloud Console. The sheet itself is read-only to
 * anyone with the link.
 */

var NSR_CONFIG = {
  sheetId: 'YOUR_GOOGLE_SHEET_ID',
  apiKey: 'YOUR_GOOGLE_API_KEY',

  // Auto-refresh settings
  refreshMinutes: 5,
  autoRefresh: false
};
