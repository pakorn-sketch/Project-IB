// ===============================
// Global State
// ===============================

let allData = [];
let filteredData = [];
let sortColumn = "";
let sortDirection = "asc";
let agingChartFilter = "";
let filterChoices = {};
let autoRefreshTimer = null;
let ibManageData = [];
let ibManageFilteredData = [];
let ibManageHasLoaded = false;
let ibManageRefreshPromise = null;
let ibManageCacheDbPromise = null;
let ibManageLastUpdatedAt = null;
let ibManageActiveView = "qta";
const THEME_STORAGE_KEY = "ibPendingTheme";
const IB_MANAGE_API_URL = "https://script.google.com/macros/s/AKfycbydECZzOZ_7WCaV7qRj5xCZPo0_0yaIXUz_b8vzIOk0fD8yCSz7iCRiI60NV9yBH_8k/exec";
const IB_MANAGE_RENDER_LIMIT = 500;
const IB_MANAGE_CACHE_DB_NAME = "ib-manage-cache";
const IB_MANAGE_CACHE_STORE_NAME = "responses";
const IB_MANAGE_CACHE_KEY = "main-data";
const IB_MANAGE_CACHE_VERSION = 1;
const IB_MANAGE_CACHE_TTL_MS = 10 * 60 * 1000;
const IB_MANAGE_FILTERS = [
    { id: "ibManageTypeFilter", column: "Type" },
    { id: "ibManageSubWhFilter", column: "SUB WH" },
    { id: "ibManageQtaFilter", column: "QTA Process Alert" },
    { id: "ibManageObStatusFilter", column: "OB_Status" },
    { id: "ibManageTransportFilter", column: "Transport  Alert Pending" },
    { id: "ibManageZoneFilter", column: "Zone_Delivery" },
    { id: "ibManageProvinceFilter", column: "Province" }
];
const IB_MANAGE_QTA_TABLE_COLUMNS = [
    "IB No.",
    "Store",
    "Store name",
    "Type",
    "Aging",
    "SKU Pending",
    "% SDR",
    "Cost IB",
    "QTA Process Alert",
    "IB_SP",
    "Province",
    "Remark",
    "Generate Date",
    "Sent Transit Date"
];
const IB_MANAGE_OUTBOUND_TABLE_COLUMNS = [
    "IB No.",
    "Store",
    "Store name",
    "SUB WH",
    "Type",
    "Aging",
    "SKU Pending",
    "Total QTY Sent Transit",
    "Total QTY",
    "OB_Status",
    "OB_DC",
    "OB_Location",
    "OB_Scan_Date",
    "Transport  Alert Pending",
    "Zone_Delivery",
    "Day_Delivery",
    "Province",
    "Remark"
];
const APP_PAGES = {
    dashboard: {
        id: "dashboardPage",
        hash: "dashboard"
    },
    "ib-manage": {
        id: "ibManagePage",
        hash: "ib-pending-manage"
    },
    analytics: {
        id: "analyticsPage",
        hash: "analytics"
    },
    reports: {
        id: "reportsPage",
        hash: "reports"
    },
    settings: {
        id: "settingsPage",
        hash: "settings"
    }
};

const MULTI_FILTERS = [
    {
        id: "typeFilter",
        column: "Type",
        placeholder: "Select Type"
    },
    {
        id: "subwhFilter",
        column: "SUB WH",
        placeholder: "Select SUB WH"
    },
    {
        id: "storeFilter",
        column: "Store",
        placeholder: "Select Store"
    },
    {
        id: "remarkFilter",
        column: "Remark",
        placeholder: "Select Remark"
    },
    {
        id: "agingFilter",
        column: "Aging",
        placeholder: "Select Aging"
    }
];

window.onload = async () => {
    initTheme();
    bindPageNavigation();
    bindAutoRefresh();
    bindEvents();
    loadDashboard();
};

function bindPageNavigation() {
    document.querySelectorAll("[data-page-link]").forEach(link => {
        link.addEventListener("click", () => {
            showPage(link.dataset.pageLink);
        });
    });

    window.addEventListener("hashchange", () => {
        showPage(getPageNameFromHash(), false);
    });

    showPage(getPageNameFromHash(), false);
}

function showPage(pageName, updateHash = true) {
    const page = APP_PAGES[pageName] || APP_PAGES.dashboard;
    const resolvedPageName = APP_PAGES[pageName] ? pageName : "dashboard";
    const isDashboardPage = resolvedPageName === "dashboard";

    document.querySelectorAll(".app-page").forEach(page => {
        page.classList.toggle("active", page.id === APP_PAGES[resolvedPageName].id);
    });

    document.querySelectorAll(".sidebar nav a[data-page-link]").forEach(link => {
        link.classList.toggle("active", link.dataset.pageLink === resolvedPageName);
    });

    if (updateHash) {
        window.location.hash = page.hash;
    }

    if (isDashboardPage && typeof loadCharts === "function" && filteredData.length > 0) {
        setTimeout(() => loadCharts(filteredData), 0);
    }

    if (resolvedPageName === "ib-manage" && !ibManageHasLoaded) {
        loadIBManageData();
    }
}

function getPageNameFromHash() {
    const currentHash = window.location.hash.replace("#", "");

    return Object.entries(APP_PAGES)
        .find(([, page]) => page.hash === currentHash)?.[0] || "dashboard";
}

