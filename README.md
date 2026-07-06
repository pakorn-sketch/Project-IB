# IB Pending Monitor

Warehouse Dashboard for Internal Bill Monitoring

## Main Files

- `index.html` - main dashboard page
- `api/sheet.js` - dashboard API connection and browser cache
- `api/google-apps-script-doGet.js` - Google Apps Script API source
- `docs/api-reconnect.md` - API deploy and reconnect guide
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
