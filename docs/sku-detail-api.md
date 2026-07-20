# SKU Detail API

Use this API when a user clicks an IB number on the QTA page. The endpoint
searches `data_sku_hold.S_REFNO` and returns only the SKU rows for that IB.

It is designed for a source with a very large total row count: the code does
not call `getDataRange()` and does not send the full sheet to the browser.

## Deploy from the SKU workbook

1. Open the workbook containing the `data_sku_hold` tab.
2. Select **Extensions > Apps Script**.
3. Paste `api/google-apps-script-sku-detail-doGet.js` into the project.
4. Deploy it as a Web app with **Execute as: Me** and **Who has access: Anyone**.
5. Copy the resulting `/exec` URL into the QTA page configuration.

If the Apps Script is not bound to this workbook, set
`SKU_API_CONFIG.spreadsheetId` first.

## Request

```text
YOUR_SKU_EXEC_URL?action=sku&ibNo=456965
```

Example response:

```json
{
  "success": true,
  "found": true,
  "ibNo": "456965",
  "sheet": "data_sku_hold",
  "columns": ["S_REFNO", "S_STORE_TO", "S_PLUCODE", "S_DESC", "S_SIZE", "QTY", "TOTAL"],
  "total": 4,
  "matchedRows": 4,
  "truncated": false,
  "data": [
    {
      "S_REFNO": "456965",
      "S_STORE_TO": "S028",
      "S_PLUCODE": "3010032",
      "S_DESC": "KARSHINE CAR SHAMPOO 1000 ml. (FLORA)",
      "S_SIZE": "1/12",
      "QTY": "30",
      "TOTAL": "1530.9"
    }
  ]
}
```

## QTA click example

```js
async function openIbSkuDetail(ibNo) {
  const url = new URL(SKU_DETAIL_API_URL);
  url.searchParams.set("action", "sku");
  url.searchParams.set("ibNo", ibNo);

  const response = await fetch(url, { cache: "no-store" });
  const result = await response.json();
  if (!result.success) throw new Error(result.message);

  // Render result.data in the SKU detail modal/table.
  return result.data;
}
```

For best search performance, keep `data_sku_hold` sorted by `S_REFNO`. Results
for an IB are cached for 10 minutes. The safety limit is 5,000 SKU rows per IB;
when exceeded, `truncated` is true.