function bindEvents() {
    document.getElementById("refreshBtn").addEventListener("click", () => {
        loadDashboard({ forceRefresh: true });
    });
    document.getElementById("themeToggle").addEventListener("click", toggleTheme);
    document.getElementById("searchInput").addEventListener("input", applyFilters);
    document.getElementById("generateFrom").addEventListener("change", applyFilters);
    document.getElementById("generateTo").addEventListener("change", applyFilters);
    document.getElementById("transitFrom").addEventListener("change", applyFilters);
    document.getElementById("transitTo").addEventListener("change", applyFilters);
    document.getElementById("clearFilterBtn").addEventListener("click", clearFilters);
    document.getElementById("exportExcelBtn").addEventListener("click", exportToExcel);
    document.getElementById("ibManageRefreshBtn").addEventListener("click", () => {
        loadIBManageData({ forceRefresh: true });
    });
    document.getElementById("ibManageSearchInput").addEventListener("input", applyIBManageSearch);
    document.getElementById("ibManageClearFiltersBtn").addEventListener("click", clearIBManageFilters);

    IB_MANAGE_FILTERS.forEach(filter => {
        document.getElementById(filter.id).addEventListener("change", applyIBManageSearch);
    });

    document.querySelectorAll("[data-ib-manage-view]").forEach(button => {
        button.addEventListener("click", () => {
            setIBManageView(button.dataset.ibManageView);
        });
    });

    setIBManageView(ibManageActiveView);

    MULTI_FILTERS.forEach(filter => {
        document.getElementById(filter.id).addEventListener("change", applyFilters);
    });
}

async function loadIBManageData(options = {}) {
    const forceRefresh = options.forceRefresh === true;

    setIBManageLoading(true, forceRefresh ? "Refreshing main_data..." : "Loading main_data...");

    try {
        if (!forceRefresh) {
            const cached = await readIBManageCache();

            if (cached) {
                renderIBManagePayload(cached.payload, cached.expiresAt > Date.now() ? "cache" : "stale-cache");

                if (cached.expiresAt > Date.now()) {
                    return;
                }

                refreshIBManageDataInBackground();
                return;
            }
        }

        const payload = await refreshIBManageDataFromNetwork(forceRefresh);

        renderIBManagePayload(payload, "network");
    } catch (error) {
        console.error(error);
        ibManageHasLoaded = false;
        renderIBManageTable([]);
        renderIBManageSummary({
            data: [],
            updatedAt: null
        });
        updateIBManageEmptyState(error.message || "Load IB Pending Manage failed");
        setIBManageStatus("Load failed", true);
    } finally {
        setIBManageLoading(false);
    }
}

function renderIBManagePayload(payload, source = "network") {
    ibManageData = payload.data;
    ibManageLastUpdatedAt = payload.updatedAt || new Date().toISOString();
    ibManageHasLoaded = true;
    buildIBManageFilters();
    setIBManageView(ibManageActiveView);
    updateIBManageEmptyState(ibManageFilteredData.length === 0 ? "ไม่พบข้อมูลใน main_data" : "");
    updateIBManageCacheInfo(payload, source);
    setIBManageStatus(
        source === "stale-cache"
            ? `Loaded cached ${ibManageData.length.toLocaleString()} rows, refreshing...`
            : `Loaded ${ibManageData.length.toLocaleString()} rows`,
        false
    );
}

async function refreshIBManageDataFromNetwork(forceRefresh = false) {
    if (ibManageRefreshPromise) return ibManageRefreshPromise;

    ibManageRefreshPromise = fetchIBManageData(forceRefresh)
        .then(payload => normalizeIBManageApiResponse(payload))
        .then(async payload => {
            await writeIBManageCache(payload);
            return payload;
        })
        .finally(() => {
            ibManageRefreshPromise = null;
        });

    return ibManageRefreshPromise;
}

function refreshIBManageDataInBackground() {
    return refreshIBManageDataFromNetwork(true)
        .then(payload => {
            renderIBManagePayload(payload, "network");
            return payload;
        })
        .catch(error => {
            console.error("IB Manage background refresh failed", error);
            setIBManageStatus("Cached data loaded, refresh failed", true);
            updateIBManageEmptyState(error.message || "Background refresh failed");
            return null;
        });
}

function normalizeIBManageApiResponse(payload) {
    if (Array.isArray(payload)) {
        return {
            success: true,
            total: payload.length,
            updatedAt: new Date().toISOString(),
            data: payload
        };
    }

    if (payload && payload.success === true && Array.isArray(payload.data)) {
        return payload;
    }

    if (payload && payload.success === false) {
        throw new Error(payload.message || "IB Pending Manage API returned failed status");
    }

    throw new Error("API returned an invalid data format");
}

async function fetchIBManageData(forceRefresh = false) {
    const url = new URL(IB_MANAGE_API_URL);

    url.searchParams.set("action", "data");

    if (forceRefresh) {
        url.searchParams.set("_refresh", Date.now());
    }

    let response = null;

    try {
        response = await fetch(url.toString(), {
            cache: "no-store"
        });
    } catch (error) {
        throw error;
    }

    if (!response.ok) {
        throw new Error(`IB Manage API failed: ${response.status}`);
    }

    const text = await response.text();
    const trimmedText = text.trim();

    if (isGoogleLoginPage(trimmedText)) {
        throw new Error("API is asking for Google sign-in. Redeploy Apps Script with access set to Anyone.");
    }

    try {
        return JSON.parse(trimmedText);
    } catch (error) {
        throw new Error(`API returned non-JSON data: ${trimmedText.slice(0, 120)}`);
    }
}

