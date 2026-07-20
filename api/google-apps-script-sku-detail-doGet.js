/**
 * SKU detail API for a large `data_sku_hold` Google Sheet.
 *
 * It never loads the whole sheet. It searches only the S_REFNO column and
 * reads the rows belonging to the requested IB.
 */
const SKU_API_CONFIG = {
  spreadsheetId: "", // Leave blank when this script is bound to the SKU workbook.
  spreadsheetName: "dataskuhold", // Fallback for a standalone Apps Script project.
  sheetName: "data_sku_hold",
  ibColumn: "S_REFNO",
  cacheSeconds: 600,
  maxRowsPerIb: 5000
};

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = String(params.action || "sku").toLowerCase();

  try {
    if (action === "health") {
      return skuJson({
        success: true,
        message: "IB SKU Detail API is running",
        sheet: SKU_API_CONFIG.sheetName,
        updatedAt: new Date().toISOString()
      });
    }

    if (action !== "sku" && action !== "detail") {
      return skuJson({ success: false, message: "Unknown action: " + action });
    }

    return getSkuByIb(params);
  } catch (error) {
    return skuJson({
      success: false,
      message: error && error.message ? error.message : String(error),
      updatedAt: new Date().toISOString()
    });
  }
}

function getSkuByIb(params) {
  const ibNo = String(params.ibNo || params.ib || "").trim();
  if (!ibNo) {
    return skuJson({
      success: false,
      message: "Missing required parameter: ibNo",
      example: "?action=sku&ibNo=456965"
    });
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = "sku-detail-v1-" + ibNo.replace(/[^a-zA-Z0-9_-]/g, "");
  const cached = cache.get(cacheKey);
  if (cached) return skuJsonText(cached);

  const sheet = getSkuSheet();
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) return skuResult(ibNo, [], []);

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(function(header) { return String(header || "").trim(); });
  const ibColumnIndex = findSkuColumn(headers, SKU_API_CONFIG.ibColumn);

  if (ibColumnIndex < 0) {
    throw new Error("Column not found: " + SKU_API_CONFIG.ibColumn);
  }

  const matches = sheet
    .getRange(2, ibColumnIndex + 1, lastRow - 1, 1)
    .createTextFinder(ibNo)
    .matchEntireCell(true)
    .matchCase(false)
    .findAll();

  const rowNumbers = matches
    .map(function(range) { return range.getRow(); })
    .sort(function(a, b) { return a - b; });
  const limitedRows = rowNumbers.slice(0, SKU_API_CONFIG.maxRowsPerIb);
  const values = readSkuRows(sheet, limitedRows, lastColumn);
  const records = values.map(function(row) {
    const record = {};
    headers.forEach(function(header, index) {
      if (header) record[header] = row[index];
    });
    return record;
  });
  const payload = buildSkuPayload(ibNo, headers, records, rowNumbers.length);
  const json = JSON.stringify(payload);

  // Apps Script cache values are limited to about 100 KB.
  if (json.length < 90000) cache.put(cacheKey, json, SKU_API_CONFIG.cacheSeconds);
  return skuJsonText(json);
}

function readSkuRows(sheet, rowNumbers, lastColumn) {
  if (!rowNumbers.length) return [];

  const groups = [];
  let start = rowNumbers[0];
  let previous = start;

  rowNumbers.slice(1).forEach(function(row) {
    if (row === previous + 1) {
      previous = row;
      return;
    }
    groups.push({ start: start, count: previous - start + 1 });
    start = row;
    previous = row;
  });
  groups.push({ start: start, count: previous - start + 1 });

  return groups.reduce(function(allRows, group) {
    const groupRows = sheet
      .getRange(group.start, 1, group.count, lastColumn)
      .getDisplayValues();
    return allRows.concat(groupRows);
  }, []);
}

function findSkuColumn(headers, expectedName) {
  const normalizedExpected = normalizeSkuHeader(expectedName);
  return headers.findIndex(function(header) {
    return normalizeSkuHeader(header) === normalizedExpected;
  });
}

function normalizeSkuHeader(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getSkuSheet() {
  let spreadsheet = SKU_API_CONFIG.spreadsheetId
    ? SpreadsheetApp.openById(SKU_API_CONFIG.spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet && SKU_API_CONFIG.spreadsheetName) {
    const files = DriveApp.getFilesByName(SKU_API_CONFIG.spreadsheetName);
    if (files.hasNext()) spreadsheet = SpreadsheetApp.open(files.next());
  }

  if (!spreadsheet) {
    throw new Error("Spreadsheet not found: " + SKU_API_CONFIG.spreadsheetName);
  }

  const sheet = spreadsheet.getSheetByName(SKU_API_CONFIG.sheetName);
  if (!sheet) throw new Error("Sheet tab not found: " + SKU_API_CONFIG.sheetName);
  return sheet;
}

function skuResult(ibNo, headers, records) {
  return skuJson(buildSkuPayload(ibNo, headers, records, records.length));
}

function buildSkuPayload(ibNo, headers, records, matchedRows) {
  return {
    success: true,
    found: matchedRows > 0,
    ibNo: ibNo,
    sheet: SKU_API_CONFIG.sheetName,
    columns: headers,
    total: records.length,
    matchedRows: matchedRows,
    truncated: matchedRows > records.length,
    updatedAt: new Date().toISOString(),
    data: records
  };
}

function skuJson(payload) {
  return skuJsonText(JSON.stringify(payload));
}

function skuJsonText(json) {
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
