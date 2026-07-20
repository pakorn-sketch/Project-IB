/**
 * Google Apps Script API for the IB Pending Manage / QTA `main_data` sheet.
 * Deploy as a Web app (execute as Me, access Anyone).
 */
const IB_API_CONFIG = {
  spreadsheetId: "", // Optional when this script is bound to the source workbook.
  sheetName: "main_data",
  cacheKey: "ib-manage-main-data-v2",
  cacheSeconds: 300
};

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = String(params.action || "data").toLowerCase();

  try {
    if (action === "health") {
      return ibJsonResponse({
        success: true,
        message: "IB Manage API is running",
        sheet: IB_API_CONFIG.sheetName,
        updatedAt: new Date().toISOString()
      });
    }

    if (action === "clearcache") {
      CacheService.getScriptCache().remove(IB_API_CONFIG.cacheKey);
      return ibJsonResponse({
        success: true,
        message: "Cache cleared",
        updatedAt: new Date().toISOString()
      });
    }

    if (action === "ib" || action === "detail") {
      return ibDetailResponse(params);
    }

    if (action === "data") {
      return ibDataResponse(params);
    }

    return ibJsonResponse({
      success: false,
      message: "Unknown action: " + action
    });
  } catch (error) {
    return ibJsonResponse({
      success: false,
      message: error && error.message ? error.message : String(error),
      updatedAt: new Date().toISOString()
    });
  }
}

function ibDetailResponse(params) {
  const ibNo = String(params.ibNo || params.ib || "").trim();

  if (!ibNo) {
    return ibJsonResponse({
      success: false,
      message: "Missing required parameter: ibNo",
      example: "?action=ib&ibNo=456965"
    });
  }

  const payload = ibBuildPayload();
  const ibColumn = ibFindNumberColumn(payload.columns);

  if (!ibColumn) {
    throw new Error("IB number column not found. Expected IB No., IB No, IBNo, or IB.");
  }

  const normalizedSearch = ibNormalizeNumber(ibNo);
  const records = payload.data.filter(function(record) {
    return ibNormalizeNumber(record[ibColumn]) === normalizedSearch;
  });

  return ibJsonResponse({
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

function ibDataResponse(params) {
  const refresh = String(params.refresh || params._refresh || "") !== "";
  const cache = CacheService.getScriptCache();
  const cached = refresh ? null : cache.get(IB_API_CONFIG.cacheKey);

  if (cached) return ibJsonText(cached);

  const payload = ibBuildPayload();
  const json = JSON.stringify(payload);
  cache.put(IB_API_CONFIG.cacheKey, json, IB_API_CONFIG.cacheSeconds);
  return ibJsonText(json);
}

function ibBuildPayload() {
  const sheet = ibGetSourceSheet();
  const values = sheet.getDataRange().getValues();
  const updatedAt = new Date().toISOString();

  if (!values.length) {
    return {
      success: true,
      sheet: IB_API_CONFIG.sheetName,
      columns: [],
      total: 0,
      updatedAt: updatedAt,
      data: []
    };
  }

  const headers = values.shift().map(function(header) {
    return String(header || "").trim();
  });
  const data = values
    .filter(function(row) {
      return row.some(function(cell) { return cell !== "" && cell !== null; });
    })
    .map(function(row) {
      const record = {};
      headers.forEach(function(header, index) {
        if (header) record[header] = ibNormalizeCell(row[index]);
      });
      return record;
    });

  return {
    success: true,
    sheet: IB_API_CONFIG.sheetName,
    columns: headers.filter(String),
    total: data.length,
    updatedAt: updatedAt,
    data: data
  };
}

function ibGetSourceSheet() {
  const spreadsheet = IB_API_CONFIG.spreadsheetId
    ? SpreadsheetApp.openById(IB_API_CONFIG.spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("Spreadsheet not found. Bind the script to the workbook or fill spreadsheetId.");
  }

  const sheet = spreadsheet.getSheetByName(IB_API_CONFIG.sheetName);
  if (!sheet) throw new Error("Sheet tab not found: " + IB_API_CONFIG.sheetName);
  return sheet;
}

function ibFindNumberColumn(columns) {
  const accepted = ["ibno", "ibnumber", "ib"];
  return columns.find(function(column) {
    const normalized = String(column).toLowerCase().replace(/[^a-z0-9]/g, "");
    return accepted.indexOf(normalized) !== -1;
  }) || "";
}

function ibNormalizeNumber(value) {
  return String(value === null || value === undefined ? "" : value)
    .trim()
    .replace(/\.0+$/, "");
}

function ibNormalizeCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  }
  return value;
}

function ibJsonResponse(payload) {
  return ibJsonText(JSON.stringify(payload));
}

function ibJsonText(json) {
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