function renderIBManageSummary(payload) {
    const data = Array.isArray(payload.data) ? payload.data : [];
    const columns = getIBManageColumns(data);
    const summary = summarizeIBManageData(data);

    const kpis = ibManageActiveView === "qta"
        ? [
            ["Total IB", summary.totalIB.toLocaleString()],
            ["QTA Exceptions", summary.qtaException.toLocaleString()],
            ["High SDR", summary.highSdr.toLocaleString()],
            ["Avg Aging", summary.avgAging.toFixed(1)],
            ["Aging 42+ Days", summary.highAging.toLocaleString()],
            ["Store Check SDR", summary.storeCheckSdr.toLocaleString()],
            ["Recheck Delivery", summary.transportRecheck.toLocaleString()],
            ["Settlement", summary.processSettlement.toLocaleString()]
        ]
        : [
            ["Total IB", summary.totalIB.toLocaleString()],
            ["SKU Pending", summary.pendingSKU.toLocaleString()],
            ["Pending Value", "฿ " + formatNumber(summary.pendingValue)],
            ["Found at OB", summary.obFound.toLocaleString()],
            ["Not Found at OB", summary.obNotFound.toLocaleString()],
            ["Urgent Dispatch", summary.urgentDispatch.toLocaleString()],
            ["Dispatch Planned", summary.dispatchPlanned.toLocaleString()],
            ["Avg Aging", summary.avgAging.toFixed(1)]
        ];

    [
        ["ibManageKpiLabel1", "ibManageTotalIB"],
        ["ibManageKpiLabel2", "ibManagePendingSKU"],
        ["ibManageKpiLabel3", "ibManagePendingValue"],
        ["ibManageKpiLabel4", "ibManageObFound"],
        ["ibManageKpiLabel5", "ibManageUrgentDispatch"],
        ["ibManageKpiLabel6", "ibManageAvgAging"],
        ["ibManageKpiLabel7", "ibManageHighSdr"],
        ["ibManageKpiLabel8", "ibManageQtaException"]
    ].forEach(([labelId, valueId], index) => {
        updateText(labelId, kpis[index][0]);
        updateText(valueId, kpis[index][1]);
    });

    updateText("ibManageUpdatedAt", formatIBManageUpdatedAt(payload.updatedAt));
    updateText("ibManageResultInfo", `${data.length.toLocaleString()} rows | ${columns.length.toLocaleString()} cols`);
}

function renderIBManageTable(data) {
    const tableHead = document.getElementById("ibManageTableHead");
    const tableBody = document.getElementById("ibManageTableBody");
    const columns = getIBManageTableColumns();

    if (!tableHead || !tableBody) return;

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    if (columns.length === 0) {
        updateText("ibManageResultInfo", "0 rows");
        return;
    }

    const headerRow = document.createElement("tr");
    const numberHeader = document.createElement("th");

    numberHeader.textContent = "No.";
    headerRow.appendChild(numberHeader);

    columns.forEach(column => {
        const th = document.createElement("th");

        th.textContent = column;
        headerRow.appendChild(th);
    });

    tableHead.appendChild(headerRow);

    data.forEach((item, rowIndex) => {
        if (rowIndex >= IB_MANAGE_RENDER_LIMIT) return;

        const row = document.createElement("tr");
        const numberCell = document.createElement("td");

        numberCell.textContent = rowIndex + 1;
        row.appendChild(numberCell);

        columns.forEach(column => {
            const cell = document.createElement("td");

            cell.textContent = formatIBManageCell(column, item[column]);
            cell.title = item[column] ?? "";
            row.appendChild(cell);
        });

        row.classList.toggle("manage-row-urgent", isIBManageUrgent(item));
        row.classList.toggle("manage-row-found", normalizeText(item["OB_Status"]) === "found at ob");

        tableBody.appendChild(row);
    });

    updateText(
        "ibManageResultInfo",
        data.length > IB_MANAGE_RENDER_LIMIT
            ? `Showing ${IB_MANAGE_RENDER_LIMIT.toLocaleString()} of ${data.length.toLocaleString()} rows`
            : `${data.length.toLocaleString()} rows`
    );
}

function applyIBManageSearch() {
    const keyword = document
        .getElementById("ibManageSearchInput")
        .value
        .toLowerCase()
        .trim();

    ibManageFilteredData = ibManageData.filter(item => {
        const matchesKeyword = keyword === "" ||
            Object.values(item).some(value =>
                String(value ?? "").toLowerCase().includes(keyword)
            );

        const matchesFilters = IB_MANAGE_FILTERS.every(filter => {
            const selectedValue = document.getElementById(filter.id).value;

            return selectedValue === "" || String(item[filter.column] ?? "") === selectedValue;
        });

        return matchesKeyword && matchesFilters;
    });

    renderIBManageTable(ibManageFilteredData);
    renderIBManageSummary({
        data: ibManageFilteredData,
        updatedAt: getIBManageCachedUpdatedAt()
    });
    renderIBManageMonitors(ibManageFilteredData);
    updateIBManageEmptyState(
        ibManageFilteredData.length === 0
            ? "ไม่พบข้อมูลที่ตรงกับคำค้นหา"
            : ""
    );
}

