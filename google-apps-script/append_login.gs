/**
 * Tensora Structure — login logger webhook.
 *
 * Setup:
 * 1. Create a Google Sheet for login records.
 * 2. Extensions → Apps Script → paste this file's contents.
 * 3. Deploy → New deployment → type "Web app":
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 4. Copy the /exec URL into VITE_SHEETS_WEBHOOK_URL.
 *
 * The first POST creates a "Logins" sheet with headers.
 */

const SHEET_NAME = 'Logins';
const HEADERS = ['Timestamp', 'Name', 'Email', 'Source'];

function doPost(e) {
  try {
    let data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = { raw: e.postData.contents };
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    }

    sheet.appendRow([
      new Date(),
      String(data.name || ''),
      String(data.email || ''),
      String(data.source || ''),
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
