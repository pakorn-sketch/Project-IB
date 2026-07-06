const SOURCE_SHEET_NAME = "summary";

function doGet(e) {
  const action = e && e.parameter && e.parameter.action
    ? String(e.parameter.action).toLowerCase()
    : "data";

  if (action === "health") {
    return jsonResponse({
      success: true,
      message: "API OK"
    });
  }

  if (action !== "data") {
    return jsonResponse({
      success: false,
      message: "Unknown action"
    });
  }

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SOURCE_SHEET_NAME);

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: `Sheet not found: ${SOURCE_SHEET_NAME}`
    });
  }

  const values = sheet.getDataRange().getValues();

  if (values.length === 0) {
    return jsonResponse({
      success: true,
      data: []
    });
  }

  const headers = values.shift();
  const data = values.map(row => {
    const obj = {};

    headers.forEach((header, index) => {
      obj[header] = row[index];
    });

    return obj;
  });

  return jsonResponse({
    success: true,
    sheet: SOURCE_SHEET_NAME,
    total: data.length,
    updatedAt: new Date().toISOString(),
    data
  });
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
