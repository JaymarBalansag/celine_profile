const SHEET_NAME = "Vouches";
const HEADERS = ["id", "name", "comment", "created_at", "updated_at"];

function doGet(event) {
  const sheet = getVouchesSheet();
  const limit = clampNumber(event.parameter.limit, 5, 1, 20);
  const offset = clampNumber(event.parameter.offset, 0, 0, 100000);
  const rows = sheet.getDataRange().getValues();
  const records = rows.slice(1).map(rowToVouch).filter(Boolean).reverse();
  const vouches = records.slice(offset, offset + limit);

  return jsonResponse({
    ok: true,
    vouches,
    hasMore: offset + limit < records.length
  });
}

function doPost(event) {
  const sheet = getVouchesSheet();
  const payload = JSON.parse(event.postData.contents || "{}");
  const name = sanitizeText(payload.name, 60);
  const comment = sanitizeText(payload.comment, 500);

  if (!name || !comment) {
    return jsonResponse({
      ok: false,
      error: "Name and comment are required."
    });
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const id = Utilities.getUuid();

  sheet.appendRow([id, name, comment, timestamp, timestamp]);

  return jsonResponse({
    ok: true,
    vouch: {
      id,
      name,
      comment,
      created_at: timestamp,
      updated_at: timestamp
    }
  });
}

function getVouchesSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = HEADERS.every((header, index) => firstRow[index] === header);

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  return sheet;
}

function rowToVouch(row) {
  if (!row[0] || !row[1] || !row[2]) {
    return null;
  }

  return {
    id: row[0],
    name: row[1],
    comment: row[2],
    created_at: normalizeDate(row[3]),
    updated_at: normalizeDate(row[4])
  };
}

function normalizeDate(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value || "";
}

function sanitizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(number), min), max);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
