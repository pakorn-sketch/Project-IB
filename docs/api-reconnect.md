# API Reconnect Guide

Current web API URL:

```text
https://script.google.com/macros/s/AKfycbyYNIGkhzTs-ZtQ4zgV3evYdVjmgh49a74Lze0YZzy66uyVqFmLbhFNxZTW10oPBvs/exec
```

The dashboard calls:

```text
?action=data
```

## Apps Script Setup

1. Open the Google Apps Script project for the web app URL above.
2. Delete the old test code that returns plain text like `API OK`.
3. Replace the current code with the full code from:

```text
api/google-apps-script-doGet.js
```

4. The API is configured for Google Sheet `Backup Web IB Tracking`.
5. Confirm the source sheet tab is named `summary`.
6. If the script cannot find the spreadsheet by name, fill `CONFIG.spreadsheetId`.
7. Click `Save`.
8. Deploy a new web app version:

```text
Deploy > Manage deployments > Edit > New version > Deploy
```

Recommended deployment settings:

```text
Execute as: Me
Who has access: Anyone
```

Do not use the domain-only URL format:

```text
https://script.google.com/a/macros/mrdiy.com/s/.../exec
```

That URL can force Google sign-in. Use the public `/macros/s/.../exec` URL above.

## Test URLs

Health:

```text
https://script.google.com/macros/s/AKfycbyYNIGkhzTs-ZtQ4zgV3evYdVjmgh49a74Lze0YZzy66uyVqFmLbhFNxZTW10oPBvs/exec?action=health
```

Data:

```text
https://script.google.com/macros/s/AKfycbyYNIGkhzTs-ZtQ4zgV3evYdVjmgh49a74Lze0YZzy66uyVqFmLbhFNxZTW10oPBvs/exec?action=data
```

Expected health response:

```json
{
  "success": true,
  "message": "IB Pending API is running",
  "sheet": "summary",
  "updatedAt": "2026-07-06T00:00:00.000Z"
}
```

Expected data response:

```json
{
  "success": true,
  "sheet": "summary",
  "total": 1,
  "updatedAt": "2026-07-06T00:00:00.000Z",
  "data": [
    {
      "Generate Date": "2025-09-03T17:00:00",
      "Sent Transit Date": "2025-09-03T17:00:00",
      "Aging": 305,
      "IB No.": 335804,
      "Store": "B132"
    }
  ]
}
```

The dashboard supports both this wrapped response and the older direct array response.

If the endpoint returns plain text like `API OK`, the Apps Script deployment is still
using old test code. Create a new version and deploy again.

If the endpoint opens a Google sign-in page, the deployment access is not public.
Set `Who has access` to `Anyone` and use the `/macros/s/.../exec` URL.
