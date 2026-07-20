const CONFIG = {
  spreadsheetId: "",
  spreadsheetName: "Backup Web IB Tracking",
  sheetName: "summary",
  cacheKey: "ib-pending-summary-v1",
  cacheSeconds: 300
};

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = String(params.action || "data").toLowerCase();

  try {
    if (action === "health") {
      return jsonResponse({
        success: true,
        message: "IB Pending API is running",
        sheet: CONFIG.sheetName,
        updatedAt: new Date().toISOString()
      });
    }

    if (action === "clearcache") {
      CacheService.getScriptCache().remove(CONFIG.cacheKey);

      return jsonResponse({
        success: true,
        message: "Cache cleared",
        updatedAt: new Date().toISOString()
      });
    }

    if (action === "ib" || action === "detail") {
      return getIbDetailResponse(params);
    }

    if (action !== "data") {
      return jsonResponse({
        success: false,
        message: "Unknown action: " + action
      });
    }

    return getDataResponse(params);
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error && error.message ? error.message : String(error),
      updatedAt: new Date().toISOString()
    });
  }
}

/**
 * Returns every sheet column for one IB number.
 *
 * Examples:
 *   ?action=ib&ibNo=456965
 *   ?action=detail&ib=456965
 *
 * `records` is always an array because a source sheet can contain more than
 * one row for the same IB number. `data` contains the first matching row as a
 * convenience for detail pages.
 */
function getIbDetailResponse(params) {
  const ibNo = String(params.ibNo || params.ib || "").trim();

  if (!ibNo) {
    return jsonResponse({
      success: false,
      message: "Missing required parameter: ibNo",
      example: "?action=ib&ibNo=456965",
      updatedAt: new Date().toISOString()
    });
  }

  const payload = buildDataPayload();
  const ibColumn = findIbColumn(payload.data);

  if (!ibColumn) {
    return jsonResponse({
      success: false,
      message: "IB number column was not found in sheet: " + CONFIG.sheetName,
      expectedColumns: ["IB No.", "IB No", "IBNo", "IB"],
      updatedAt: payload.updatedAt
    });
  }

  const records = payload.data.filter(function(item) {
    return normalizeIbNumber(item[ibColumn]) === normalizeIbNumber(ibNo);
  });

  return jsonResponse({
    success: true,
    found: records.length > 0,
    ibNo: ibNo,
    sheet: payload.sheet,
    total: records.length,
    updatedAt: payload.updatedAt,
    data: records.length ? records[0] : null,
    records: records
  });
}

function findIbColumn(data) {
  if (!data.length) return "IB No.";

  const columns = Object.keys(data[0]);
  const acceptedNames = ["ibno", "ibnumber", "ib"];

  return columns.find(function(column) {
    const normalized = String(column).toLowerCase().replace(/[^a-z0-9]/g, "");
    return acceptedNames.indexOf(normalized) !== -1;
  }) || "";
}

function normalizeIbNumber(value) {
  return String(value === null || value === undefined ? "" : value)
    .trim()
    .replace(/\.0+$/, "");
}

function getDataResponse(params) {
  const refresh = String(params.refresh || params._refresh || "") !== "";
  const cache = CacheService.getScriptCache();
  const cachedJson = refresh ? null : cache.get(CONFIG.cacheKey);

  if (cachedJson) {
    return jsonText(cachedJson);
  }

  const payload = buildDataPayload();
  const json = JSON.stringify(payload);

  cache.put(CONFIG.cacheKey, json, CONFIG.cacheSeconds);

  return jsonText(json);
}

function buildDataPayload() {
  const sheet = getSourceSheet();
  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length < 2) {
    return {
      success: true,
      sheet: CONFIG.sheetName,
      total: 0,
      updatedAt: new Date().toISOString(),
      data: []
    };
  }

  const headers = values.shift().map(function(header) {
    return String(header || "").trim();
  });

  const data = values
    .filter(function(row) {
      return row.some(function(cell) {
        return cell !== "" && cell !== null;
      });
    })
    .map(function(row) {
      const item = {};

      headers.forEach(function(header, index) {
        if (!header) return;
        item[header] = normalizeCell(row[index]);
      });

      return item;
    });

  return {
    success: true,
    sheet: CONFIG.sheetName,
    total: data.length,
    updatedAt: new Date().toISOString(),
    data: data
  };
}

function getSourceSheet() {
  const spreadsheet = CONFIG.spreadsheetId
    ? SpreadsheetApp.openById(CONFIG.spreadsheetId)
    : getActiveOrNamedSpreadsheet();

  if (!spreadsheet) {
    throw new Error("Spreadsheet not found. Fill CONFIG.spreadsheetId, bind this Apps Script to the spreadsheet, or confirm CONFIG.spreadsheetName.");
  }

  const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);

  if (!sheet) {
    throw new Error("Sheet tab not found: " + CONFIG.sheetName);
  }

  return sheet;
}

function getActiveOrNamedSpreadsheet() {
  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (activeSpreadsheet) {
    return activeSpreadsheet;
  }

  if (!CONFIG.spreadsheetName) {
    return null;
  }

  const files = DriveApp.getFilesByName(CONFIG.spreadsheetName);

  if (!files.hasNext()) {
    return null;
  }

  return SpreadsheetApp.open(files.next());
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
  return jsonText(JSON.stringify(payload));
}

function jsonText(json) {
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
