# IB Pending Monitor

Warehouse Dashboard for Internal Bill Monitoring

## Main Files

- `index.html` - main dashboard page
- `api/sheet.js` - dashboard API connection and browser cache
- `api/google-apps-script-doGet.js` - Google Apps Script API source
- `api/google-apps-script-ib-manage-doGet.js` - `main_data` API with per-IB detail lookup
- `api/google-apps-script-sku-detail-doGet.js` - large-sheet SKU lookup by IB/S_REFNO
- `docs/api-reconnect.md` - API deploy and reconnect guide
- `docs/ib-detail-api.md` - deploy and consume the QTA IB detail API
- `docs/sku-detail-api.md` - deploy the per-IB SKU detail endpoint
- `js/` - dashboard logic, charts, filters, and table
- `css/` - dashboard styles
- `assets/` - logo and favicon
- `data/` - local sample/config data
- `utils/` - helper utilities

## Data Source

The dashboard loads data from Google Apps Script in `api/sheet.js`.

Apps Script source template:

- `api/google-apps-script-doGet.js`

Reconnect/deploy notes:

- `docs/api-reconnect.md`

## Features

- Pending Monitor
- KPI Dashboard
- Aging Analysis
- Excel Import
- Excel Export
- Search
- Filter
- Report

Version 1.0

## UI Architecture

- `css/enterprise.css` is the final presentation layer and central design-token source.
- Existing view CSS remains in place for QTA/Outbound-specific column sizing and behavior.
- Business logic, API URLs, cache keys, refresh schedules, field names, IDs, and `data-*` hooks remain framework-free and deployable as static files.

## Local Review

From the project directory, run any static HTTP server. For example:

```powershell
npx.cmd --yes http-server . -p 4173 -a 127.0.0.1 -c-1
```

Then open `http://127.0.0.1:4173/`. Do not review through `file://`, because API and cache behavior should be exercised from an HTTP origin.