function getIBManageColumns(data) {
    const columnSet = new Set();

    data.forEach(item => {
        Object.keys(item).forEach(column => columnSet.add(column));
    });

    return Array.from(columnSet);
}

function getIBManageTableColumns() {
    const availableColumns = new Set(getIBManageColumns(ibManageData));
    const preferred = ibManageActiveView === "qta"
        ? IB_MANAGE_QTA_TABLE_COLUMNS
        : IB_MANAGE_OUTBOUND_TABLE_COLUMNS;

    return preferred.filter(column => availableColumns.has(column));
}

function buildIBManageFilters() {
    IB_MANAGE_FILTERS.forEach(filter => {
        const select = document.getElementById(filter.id);
        const currentValue = select.value;
        const values = [...new Set(
            ibManageData
                .map(item => item[filter.column])
                .filter(value => value !== undefined && value !== null && String(value).trim() !== "")
                .map(value => String(value))
        )].sort((a, b) => a.localeCompare(b));

        select.innerHTML = `<option value="">All</option>`;

        values.forEach(value => {
            const option = document.createElement("option");

            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });

        if (values.includes(currentValue)) {
            select.value = currentValue;
        }
    });
}

function clearIBManageFilters() {
    document.getElementById("ibManageSearchInput").value = "";

    IB_MANAGE_FILTERS.forEach(filter => {
        document.getElementById(filter.id).value = "";
    });

    applyIBManageSearch();
}

function setIBManageView(viewName) {
    if (!["qta", "outbound"].includes(viewName)) return;

    ibManageActiveView = viewName;

    document.querySelectorAll("[data-ib-manage-view]").forEach(button => {
        button.classList.toggle("active", button.dataset.ibManageView === viewName);
    });

    document.querySelectorAll("[data-ib-manage-filter]").forEach(filter => {
        const isVisible = filter.dataset.ibManageFilter.split(" ").includes(viewName);

        filter.classList.toggle("hidden", !isVisible);

        if (!isVisible) {
            const select = filter.querySelector("select");

            if (select) select.value = "";
        }
    });

    document.querySelectorAll("[data-ib-manage-panel]").forEach(panel => {
        panel.classList.toggle("hidden", panel.dataset.ibManagePanel !== viewName);
    });

    const searchInput = document.getElementById("ibManageSearchInput");

    searchInput.placeholder = viewName === "qta"
        ? "Search IB, Store, QTA, Remark, Province..."
        : "Search IB, Store, OB, Transport, Zone...";

    applyIBManageSearch();
}

function summarizeIBManageData(data) {
    const totalIB = data.filter(item => String(item["IB No."] ?? "").trim() !== "").length;
    const pendingSKU = sumIBManage(data, "SKU Pending");
    const pendingValue = sumIBManage(data, "Cost IB");
    const totalAging = sumIBManage(data, "Aging");
    const avgAging = totalIB === 0 ? 0 : totalAging / totalIB;
    const obFound = data.filter(item => normalizeText(item["OB_Status"]) === "found at ob").length;
    const obNotFound = data.filter(item => normalizeText(item["OB_Status"]) === "not found at ob").length;
    const urgentDispatch = data.filter(isIBManageUrgent).length;
    const dispatchPlanned = data.filter(item =>
        normalizeText(item["Transport  Alert Pending"]).includes("dispatch as planned")
    ).length;
    const highSdr = data.filter(item => parseIBManageNumber(item["% SDR"]) >= 0.8).length;
    const highAging = data.filter(item => parseIBManageNumber(item["Aging"]) >= 42).length;
    const qtaException = data.filter(item =>
        normalizeText(item["QTA Process Alert"]).includes("exception")
    ).length;
    const storeCheckSdr = data.filter(item =>
        normalizeText(item["QTA Process Alert"]).includes("store check sdr")
    ).length;
    const transportRecheck = data.filter(item =>
        normalizeText(item["QTA Process Alert"]).includes("transport recheck")
    ).length;
    const processSettlement = data.filter(item =>
        normalizeText(item["QTA Process Alert"]).includes("process settlement")
    ).length;

    return {
        totalIB,
        pendingSKU,
        pendingValue,
        avgAging,
        obFound,
        obNotFound,
        urgentDispatch,
        dispatchPlanned,
        highSdr,
        highAging,
        qtaException,
        storeCheckSdr,
        transportRecheck,
        processSettlement
    };
}

function renderIBManageMonitors(data) {
    renderIBManageBars("ibManageWhSplit", countByIBManage(data, "SUB WH"), data.length);
    renderIBManageBars("ibManageRiskSplit", countByIBManage(data, "QTA Process Alert"), data.length, 6);
    renderIBManageBars("ibManageZoneSplit", countByIBManage(data, "Zone_Delivery"), data.length, 6);
    renderIBManageActionQueue(data);
}

