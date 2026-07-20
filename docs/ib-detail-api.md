# IB Detail API for QTA

This endpoint exposes every column of a selected IB from the `main_data` tab.

## Deploy

1. Open the Google Sheet that owns the `main_data` tab.
2. Open **Extensions > Apps Script**.
3. Replace the script with `api/google-apps-script-ib-manage-doGet.js`.
4. If the script is not bound to that workbook, fill `IB_API_CONFIG.spreadsheetId`.
5. Select **Deploy > Manage deployments > Edit > New version**.
6. Set **Execute as: Me** and **Who has access: Anyone**, then deploy.

Keep the `/exec` URL returned by Google. Existing dashboard loading remains:

```text
YOUR_EXEC_URL?action=data
```

## Fetch one IB

```text
YOUR_EXEC_URL?action=ib&ibNo=456965
```

The API accepts either `ibNo` or `ib`. It compares IB numbers exactly after
trimming spaces, so `4569` will not accidentally match `456965`.

Example JavaScript for the other QTA page:

```js
const IB_DETAIL_API_URL = "YOUR_EXEC_URL";

async function getIbDetail(ibNo) {
  const url = new URL(IB_DETAIL_API_URL);
  url.searchParams.set("action", "ib");
  url.searchParams.set("ibNo", ibNo);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`API failed: ${response.status}`);

  const result = await response.json();
  if (!result.success) throw new Error(result.message);
  if (!result.found) return null;
  return result.data;
}
```

Example response:

```json
{
  "success": true,
  "found": true,
  "ibNo": "456965",
  "sheet": "main_data",
  "total": 1,
  "updatedAt": "2026-07-20T10:00:00.000Z",
  "data": {
    "IB No.": 456965,
    "Store": "S028",
    "Name": "PCFP",
    "Type": "Normal IB"
  },
  "records": [
    {
      "IB No.": 456965,
      "Store": "S028",
      "Name": "PCFP",
      "Type": "Normal IB"
    }
  ]
}
```

Use `data` for the detail card. `records` is also included in case the sheet
contains multiple rows for one IB. No match returns `found: false`, `data: null`,
and `records: []`.
