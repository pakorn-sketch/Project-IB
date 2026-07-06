function doGet() {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("summary");

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: "Sheet not found: summary"
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
    data
  });
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