function renderIBManageBars(containerId, counts, total, limit = 5) {
    const container = document.getElementById(containerId);

    if (!container) return;

    const items = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

    if (items.length === 0) {
        container.innerHTML = `<div class="manage-empty-line">No data</div>`;
        return;
    }

    container.innerHTML = items.map(([label, count]) => {
        const percent = total === 0 ? 0 : (count / total) * 100;

        return `
            <div class="manage-mini-bar">
                <div class="manage-mini-bar-top">
                    <span>${escapeHtml(label || "(blank)")}</span>
                    <strong>${count.toLocaleString()}</strong>
                </div>
                <div class="manage-mini-bar-track">
                    <div style="width:${Math.max(percent, 2).toFixed(1)}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

function renderIBManageActionQueue(data) {
    const container = document.getElementById("ibManageActionQueue");

    if (!container) return;

    const summary = summarizeIBManageData(data);
    const actions = ibManageActiveView === "qta"
        ? [
            { label: "QTA exception", value: summary.qtaException, tone: "warning" },
            { label: "High SDR, store follow-up", value: summary.highSdr, tone: "danger" },
            { label: "Transport recheck delivery", value: summary.transportRecheck, tone: "warning" },
            { label: "Store check SDR", value: summary.storeCheckSdr, tone: "warning" },
            { label: "Aging 42+ days", value: summary.highAging, tone: "danger" }
        ]
        : [
            { label: "Urgent dispatch required", value: summary.urgentDispatch, tone: "danger" },
            { label: "Found at OB, ready to trace", value: summary.obFound, tone: "success" },
            { label: "Not found at OB", value: summary.obNotFound, tone: "warning" },
            { label: "Dispatch as planned", value: summary.dispatchPlanned, tone: "success" },
            { label: "Aging 42+ days", value: summary.highAging, tone: "danger" }
        ];

    container.innerHTML = actions.map(action => `
        <div class="manage-action-item ${action.tone}">
            <span>${escapeHtml(action.label)}</span>
            <strong>${action.value.toLocaleString()}</strong>
        </div>
    `).join("");
}

function countByIBManage(data, column) {
    return data.reduce((counts, item) => {
        const key = String(item[column] ?? "(blank)").trim() || "(blank)";

        counts[key] = (counts[key] || 0) + 1;
        return counts;
    }, {});
}

function sumIBManage(data, column) {
    return data.reduce((sum, item) => sum + parseIBManageNumber(item[column]), 0);
}

function parseIBManageNumber(value) {
    if (value === null || value === undefined || value === "") return 0;

    const number = Number(String(value).replace(/,/g, "").replace(/%/g, ""));

    return Number.isFinite(number) ? number : 0;
}

function normalizeText(value) {
    return String(value ?? "").trim().toLowerCase();
}

function isIBManageUrgent(item) {
    return normalizeText(item["Transport  Alert Pending"]).includes("urgent");
}

function formatIBManageCell(column, value) {
    if (value === null || value === undefined) return "";

    if (["Cost IB"].includes(column)) {
        return "฿ " + formatNumber(parseIBManageNumber(value));
    }

    if (["Total SKU", "Store Receive", "SKU Pending", "Total QTY", "Total QTY Sent Transit", "Aging"].includes(column)) {
        return parseIBManageNumber(value).toLocaleString();
    }

    if (column === "% SDR") {
        const number = parseIBManageNumber(value);

        return number <= 1 ? `${(number * 100).toFixed(1)}%` : `${number.toFixed(1)}%`;
    }

    return value;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function setIBManageLoading(isLoading, message = "Loading main_data...") {
    const button = document.getElementById("ibManageRefreshBtn");

    if (button) {
        button.disabled = isLoading;
        button.innerHTML = isLoading
            ? `<span class="refresh-spinner"></span>${message}`
            : "🔄 Refresh";
    }

    if (isLoading) {
        setIBManageStatus(message, false);
        updateIBManageEmptyState(message);
    }
}

function setIBManageStatus(message, isError = false) {
    const status = document.getElementById("ibManageStatus");

    if (!status) return;

    status.classList.toggle("manage-status-error", isError);
    status.textContent = message;
}

function updateIBManageEmptyState(message) {
    const emptyState = document.getElementById("ibManageEmptyState");

    if (!emptyState) return;

    emptyState.classList.toggle("show", Boolean(message));
    emptyState.textContent = message || "";
}

function formatIBManageUpdatedAt(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString();
}

function getIBManageCachedUpdatedAt() {
    return ibManageLastUpdatedAt || new Date().toISOString();
}

function updateIBManageCacheInfo(payload, source) {
    const info = document.getElementById("ibManageCacheInfo");

    if (!info) return;

    const updatedAt = formatIBManageUpdatedAt(payload.updatedAt || ibManageLastUpdatedAt);
    const sourceLabel = {
        "network": "Network",
        "cache": "Cache",
        "stale-cache": "Stale cache"
    }[source] || source;

    info.textContent = `${sourceLabel} | ${updatedAt}`;
}

async function readIBManageCache() {
    try {
        const db = await openIBManageCacheDb();
        const cached = await runIBManageCacheTransaction(db, "readonly", store => store.get(IB_MANAGE_CACHE_KEY));

        if (!cached || cached.version !== IB_MANAGE_CACHE_VERSION || !cached.payload) {
            return null;
        }

        return cached;
    } catch (error) {
        console.warn("IB Manage cache read skipped", error);
        return null;
    }
}

async function writeIBManageCache(payload) {
    const now = Date.now();
    const record = {
        key: IB_MANAGE_CACHE_KEY,
        version: IB_MANAGE_CACHE_VERSION,
        payload: {
            ...payload,
            updatedAt: payload.updatedAt || new Date(now).toISOString()
        },
        savedAt: now,
        expiresAt: now + IB_MANAGE_CACHE_TTL_MS
    };

    try {
        const db = await openIBManageCacheDb();

        await runIBManageCacheTransaction(db, "readwrite", store => store.put(record));
    } catch (error) {
        console.warn("IB Manage cache write skipped", error);
    }
}

async function openIBManageCacheDb() {
    if (ibManageCacheDbPromise) return ibManageCacheDbPromise;

    ibManageCacheDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(IB_MANAGE_CACHE_DB_NAME, 1);

        request.onupgradeneeded = event => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(IB_MANAGE_CACHE_STORE_NAME)) {
                db.createObjectStore(IB_MANAGE_CACHE_STORE_NAME, { keyPath: "key" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return ibManageCacheDbPromise;
}

function runIBManageCacheTransaction(db, mode, action) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IB_MANAGE_CACHE_STORE_NAME, mode);
        const store = transaction.objectStore(IB_MANAGE_CACHE_STORE_NAME);
        const request = action(store);
        let result = null;

        request.onsuccess = () => {
            result = request.result;
        };

        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = savedTheme || (prefersDark ? "dark" : "light");

    applyTheme(theme);
}

function toggleTheme() {
    const nextTheme = document.body.classList.contains("dark-mode")
        ? "light"
        : "dark";

    applyTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);

    if (typeof loadCharts === "function" && filteredData.length > 0) {
        loadCharts(filteredData);
    }
}

function applyTheme(theme) {
    const isDark = theme === "dark";
    const toggle = document.getElementById("themeToggle");
    const themeColor = document.querySelector("meta[name='theme-color']");

    document.body.classList.toggle("dark-mode", isDark);

    if (themeColor) {
        themeColor.setAttribute("content", isDark ? "#111827" : "#FFD400");
    }

    if (!toggle) return;

    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    toggle.querySelector(".theme-toggle-icon").textContent = isDark ? "☀️" : "🌙";
    toggle.querySelector(".theme-toggle-text").textContent = isDark ? "Light" : "Dark";
}

// ===============================
// Load Dashboard
// ===============================

async function loadDashboard(options = {}) {
    const isManualRefresh = options.forceRefresh === true;

    try {
        setRefreshLoading(true, isManualRefresh ? "Refreshing..." : "Loading...");
        setLoadingStatus(isManualRefresh ? "Refreshing latest data..." : "Loading latest data...");

        allData = await getData({
            forceRefresh: isManualRefresh
        });

        renderDashboardData(allData);
        updateDataStatus();
        scheduleAutoRefresh();
    } catch (error) {
        console.error(error);
        setLoadingStatus(`Refresh failed: ${error.message}`, false, true);
    } finally {
        setRefreshLoading(false);
    }
}

function renderDashboardData(data) {
    allData = data;

    destroyPowerBIFilters();
    buildFilters();
    buildPowerBIFilters();

    applyFilters();
}

function bindAutoRefresh() {
    window.addEventListener("ib-cache-updated", event => {
        if (!event.detail || !Array.isArray(event.detail.data)) return;

        renderDashboardData(event.detail.data);
        updateDataStatus("Auto refreshed");
        scheduleAutoRefresh();
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            if (!refreshExpiredCache()) {
                scheduleAutoRefresh();
            }
        }
    });
}

function scheduleAutoRefresh() {
    if (autoRefreshTimer) {
        clearTimeout(autoRefreshTimer);
        autoRefreshTimer = null;
    }

    if (typeof getNextDataRefreshTime !== "function") return;

    const nextRefresh = getNextDataRefreshTime();
    const delay = Math.max(nextRefresh.getTime() - Date.now(), 1000);

    autoRefreshTimer = setTimeout(() => {
        if (typeof refreshDataInBackground === "function") {
            setLoadingStatus("Refreshing data in background...", true);
            refreshDataInBackground().finally(scheduleAutoRefresh);
        }
    }, delay);
}

function refreshExpiredCache() {
    const info = typeof getLastDataInfo === "function" ? getLastDataInfo() : null;

    if (!info || info.expiresAt > Date.now() || typeof refreshDataInBackground !== "function") {
        return false;
    }

    setLoadingStatus("Refreshing data in background...", true);
    refreshDataInBackground().finally(scheduleAutoRefresh);

    return true;
}

function updateDataStatus(prefix = "Last Update") {
    const info = typeof getLastDataInfo === "function" ? getLastDataInfo() : null;

    if (!info) {
        setLoadingStatus(`${prefix} : ${new Date().toLocaleString()}`, false);
        return;
    }

    const savedAt = new Date(info.savedAt).toLocaleString();
    const nextRefresh = new Date(info.nextRefreshAt).toLocaleString();
    const isStale = info.source === "stale-cache";
    const sourceLabel = isStale ? "Cached data, refreshing..." : prefix;

    setLoadingStatus(
        `${sourceLabel} : ${savedAt} | Next refresh : ${nextRefresh}`,
        isStale,
        false
    );
}

function setRefreshLoading(isLoading, text = "Refresh") {
    const refreshBtn = document.getElementById("refreshBtn");

    if (!refreshBtn) return;

    refreshBtn.disabled = isLoading;
    refreshBtn.innerHTML = isLoading
        ? `<span class="refresh-spinner"></span>${text}`
        : "🔄 Refresh";
}

function setLoadingStatus(message, showSpinner = true, isError = false) {
    const status = document.getElementById("lastUpdate");

    if (!status) return;

    status.classList.toggle("loading-error", isError);
    status.innerHTML = showSpinner
        ? `<span class="loading-spinner"></span><span class="loading-text">${message}</span>`
        : message;
}

function buildFilters() {
    MULTI_FILTERS.forEach(filter => {
        buildFilter(filter.id, filter.column);
    });
}

function buildChoicesFilters() {
    filterChoices = {};

    MULTI_FILTERS.forEach(filter => {
        filterChoices[filter.id] = new Choices(`#${filter.id}`, {
            removeItemButton: true,
            searchEnabled: true,
            shouldSort: false,
            placeholder: true,
            placeholderValue: filter.placeholder,
            searchPlaceholderValue: "Search...",
            itemSelectText: "",
            noResultsText: "No results found",
            noChoicesText: "No more choices"
        });
    });

    window.typeChoices = filterChoices.typeFilter;
}

