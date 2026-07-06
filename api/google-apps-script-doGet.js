const SPREADSHEET_ID = "";
const SOURCE_SHEET_NAME = "summary";
const CACHE_KEY = "ib-pending-summary-data";
const CACHE_SECONDS = 300;

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = String(params.action || "data").toLowerCase();

  try {
    if (action === "health") {
      return jsonResponse({
        success: true,
        message: "API OK",
        updatedAt: new Date().toISOString()
      });
    }

    if (action === "clearcache") {
      CacheService.getScriptCache().remove(CACHE_KEY);

      return jsonResponse({
        success: true,
        message: "Cache cleared",
        updatedAt: new Date().toISOString()
      });
    }

    if (action !== "data") {
      return jsonResponse({
        success: false,
        message: "Unknown action"
      });
    }

    const forceRefresh = String(params.refresh || "") === "1";
    const cachedJson = !forceRefresh
      ? CacheService.getScriptCache().get(CACHE_KEY)
      : null;

    if (cachedJson) {
      return ContentService
        .createTextOutput(cachedJson)
        .setMimeType(ContentService.MimeType.JSON);
    }

    const payload = buildDataPayload();
    const json = JSON.stringify(payload);

    CacheService.getScriptCache().put(CACHE_KEY, json, CACHE_SECONDS);

    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error && error.message ? error.message : String(error)
    });
  }
}

function buildDataPayload() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("Spreadsheet not found. Fill SPREADSHEET_ID or bind this script to the spreadsheet.");
  }

  const sheet = spreadsheet.getSheetByName(SOURCE_SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet not found: ${SOURCE_SHEET_NAME}`);
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return {
      success: true,
      sheet: SOURCE_SHEET_NAME,
      total: 0,
      updatedAt: new Date().toISOString(),
      data: []
    };
  }

  const headers = values.shift().map(header => String(header || "").trim());
  const data = values
    .filter(row => row.some(cell => cell !== "" && cell !== null))
    .map(row => {
      const item = {};

      headers.forEach((header, index) => {
        if (!header) return;

        item[header] = normalizeCell(row[index]);
      });

      return item;
    });

  return {
    success: true,
    sheet: SOURCE_SHEET_NAME,
    total: data.length,
    updatedAt: new Date().toISOString(),
    data
  };
}

function normalizeCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd'T'HH:mm:ss"
    );
  }

  return value;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
