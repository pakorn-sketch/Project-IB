# API Reconnect Guide

Current web API URL:

```text
https://script.google.com/macros/s/AKfycbz9CMnfJ_ULdvTQiIP3KRwuLFtZdSyHqtFSl2GpzAK5Zzj-nxudn9SRcRldbf3geJyf/exec
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

Do not use the domain-only URL format:

```text
https://script.google.com/a/macros/mrdiy.com/s/.../exec
```

That URL can force Google sign-in. Use the public `/macros/s/.../exec` URL above.

## Test URLs

Data:

```text
https://script.google.com/macros/s/AKfycbz9CMnfJ_ULdvTQiIP3KRwuLFtZdSyHqtFSl2GpzAK5Zzj-nxudn9SRcRldbf3geJyf/exec?action=data
```

Current production response shape:

```json
[
  {
    "Generate Date": "2025-09-03T17:00:00.000Z",
    "Sent Transit Date": "2025-09-03T17:00:00.000Z",
    "Aging": 305,
    "IB No.": 335804,
    "Store": "B132"
  }
]
```

The dashboard supports both this array response and the newer wrapped response from
`api/google-apps-script-doGet.js`.

If the endpoint returns plain text like `API OK`, the Apps Script deployment is still
using old test code. Create a new version and deploy again.