function destroyChoicesFilters() {
    Object.values(filterChoices).forEach(choice => {
        choice.destroy();
    });

    filterChoices = {};

    if (window.typeChoices) {
        window.typeChoices = null;
    }
}

// ===============================
// Filters
// ===============================

function getSelectedValues(id) {
    if (filterChoices[id]) {
        const value = filterChoices[id].getValue(true);

        return Array.isArray(value)
            ? value
            : [value].filter(Boolean);
    }

    return Array.from(document.getElementById(id).selectedOptions)
        .map(option => option.value)
        .filter(Boolean);
}

function formatDateOnly(value) {
    if (!value) return "";

    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function applyFilters() {
    const keyword = document
        .getElementById("searchInput")
        .value
        .toLowerCase()
        .trim();

    const selectedTypes = getSelectedValues("typeFilter");
    const selectedSubWH = getSelectedValues("subwhFilter");
    const selectedStores = getSelectedValues("storeFilter");
    const selectedRemarks = getSelectedValues("remarkFilter");
    const selectedAgings = getSelectedValues("agingFilter");
    const generateFrom = document.getElementById("generateFrom").value;
    const generateTo = document.getElementById("generateTo").value;
    const transitFrom = document.getElementById("transitFrom").value;
    const transitTo = document.getElementById("transitTo").value;

    filteredData = allData.filter(item => {
        const matchSearch =
            keyword === "" ||
            Object.values(item).some(value =>
                String(value).toLowerCase().includes(keyword)
            );

        const matchType = matchesSelectedValue(selectedTypes, item["Type"]);

        const matchSubWH = matchesSelectedValue(selectedSubWH, item["SUB WH"]);

        const matchStore = matchesSelectedValue(selectedStores, item["Store"]);

        const matchRemark = matchesSelectedValue(selectedRemarks, item["Remark"]);

        const matchAging = matchesSelectedValue(selectedAgings, item["Aging"]);

        const generateDate = formatDateOnly(item["Generate Date"]);
        const transitDate = formatDateOnly(item["Sent Transit Date"]);

        const matchGenerateDate =
            (!generateFrom || generateDate >= generateFrom) &&
            (!generateTo || generateDate <= generateTo);

        const matchTransitDate =
            (!transitFrom || transitDate >= transitFrom) &&
            (!transitTo || transitDate <= transitTo);

        return (
            matchSearch &&
            matchType &&
            matchSubWH &&
            matchStore &&
            matchRemark &&
            matchAging &&
            matchGenerateDate &&
            matchTransitDate &&
            matchAgingChart(item)
        );
    });

    createSummary(filteredData);
    loadCharts(filteredData);

    if (sortColumn !== "") {
        sortFilteredData();
        updateSortIcons();
    }

    renderTable(filteredData);
}

function matchesSelectedValue(selectedValues, value) {
    return (
        selectedValues.length === 0 ||
        selectedValues.includes(String(value))
    );
}

function matchAgingChart(item) {
    if (agingChartFilter === "") return true;

    const agingValue = Number(item["Aging"]);

    switch (agingChartFilter) {
        case "0-7":
            return agingValue >= 0 && agingValue <= 7;
        case "8-14":
            return agingValue >= 8 && agingValue <= 14;
        case "15-21":
            return agingValue >= 15 && agingValue <= 21;
        case "22-28":
            return agingValue >= 22 && agingValue <= 28;
        case "29-35":
            return agingValue >= 29 && agingValue <= 35;
        case "36-42":
            return agingValue >= 36 && agingValue <= 42;
        case "43-49":
            return agingValue >= 43 && agingValue <= 49;
        case "50-56":
            return agingValue >= 50 && agingValue <= 56;
        case "57+":
            return agingValue >= 57;
        default:
            return true;
    }
}

function buildFilter(filterId, columnName) {
    const select = document.getElementById(filterId);

    select.innerHTML = "";

    const values = [...new Set(
        allData
            .map(item => item[columnName])
            .filter(Boolean)
    )].sort((a, b) => {
        if (!isNaN(a) && !isNaN(b)) {
            return Number(a) - Number(b);
        }

        return String(a).localeCompare(String(b));
    });

    values.forEach(value => {
        const option = document.createElement("option");

        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function clearFilters() {
    document.getElementById("searchInput").value = "";

    MULTI_FILTERS.forEach(filter => {
        if (filterChoices[filter.id]) {
            filterChoices[filter.id].removeActiveItems();
        } else {
            Array.from(document.getElementById(filter.id).options).forEach(option => {
                option.selected = false;
            });
        }
    });
    document.getElementById("generateFrom").value = "";
    document.getElementById("generateTo").value = "";
    document.getElementById("transitFrom").value = "";
    document.getElementById("transitTo").value = "";

    currentPage = 1;
    sortColumn = "";
    sortDirection = "asc";
    agingChartFilter = "";
    filteredData = [...allData];

    updateSortIcons();
    applyFilters();
    document.getElementById("searchInput").focus();
}

// ===============================
// KPI Summary
// ===============================

function createSummary(data) {
    const validData = data.filter(item =>
        String(item["IB No."] || "").trim() !== ""
    );

    let totalSKU = 0;
    let receivedSKU = 0;
    let pendingSKU = 0;
    let totalCost = 0;
    let totalAging = 0;
    let warning = 0;
    let critical = 0;

    validData.forEach(item => {
        const aging = Number(item["Aging"]) || 0;

        totalSKU += Number(item["Total SKU"]) || 0;
        receivedSKU += Number(item["Store Receive"]) || 0;
        pendingSKU += Number(item["SKU Pending"]) || 0;
        totalCost += Number(item["Cost IB"]) || 0;
        totalAging += aging;

        if (aging >= 42) warning++;
        if (aging >= 56) critical++;
    });

    const receivePercent = totalSKU === 0 ? 0 : (receivedSKU / totalSKU) * 100;
    const pendingPercent = totalSKU === 0 ? 0 : (pendingSKU / totalSKU) * 100;
    const avgAging = validData.length === 0 ? 0 : totalAging / validData.length;

    document.getElementById("pendingIB").innerHTML = validData.length.toLocaleString();
    document.getElementById("totalSKU").innerHTML = totalSKU.toLocaleString();
    document.getElementById("receivedSKU").innerHTML = receivedSKU.toLocaleString();
    document.getElementById("pendingSKU").innerHTML = pendingSKU.toLocaleString();
    document.getElementById("pendingCost").innerHTML = "฿ " + formatNumber(totalCost);
    document.getElementById("avgAging").innerHTML = avgAging.toFixed(1);

    updateText("warning", warning.toLocaleString());
    updateText("critical", critical.toLocaleString());
    updateText("ibSub", "Total Pending IB");
    updateText("skuSub", "All SKUs");
    updateText("receiveSub", receivePercent.toFixed(1) + "% Received");
    updateText("pendingSub", pendingPercent.toFixed(1) + "% Remaining");
    updateText("costSub", "Pending Value");
    updateText("agingSub", "Average Days");
}

function formatNumber(value) {
    if (value >= 1000000000) return (value / 1000000000).toFixed(2) + " B";
    if (value >= 1000000) return (value / 1000000).toFixed(2) + " M";
    if (value >= 1000) return (value / 1000).toFixed(2) + " K";

    return value.toLocaleString();
}

function updateText(id, value) {
    const el = document.getElementById(id);

    if (el) {
        el.innerHTML = value;
    }
}

// ===============================
// Sort Table
// ===============================

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
        sortColumn = column;
        sortDirection = "asc";
    }

    sortFilteredData();
    updateSortIcons();
    renderTable(filteredData);
}

function sortFilteredData() {
    filteredData.sort((a, b) => {
        let x = a[sortColumn];
        let y = b[sortColumn];

        if (sortColumn === "Generate Date" || sortColumn === "Sent Transit Date") {
            x = new Date(x);
            y = new Date(y);
        } else if (!isNaN(x) && !isNaN(y)) {
            x = Number(x);
            y = Number(y);
        } else {
            x = String(x).toLowerCase();
            y = String(y).toLowerCase();
        }

        if (x > y) return sortDirection === "asc" ? 1 : -1;
        if (x < y) return sortDirection === "asc" ? -1 : 1;

        return 0;
    });
}

function updateSortIcons() {
    document.querySelectorAll(".sort-icon").forEach(icon => {
        icon.innerHTML = "↕";
    });

    document.querySelectorAll("th").forEach(th => {
        th.classList.remove("active-sort");
    });

    const map = {
        "IB No.": "sort-ibno",
        "Store": "sort-store",
        "Type": "sort-type",
        "SUB WH": "sort-subwh",
        "Generate Date": "sort-generatedate",
        "Sent Transit Date": "sort-transitdate",
        "Aging": "sort-aging",
        "Total SKU": "sort-totalsku",
        "SKU Pending": "sort-skupending",
        "% SDR": "sort-sdr",
        "Cost IB": "sort-costib",
        "Remark": "sort-remark"
    };

    const icon = document.getElementById(map[sortColumn]);

    if (!icon) return;

    icon.innerHTML = sortDirection === "asc" ? "▲" : "▼";

    const th = icon.closest("th");

    if (th) {
        th.classList.add("active-sort");
    }
}

// ===============================
// Export
// ===============================

function exportToExcel() {
    const exportData = filteredData.map(item => ({
        ...item,
        "Generate Date": formatDateOnly(item["Generate Date"]),
        "Sent Transit Date": formatDateOnly(item["Sent Transit Date"])
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    const today = new Date();
    const fileName =
        `IB Pending ${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}.xlsx`;

    XLSX.utils.book_append_sheet(wb, ws, "Pending List");
    XLSX.writeFile(wb, fileName);
}

