# API Reconnect Guide

Current web API URL:

```text
https://script.google.com/macros/s/AKfycbzzuP8rNCTRgBl__hNUIG8V4p_jtHd14TcvZhTQX1L7nBs1DftKP3iIJeWFhMPCPbBl/exec
```

The dashboard calls:

```text
?action=data
```

## Apps Script Setup

1. Open the Google Apps Script project for the web app URL above.
2. Replace the current code with the code from:

```text
api/google-apps-script-doGet.js
```

3. If the script is not bound to the spreadsheet, fill `SPREADSHEET_ID`.
4. Confirm the source sheet tab is named `summary`.
5. Deploy a new web app version:

```text
Deploy > Manage deployments > Edit > New version > Deploy
```

Recommended deployment settings:

```text
Execute as: Me
Who has access: Anyone
```

## Test URLs

Health check:

```text
https://script.google.com/macros/s/AKfycbzzuP8rNCTRgBl__hNUIG8V4p_jtHd14TcvZhTQX1L7nBs1DftKP3iIJeWFhMPCPbBl/exec?action=health
```

Data:

```text
https://script.google.com/macros/s/AKfycbzzuP8rNCTRgBl__hNUIG8V4p_jtHd14TcvZhTQX1L7nBs1DftKP3iIJeWFhMPCPbBl/exec?action=data
```

Expected data response shape:

```json
{
  "success": true,
  "sheet": "summary",
  "total": 10,
  "updatedAt": "2026-07-06T00:00:00.000Z",
  "data": []
}
```

If the endpoint still returns plain text like `API OK`, the Apps Script deployment is still using old test code. Create a new version and deploy again.
