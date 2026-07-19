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
let ibManageCurrentPage = 1;
let ibManagePageSize = 100;
let ibManageSortColumn = "";
let ibManageSortDirection = "asc";
let ibManageAutoRefreshTimer = null;
let ibManageFilterInstances = {};
let ibManageAgingChart = null;
let ibManageActiveQuickFocus = "";
let ibManageChartFilters = {};
const ibManageViewStates = {
    qta: createIBManageViewState(),
    outbound: createIBManageViewState()
};
const THEME_STORAGE_KEY = "ibPendingTheme";
const IB_MANAGE_API_URL = "https://script.google.com/macros/s/AKfycbydECZzOZ_7WCaV7qRj5xCZPo0_0yaIXUz_b8vzIOk0fD8yCSz7iCRiI60NV9yBH_8k/exec";
const IB_MANAGE_RENDER_LIMIT = 500;
const IB_MANAGE_CACHE_DB_NAME = "ib-manage-cache";
const IB_MANAGE_CACHE_STORE_NAME = "responses";
const IB_MANAGE_CACHE_KEY = "main-data";
const IB_MANAGE_CACHE_STORAGE_KEY = "ibManageMainDataCache";
const IB_MANAGE_CACHE_VERSION = 1;
const IB_MANAGE_AUTO_REFRESH_STORAGE_KEY = "ibManageAutoRefresh";
const IB_MANAGE_AUTO_REFRESH_FALLBACK_SCHEDULE = [
    { hour: 9, minute: 10 },
    { hour: 11, minute: 10 },
    { hour: 14, minute: 10 },
    { hour: 16, minute: 10 },
    { hour: 17, minute: 30 }
];
const IB_MANAGE_QTA_KPI_EXCLUDED_TYPES = new Set([
    "e-com ib",
    "extra ib",
    "new store ib"
]);
const IB_MANAGE_FILTERS = [
    { id: "ibManageTypeFilter", column: "Type" },
    { id: "ibManageStoreFilter", column: "Store" },
    { id: "ibManageAgingFilter", column: "Aging", range: "aging7" },
    { id: "ibManageSubWhFilter", column: "SUB WH" },
    { id: "ibManageMissingFilter", column: "% SDR", range: "missingPercent" },
    { id: "ibManageQtaFilter", column: "QTA Process Alert" },
    { id: "ibManageObStatusFilter", column: "OB_Status" },
    { id: "ibManageTransportFilter", column: "Transport  Alert Pending" },
    { id: "ibManageZoneFilter", column: "Zone_Delivery" },
    { id: "ibManageRemarkFilter", column: "Remark" },
    { id: "ibManageObDcFilter", column: "OB_DC" },
    { id: "ibManageProvinceFilter", column: "Province" }
];
const IB_MANAGE_QTA_TABLE_COLUMNS = [
    "IB No.",
    "Store",
    "Store name",
    "Type",
    "Generate Date",
    "Sent Transit Date",
    "Aging",
    "Total SKU",
    "SKU Pending",
    "Pending AMT",
    "% SDR",
    "SDR AMT",
    "QTA Process Alert",
    "Remark",
    "OB_Status",
    "OB_DC",
    "Zone_Delivery"
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
    "ib-outbound": {
        id: "ibManagePage",
        hash: "outbound-transport-manage"
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
    const manageMenu = document.querySelector(".sidebar-manage-menu");
    const manageMenuToggle = document.querySelector(".sidebar-manage-toggle");

    const toggleManageMenu = () => {
        const isOpen = manageMenu.classList.toggle("open");
        manageMenuToggle.setAttribute("aria-expanded", String(isOpen));
    };

    manageMenuToggle?.addEventListener("click", toggleManageMenu);
    manageMenuToggle?.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleManageMenu();
        }
    });

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

    const isManagePage = resolvedPageName === "ib-manage" || resolvedPageName === "ib-outbound";
    const manageMenu = document.querySelector(".sidebar-manage-menu");
    const manageMenuToggle = document.querySelector(".sidebar-manage-toggle");

    manageMenu?.classList.toggle("open", isManagePage);
    manageMenuToggle?.classList.toggle("active", isManagePage);
    manageMenuToggle?.setAttribute("aria-expanded", String(isManagePage));

    if (updateHash) {
        window.location.hash = page.hash;
    }

    if (isDashboardPage && typeof loadCharts === "function" && filteredData.length > 0) {
        setTimeout(() => loadCharts(filteredData), 0);
    }

    if (isManagePage) {
        setIBManageView(resolvedPageName === "ib-outbound" ? "outbound" : "qta");
    }

    if (isManagePage && !ibManageHasLoaded) {
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
    document.getElementById("ibManageAutoRefreshToggle").addEventListener("click", toggleIBManageAutoRefresh);
    document.getElementById("ibManageSearchInput").addEventListener("input", applyIBManageSearch);
    document.getElementById("ibManageGenerateFrom").addEventListener("change", applyIBManageSearch);
    document.getElementById("ibManageGenerateTo").addEventListener("change", applyIBManageSearch);
    document.getElementById("ibManageTransitFrom").addEventListener("change", applyIBManageSearch);
    document.getElementById("ibManageTransitTo").addEventListener("change", applyIBManageSearch);
    document.getElementById("ibManageExportBtn").addEventListener("click", exportIBManageToExcel);
    document.getElementById("ibManageClearFiltersBtn").addEventListener("click", clearIBManageFilters);
    document.getElementById("ibManageFirstPage").addEventListener("click", () => setIBManagePage(1));
    document.getElementById("ibManagePrevPage").addEventListener("click", () => setIBManagePage(ibManageCurrentPage - 1));
    document.getElementById("ibManageNextPage").addEventListener("click", () => setIBManagePage(ibManageCurrentPage + 1));
    document.getElementById("ibManageLastPage").addEventListener("click", () => setIBManagePage(getIBManageTotalPages()));

    document.querySelectorAll("[data-ib-focus]").forEach(button => {
        button.addEventListener("click", () => applyIBManageQuickFocus(button.dataset.ibFocus));
    });

    IB_MANAGE_FILTERS.forEach(filter => {
        document.getElementById(filter.id).addEventListener("change", applyIBManageSearch);
    });

    document.querySelectorAll("[data-ib-page-size]").forEach(button => {
        button.addEventListener("click", () => {
            ibManagePageSize = Number(button.dataset.ibPageSize);
            ibManageCurrentPage = 1;
            updateIBManagePageSizeButtons();
            renderIBManageTable(ibManageFilteredData);
        });
    });

    document.querySelectorAll("[data-ib-manage-view]").forEach(button => {
        button.addEventListener("click", () => {
            setIBManageView(button.dataset.ibManageView);
        });
    });

    setIBManageView(ibManageActiveView);
    initIBManageAutoRefresh();

    MULTI_FILTERS.forEach(filter => {
        document.getElementById(filter.id).addEventListener("change", applyFilters);
    });
}

async function loadIBManageData(options = {}) {
    const forceRefresh = options.forceRefresh === true;
    const isAutoRefresh = options.autoRefresh === true;

    setIBManageLoading(
        true,
        isAutoRefresh
            ? "Auto refreshing main_data..."
            : forceRefresh ? "Refreshing main_data..." : "Loading main_data..."
    );

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
    updateIBManageDataStatus(source);
    scheduleIBManageAutoRefresh();
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
            ["📦", "Total IB", summary.qtaTotalIB.toLocaleString()],
            ["📋", "Total SKU Pending", summary.qtaTotalSkuPending.toLocaleString()],
            ["💵", "Pending AMT", "฿ " + formatNumber(summary.qtaPendingAmt)],
            ["📉", "% Missing >0.5%", summary.qtaMissingOverHalf.toLocaleString()],
            ["⏳", "Aging >42 Days", summary.qtaAgingOver42.toLocaleString()],
            ["📍", "Found at OB >=14D", summary.qtaFoundAtObOver14.toLocaleString()],
            ["🚨", "QTA High Attention", summary.qtaHighAttention.toLocaleString()],
            ["💯", "Missing 100% >=14D", summary.qtaMissing100Over14.toLocaleString()]
        ]
        : [
            ["📦", "Total IB", summary.totalIB.toLocaleString()],
            ["⚠", "SKU Pending", summary.pendingSKU.toLocaleString()],
            ["💰", "Pending Value", "฿ " + formatNumber(summary.pendingValue)],
            ["📍", "Found at OB", summary.obFound.toLocaleString()],
            ["🔎", "Not Found at OB", summary.obNotFound.toLocaleString()],
            ["🚨", "Urgent Dispatch", summary.urgentDispatch.toLocaleString()],
            ["🚚", "Dispatch Planned", summary.dispatchPlanned.toLocaleString()],
            ["⏱", "Avg Aging", summary.avgAging.toFixed(1)]
        ];

    [
        ["ibManageKpiIcon1", "ibManageKpiLabel1", "ibManageTotalIB"],
        ["ibManageKpiIcon2", "ibManageKpiLabel2", "ibManagePendingSKU"],
        ["ibManageKpiIcon3", "ibManageKpiLabel3", "ibManagePendingValue"],
        ["ibManageKpiIcon4", "ibManageKpiLabel4", "ibManageObFound"],
        ["ibManageKpiIcon5", "ibManageKpiLabel5", "ibManageUrgentDispatch"],
        ["ibManageKpiIcon6", "ibManageKpiLabel6", "ibManageAvgAging"],
        ["ibManageKpiIcon7", "ibManageKpiLabel7", "ibManageHighSdr"],
        ["ibManageKpiIcon8", "ibManageKpiLabel8", "ibManageQtaException"]
    ].forEach(([iconId, labelId, valueId], index) => {
        updateText(iconId, kpis[index][0]);
        updateText(labelId, kpis[index][1]);
        updateText(valueId, kpis[index][2]);
    });

    updateText("ibManageUpdatedAt", formatIBManageUpdatedAt(payload.updatedAt));
}

function renderIBManageTable(data) {
    const tableHead = document.getElementById("ibManageTableHead");
    const tableBody = document.getElementById("ibManageTableBody");
    const table = document.getElementById("ibManageTable");
    const columns = getIBManageTableColumns();

    if (!tableHead || !tableBody) return;

    if (table) {
        table.classList.toggle("manage-table-qta", ibManageActiveView === "qta");
        table.classList.toggle("manage-table-outbound", ibManageActiveView === "outbound");
    }

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    if (columns.length === 0) {
        updateText("ibManageResultInfo", "0 rows");
        return;
    }

    const headerRow = document.createElement("tr");
    const numberHeader = document.createElement("th");

    numberHeader.textContent = "No.";
    numberHeader.className = "col-no";
    headerRow.appendChild(numberHeader);

    columns.forEach(column => {
        const th = document.createElement("th");

        th.className = getIBManageColumnClass(column);
        th.classList.add("manage-sortable");
        th.innerHTML = `${escapeHtml(getIBManageColumnLabel(column))} <span class="manage-sort-icon">${getIBManageSortIcon(column)}</span>`;
        th.addEventListener("click", () => sortIBManageTable(column));
        headerRow.appendChild(th);
    });

    tableHead.appendChild(headerRow);

    const totalPages = getIBManageTotalPages(data);
    const safeCurrentPage = Math.min(Math.max(ibManageCurrentPage, 1), totalPages);
    const startIndex = (safeCurrentPage - 1) * ibManagePageSize;
    const pageData = data.slice(startIndex, startIndex + ibManagePageSize);

    ibManageCurrentPage = safeCurrentPage;

    pageData.forEach((item, rowIndex) => {

        const row = document.createElement("tr");
        const numberCell = document.createElement("td");

        numberCell.textContent = startIndex + rowIndex + 1;
        numberCell.className = "col-no";
        row.appendChild(numberCell);

        columns.forEach(column => {
            const cell = document.createElement("td");
            const formattedCell = formatIBManageCell(column, item[column]);
            const valueClass = getIBManageValueClass(column, item[column]);
            const zoneClass = column === "Zone_Delivery"
                ? getIBManageZoneClass(item[column])
                : "";

            cell.className = getIBManageColumnClass(column);
            if (valueClass) {
                cell.classList.add(valueClass);
            }
            if (zoneClass && ibManageActiveView !== "qta") {
                cell.classList.add("zone-highlight", zoneClass);
            }
            cell.innerHTML = formattedCell.html || escapeHtml(formattedCell.text);
            cell.title = item[column] ?? "";
            row.appendChild(cell);
        });

        row.classList.toggle("manage-row-urgent", isIBManageUrgent(item));
        row.classList.toggle("manage-row-found", normalizeText(item["OB_Status"]) === "found at ob");

        tableBody.appendChild(row);
    });

    updateText(
        "ibManageResultInfo",
        data.length > 0
            ? `Showing ${(startIndex + 1).toLocaleString()}-${Math.min(startIndex + ibManagePageSize, data.length).toLocaleString()} of ${data.length.toLocaleString()} rows`
            : "0 rows"
    );
    updateIBManagePagination(data);
}

function applyIBManageSearch() {
    const keyword = document
        .getElementById("ibManageSearchInput")
        .value
        .toLowerCase()
        .trim();
    const generateFrom = document.getElementById("ibManageGenerateFrom").value;
    const generateTo = document.getElementById("ibManageGenerateTo").value;
    const transitFrom = document.getElementById("ibManageTransitFrom").value;
    const transitTo = document.getElementById("ibManageTransitTo").value;

    ibManageFilteredData = ibManageData.filter(item => {
        const matchesKeyword = keyword === "" ||
            Object.values(item).some(value =>
                String(value ?? "").toLowerCase().includes(keyword)
            );

        const matchesFilters = IB_MANAGE_FILTERS.every(filter => {
            const selectedValues = getIBManageSelectedValues(filter.id);

            return selectedValues.length === 0 ||
                selectedValues.some(value => matchesIBManageFilterValue(filter, item[filter.column], value));
        });
        const matchesView = ibManageActiveView !== "qta" ||
            normalizeText(item["QTA Process Alert"]) !== "qta exception";
        const generateDate = formatDateOnly(item["Generate Date"]);
        const transitDate = formatDateOnly(item["Sent Transit Date"]);
        const matchesGenerateDate = ibManageActiveView !== "qta" || (
            (!generateFrom || generateDate >= generateFrom) &&
            (!generateTo || generateDate <= generateTo)
        );
        const matchesTransitDate = ibManageActiveView !== "qta" || (
            (!transitFrom || transitDate >= transitFrom) &&
            (!transitTo || transitDate <= transitTo)
        );
        const matchesChartFilters = matchesIBManageChartFilters(item);

        return matchesKeyword && matchesFilters && matchesView &&
            matchesGenerateDate && matchesTransitDate && matchesChartFilters;
    });

    sortIBManageFilteredData();
    ibManageCurrentPage = 1;
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

function sortIBManageTable(column) {
    if (ibManageSortColumn === column) {
        ibManageSortDirection = ibManageSortDirection === "asc" ? "desc" : "asc";
    } else {
        ibManageSortColumn = column;
        ibManageSortDirection = "asc";
    }

    sortIBManageFilteredData();
    ibManageCurrentPage = 1;
    renderIBManageTable(ibManageFilteredData);
}

function sortIBManageFilteredData() {
    if (!ibManageSortColumn) return;

    ibManageFilteredData.sort((a, b) => {
        const left = getIBManageSortValue(a[ibManageSortColumn], ibManageSortColumn);
        const right = getIBManageSortValue(b[ibManageSortColumn], ibManageSortColumn);

        if (left > right) return ibManageSortDirection === "asc" ? 1 : -1;
        if (left < right) return ibManageSortDirection === "asc" ? -1 : 1;
        return 0;
    });
}

function getIBManageSortValue(value, column) {
    if (column === "% SDR") {
        return getIBManageSdrPercent(value);
    }

    if (["Aging", "Total SKU", "SKU Pending", "SKU H", "% SDR", "Cost IB", "Pending AMT", "SDR AMT", "Total QTY", "Total QTY Sent Transit"].includes(column)) {
        return parseIBManageNumber(value);
    }

    if (["Generate Date", "Sent Transit Date", "OB_Scan_Date"].includes(column)) {
        const date = new Date(value);

        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }

    return String(value ?? "").toLowerCase();
}

function getIBManageSortIcon(column) {
    if (ibManageSortColumn !== column) return "↕";

    return ibManageSortDirection === "asc" ? "▲" : "▼";
}

function setIBManagePage(page) {
    ibManageCurrentPage = Math.min(Math.max(page, 1), getIBManageTotalPages());
    renderIBManageTable(ibManageFilteredData);
}

function getIBManageTotalPages(data = ibManageFilteredData) {
    return Math.max(Math.ceil(data.length / ibManagePageSize), 1);
}

function updateIBManagePagination(data) {
    const totalPages = getIBManageTotalPages(data);

    updateText("ibManagePageInfo", `Page ${ibManageCurrentPage.toLocaleString()} / ${totalPages.toLocaleString()}`);
    renderIBManagePageJump(totalPages);

    document.getElementById("ibManageFirstPage").disabled = ibManageCurrentPage <= 1;
    document.getElementById("ibManagePrevPage").disabled = ibManageCurrentPage <= 1;
    document.getElementById("ibManageNextPage").disabled = ibManageCurrentPage >= totalPages;
    document.getElementById("ibManageLastPage").disabled = ibManageCurrentPage >= totalPages;
}

function renderIBManagePageJump(totalPages) {
    const container = document.getElementById("ibManagePageJump");

    if (!container) return;

    container.innerHTML = "";

    getSmartPageRange(ibManageCurrentPage, totalPages).forEach(page => {
        if (page === "...") {
            const ellipsis = document.createElement("span");

            ellipsis.className = "page-ellipsis";
            ellipsis.textContent = "...";
            container.appendChild(ellipsis);
            return;
        }

        const button = document.createElement("button");

        button.type = "button";
        button.textContent = page.toLocaleString();
        button.className = page === ibManageCurrentPage ? "active" : "";
        button.setAttribute("aria-label", `Go to page ${page}`);
        button.addEventListener("click", () => setIBManagePage(page));
        container.appendChild(button);
    });
}

function updateIBManagePageSizeButtons() {
    document.querySelectorAll("[data-ib-page-size]").forEach(button => {
        button.classList.toggle("active", Number(button.dataset.ibPageSize) === ibManagePageSize);
    });
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
        if (!select) return;

        const currentValues = getIBManageSelectedValues(filter.id);
        const options = getIBManageFilterOptions(filter);

        select.setAttribute("multiple", "multiple");
        select.innerHTML = "";

        options.forEach(optionData => {
            const option = document.createElement("option");

            option.value = optionData.value;
            option.textContent = optionData.label;
            select.appendChild(option);
        });

        currentValues.forEach(value => {
            if (options.some(option => option.value === value)) {
                const option = Array.from(select.options).find(item => item.value === value);

                if (option) option.selected = true;
            }
        });

        setupIBManageMultiFilter(filter);
    });
}

function getIBManageFilterOptions(filter) {
    if (filter.range === "aging7") {
        return getIBManageAgingRangeOptions(filter.column);
    }

    if (filter.range === "missingPercent") {
        return getIBManageMissingRangeOptions(filter.column);
    }

    return [...new Set(
        ibManageData
            .map(item => item[filter.column])
            .filter(value => value !== undefined && value !== null && String(value).trim() !== "")
            .map(value => String(value))
    )]
        .sort((a, b) => a.localeCompare(b))
        .map(value => ({
            value,
            label: value
        }));
}

function getIBManageAgingRangeOptions(column) {
    const ranges = new Map();

    ibManageData.forEach(item => {
        const value = parseIBManageNumber(item[column]);

        if (Number.isNaN(value)) return;

        const start = Math.floor(Math.max(value, 0) / 7) * 7;
        const end = start + 6;
        const key = `aging:${start}:${end}`;

        ranges.set(key, {
            value: key,
            label: `${start}-${end} days`,
            start,
            end
        });
    });

    return Array.from(ranges.values()).sort((a, b) => a.start - b.start);
}

function getIBManageMissingRangeOptions(column) {
    const ranges = new Map();

    ibManageData.forEach(item => {
        const range = getIBManageMissingRange(item[column]);

        if (range) {
            ranges.set(range.value, range);
        }
    });

    return Array.from(ranges.values()).sort((a, b) => a.order - b.order);
}

function getIBManageMissingRange(value) {
    const percent = getIBManageSdrPercent(value);

    if (Number.isNaN(percent)) return null;

    if (percent <= 0.5) {
        return {
            value: "missing:0:0.5",
            label: "<=0.5%",
            order: 0
        };
    }

    if (percent <= 1) {
        return {
            value: "missing:0.5:1",
            label: ">0.5-1%",
            order: 1
        };
    }

    if (percent <= 5) {
        return {
            value: "missing:1:5",
            label: ">1-5%",
            order: 2
        };
    }

    if (percent <= 10) {
        return {
            value: "missing:5:10",
            label: ">5-10%",
            order: 3
        };
    }

    const start = Math.floor((percent - 0.0001) / 10) * 10;
    const end = start + 10;

    return {
        value: `missing:${start}:${end}`,
        label: `>${start}-${end}%`,
        order: 3 + Math.floor(start / 10)
    };
}

function matchesIBManageFilterValue(filter, rawValue, selectedValue) {
    if (filter.range === "aging7") {
        const value = parseIBManageNumber(rawValue);
        const [, startText, endText] = selectedValue.split(":");
        const start = Number(startText);
        const end = Number(endText);

        return !Number.isNaN(value) &&
            !Number.isNaN(start) &&
            !Number.isNaN(end) &&
            value >= start &&
            value <= end;
    }

    if (filter.range === "missingPercent") {
        return getIBManageMissingRange(rawValue)?.value === selectedValue;
    }

    return selectedValue === String(rawValue ?? "");
}

function clearIBManageFilters() {
    document.getElementById("ibManageSearchInput").value = "";
    setIBManageDateFilters({});
    ibManageChartFilters = {};

    IB_MANAGE_FILTERS.forEach(filter => {
        clearIBManageFilterSelection(filter.id, false);
    });

    setIBManageQuickFocusActive("");
    ibManageSortColumn = "";
    ibManageSortDirection = "asc";
    ibManageCurrentPage = 1;
    applyIBManageSearch();
}

function setupIBManageMultiFilter(filter) {
    const select = document.getElementById(filter.id);

    if (!select) return;

    if (ibManageFilterInstances[filter.id]) {
        ibManageFilterInstances[filter.id].sync();
        return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "manage-multi-filter";
    wrapper.dataset.filterId = filter.id;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "manage-multi-button";
    button.innerHTML = `
        <span class="manage-multi-label"></span>
        <span class="manage-multi-count" hidden></span>
        <span class="manage-multi-chevron">▼</span>
    `;

    const panel = document.createElement("div");
    panel.className = "manage-multi-panel";
    panel.innerHTML = `
        <input class="manage-multi-search" type="text" placeholder="Search ${escapeHtml(getIBManageFilterLabel(filter.id))}">
        <div class="manage-multi-actions">
            <button type="button" data-action="all">Select all</button>
            <button type="button" data-action="clear">Clear</button>
        </div>
        <div class="manage-multi-options"></div>
    `;

    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    wrapper.appendChild(button);
    wrapper.appendChild(panel);

    const search = panel.querySelector(".manage-multi-search");
    const optionsEl = panel.querySelector(".manage-multi-options");
    const labelEl = button.querySelector(".manage-multi-label");
    const countEl = button.querySelector(".manage-multi-count");

    function renderOptions() {
        const keyword = search.value.toLowerCase().trim();
        const options = Array.from(select.options)
            .filter(option => option.textContent.toLowerCase().includes(keyword));

        optionsEl.innerHTML = options.length === 0
            ? `<div class="manage-multi-empty">No results</div>`
            : options.map(option => `
                <label class="manage-multi-option">
                    <input type="checkbox" value="${escapeHtml(option.value)}" ${option.selected ? "checked" : ""}>
                    <span>${escapeHtml(option.textContent)}</span>
                </label>
            `).join("");
    }

    function syncLabel() {
        const selected = Array.from(select.selectedOptions);
        const label = getIBManageFilterLabel(filter.id);

        if (selected.length === 0) {
            labelEl.textContent = `All ${label}`;
            countEl.hidden = true;
            countEl.textContent = "";
            return;
        }

        labelEl.textContent = selected.length === 1
            ? selected[0].textContent
            : `${selected.length} selected`;
        countEl.hidden = false;
        countEl.textContent = selected.length;
    }

    function sync() {
        syncLabel();
        renderOptions();
    }

    function setSelected(value, checked) {
        const option = Array.from(select.options).find(item => item.value === value);

        if (option) {
            option.selected = checked;
            select.dispatchEvent(new Event("change", { bubbles: true }));
        }

        sync();
    }

    button.addEventListener("click", event => {
        event.stopPropagation();
        closeIBManageMultiFilters(wrapper);
        wrapper.classList.toggle("open");
        search.focus();
    });

    search.addEventListener("input", renderOptions);

    optionsEl.addEventListener("change", event => {
        if (event.target.matches("input[type='checkbox']")) {
            setSelected(event.target.value, event.target.checked);
        }
    });

    panel.addEventListener("click", event => {
        event.stopPropagation();

        const action = event.target.dataset.action;
        const options = Array.from(select.options);

        if (action === "all") {
            options.forEach(option => {
                option.selected = true;
            });
            search.value = "";
            select.dispatchEvent(new Event("change", { bubbles: true }));
            sync();
        }

        if (action === "clear") {
            clearIBManageFilterSelection(filter.id, false);
            sync();
            select.dispatchEvent(new Event("change", { bubbles: true }));
        }
    });

    select.addEventListener("change", sync);
    document.addEventListener("click", () => closeIBManageMultiFilters());

    ibManageFilterInstances[filter.id] = {
        sync,
        clear() {
            search.value = "";
            Array.from(select.options).forEach(option => {
                option.selected = false;
            });
            sync();
        }
    };

    sync();
}

function getIBManageSelectedValues(filterId) {
    const select = document.getElementById(filterId);

    if (!select) return [];

    return Array.from(select.selectedOptions)
        .map(option => option.value)
        .filter(Boolean);
}

function clearIBManageFilterSelection(filterId, shouldSync = true) {
    const select = document.getElementById(filterId);

    if (!select) return;

    Array.from(select.options).forEach(option => {
        option.selected = false;
    });

    if (ibManageFilterInstances[filterId]) {
        ibManageFilterInstances[filterId].clear();
    }

    if (shouldSync) {
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }
}

function setIBManageFilterSelection(filterId, values, shouldSync = true) {
    const select = document.getElementById(filterId);
    const selectedValues = new Set(values);

    if (!select) return;

    Array.from(select.options).forEach(option => {
        option.selected = selectedValues.has(option.value);
    });

    if (ibManageFilterInstances[filterId]) {
        ibManageFilterInstances[filterId].sync();
    }

    if (shouldSync) {
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }
}

function closeIBManageMultiFilters(activeFilter = null) {
    document.querySelectorAll(".manage-multi-filter.open").forEach(filter => {
        if (!activeFilter || filter !== activeFilter) {
            filter.classList.remove("open");
        }
    });
}

function getIBManageFilterLabel(filterId) {
    const select = document.getElementById(filterId);
    const label = select?.closest("label");

    if (!label) return "Filter";

    return Array.from(label.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .find(Boolean) || "Filter";
}

function setIBManageView(viewName) {
    if (!["qta", "outbound"].includes(viewName)) return;

    saveIBManageViewState(ibManageActiveView);
    ibManageActiveView = viewName;
    restoreIBManageViewState(viewName);

    const managePage = document.getElementById("ibManagePage");

    if (managePage) {
        managePage.dataset.activeManageView = viewName;
        managePage.classList.toggle("ib-manage-view-qta", viewName === "qta");
        managePage.classList.toggle("ib-manage-view-outbound", viewName === "outbound");
    }

    document.querySelectorAll("[data-ib-manage-view]").forEach(button => {
        button.classList.toggle("active", button.dataset.ibManageView === viewName);
    });

    document.querySelectorAll("[data-ib-manage-filter]").forEach(filter => {
        const isVisible = filter.dataset.ibManageFilter.split(" ").includes(viewName);

        filter.classList.toggle("hidden", !isVisible);

    });

    document.querySelectorAll("[data-ib-manage-panel]").forEach(panel => {
        panel.classList.toggle("hidden", panel.dataset.ibManagePanel !== viewName);
    });

    updateText(
        "ibManageSidePanelTitle",
        viewName === "qta" ? "Aging (days)" : "Action Queue"
    );

    const searchInput = document.getElementById("ibManageSearchInput");

    searchInput.placeholder = viewName === "qta"
        ? "Search IB, Store, QTA, Remark..."
        : "Search IB, Store, OB, Transport, Zone...";

    applyIBManageSearch();
}

function createIBManageViewState() {
    return {
        keyword: "",
        dates: {},
        filters: {},
        currentPage: 1,
        pageSize: 100,
        sortColumn: "",
        sortDirection: "asc",
        quickFocus: "",
        chartFilters: {}
    };
}

function saveIBManageViewState(viewName) {
    const state = ibManageViewStates[viewName];

    if (!state) return;

    const searchInput = document.getElementById("ibManageSearchInput");

    state.keyword = searchInput?.value || "";
    state.dates = getIBManageDateFilters();
    state.filters = Object.fromEntries(
        IB_MANAGE_FILTERS.map(filter => [
            filter.id,
            getIBManageSelectedValues(filter.id)
        ])
    );
    state.currentPage = ibManageCurrentPage;
    state.pageSize = ibManagePageSize;
    state.sortColumn = ibManageSortColumn;
    state.sortDirection = ibManageSortDirection;
    state.quickFocus = ibManageActiveQuickFocus;
    state.chartFilters = { ...ibManageChartFilters };
}

function restoreIBManageViewState(viewName) {
    const state = ibManageViewStates[viewName] || createIBManageViewState();
    const searchInput = document.getElementById("ibManageSearchInput");

    if (searchInput) {
        searchInput.value = state.keyword;
    }

    setIBManageDateFilters(state.dates);

    IB_MANAGE_FILTERS.forEach(filter => {
        setIBManageFilterSelection(filter.id, state.filters[filter.id] || [], false);
    });

    ibManageCurrentPage = state.currentPage;
    ibManagePageSize = state.pageSize;
    ibManageSortColumn = state.sortColumn;
    ibManageSortDirection = state.sortDirection;
    ibManageChartFilters = { ...(state.chartFilters || {}) };
    setIBManageQuickFocusActive(state.quickFocus);
    updateIBManagePageSizeButtons();
}

function getIBManageDateFilters() {
    return {
        generateFrom: document.getElementById("ibManageGenerateFrom")?.value || "",
        generateTo: document.getElementById("ibManageGenerateTo")?.value || "",
        transitFrom: document.getElementById("ibManageTransitFrom")?.value || "",
        transitTo: document.getElementById("ibManageTransitTo")?.value || ""
    };
}

function setIBManageDateFilters(dates = {}) {
    const fields = {
        ibManageGenerateFrom: dates.generateFrom || "",
        ibManageGenerateTo: dates.generateTo || "",
        ibManageTransitFrom: dates.transitFrom || "",
        ibManageTransitTo: dates.transitTo || ""
    };

    Object.entries(fields).forEach(([id, value]) => {
        const input = document.getElementById(id);

        if (input) input.value = value;
    });
}

function summarizeIBManageData(data) {
    const qtaKpiData = data.filter(isIBManageQtaKpiTypeIncluded);
    const totalIB = countDistinctIBManage(data, "IB No.");
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
    const highSdr = data.filter(item => getIBManageSdrPercent(item["% SDR"]) >= 80).length;
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
    const qtaTotalIB = countDistinctIBManage(qtaKpiData, "IB No.");
    const qtaTotalSkuPending = sumIBManage(qtaKpiData, "SKU Pending");
    const qtaPendingAmt = sumIBManage(qtaKpiData, "Pending AMT");
    const qtaMissingOverHalf = countDistinctIBManageWhere(qtaKpiData, item =>
        getIBManageSdrPercent(item["% SDR"]) > 0.5
    );
    const qtaAgingOver42 = countDistinctIBManageWhere(qtaKpiData, item =>
        parseIBManageNumber(item["Aging"]) > 42
    );
    const qtaFoundAtObOver14 = countDistinctIBManageWhere(qtaKpiData, item =>
        normalizeText(item["OB_Status"]) === "found at ob" &&
        parseIBManageNumber(item["Aging"]) >= 14
    );
    const qtaHighAttention = countDistinctIBManageWhere(qtaKpiData, item =>
        normalizeText(item["QTA Process Alert"]) === "qta high attention"
    );
    const qtaMissing100Over14 = countDistinctIBManageWhere(qtaKpiData, item =>
        getIBManageSdrPercent(item["% SDR"]) >= 100 &&
        parseIBManageNumber(item["Aging"]) >= 14
    );
    const qtaSentTransitAlert = countDistinctIBManageWhere(qtaKpiData, item =>
        normalizeText(item["Transit Alert"]) === "sent transit alert"
    );

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
        processSettlement,
        qtaTotalIB,
        qtaTotalSkuPending,
        qtaPendingAmt,
        qtaMissingOverHalf,
        qtaAgingOver42,
        qtaFoundAtObOver14,
        qtaHighAttention,
        qtaMissing100Over14,
        qtaSentTransitAlert
    };
}

function countDistinctIBManage(data, column) {
    const values = data
        .map(item => String(item[column] ?? "").trim())
        .filter(Boolean);

    return new Set(values).size;
}

function countDistinctIBManageWhere(data, predicate) {
    return countDistinctIBManage(data.filter(predicate), "IB No.");
}

function isIBManageQtaKpiTypeIncluded(item) {
    return !IB_MANAGE_QTA_KPI_EXCLUDED_TYPES.has(normalizeText(item["Type"]));
}

function renderIBManageMonitors(data) {
    renderIBManageQuickFocus(data);
    renderIBManageBars("ibManageWhSplit", countByIBManage(data, "SUB WH"), data.length, 5, "", "subWh");
    renderIBManageBars(
        "ibManageRiskSplit",
        groupByIBManageSortedByAging(data, "QTA Process Alert"),
        data.length,
        6,
        "IB",
        "qtaProcess"
    );
    renderIBManageBars("ibManageTypeSplit", countByIBManage(data, "Type"), data.length, 6, "IB", "type");
    renderIBManageBars("ibManageObStatusSplit", countByIBManage(data, "OB_Status"), data.length, 6, "IB", "obStatus");
    renderIBManageBars("ibManageZoneSplit", countByIBManage(data, "Zone_Delivery"), data.length, 6, "", "zone");
    renderIBManageAgingChart(data);
    renderIBManageActionQueue(data);
}

function renderIBManageQuickFocus(data) {
    const summary = summarizeIBManageData(data);
    const missing100 = countDistinctIBManageWhere(data, item =>
        getIBManageSdrPercent(item["% SDR"]) >= 100
    );

    updateText("ibFocusAging43", summary.highAging.toLocaleString());
    updateText("ibFocusMissing100", missing100.toLocaleString());
    updateText("ibFocusQtaHigh", summary.qtaHighAttention.toLocaleString());
    updateText("ibFocusFoundOb14", summary.qtaFoundAtObOver14.toLocaleString());
    updateText("ibFocusSentTransitAlert", summary.qtaSentTransitAlert.toLocaleString());
}

function applyIBManageQuickFocus(focusName) {
    if (isIBManageQuickFocusApplied(focusName)) {
        clearIBManageFilters();
        return;
    }

    const agingValues = getIBManageAgingRangeValues(focusName === "foundOb14" ? 14 : 43);

    IB_MANAGE_FILTERS.forEach(filter => {
        clearIBManageFilterSelection(filter.id, false);
    });
    ibManageChartFilters = {};

    if (focusName === "aging43") {
        setIBManageFilterSelection("ibManageAgingFilter", agingValues, false);
    }

    if (focusName === "missing100") {
        setIBManageFilterSelection("ibManageMissingFilter", ["missing:90:100"], false);
    }

    if (focusName === "qtaHigh") {
        setIBManageFilterSelection("ibManageQtaFilter", ["QTA High Attention"], false);
    }

    if (focusName === "foundOb14") {
        setIBManageFilterSelection("ibManageAgingFilter", agingValues, false);
        setIBManageFilterSelection("ibManageObStatusFilter", ["Found at OB"], false);
    }

    if (focusName === "sentTransitAlert") {
        ibManageChartFilters.transitAlert = "Sent Transit Alert";
    }

    setIBManageQuickFocusActive(focusName);
    ibManageCurrentPage = 1;
    applyIBManageSearch();
}

function isIBManageQuickFocusApplied(focusName) {
    if (focusName === "sentTransitAlert") {
        return ibManageChartFilters.transitAlert === "Sent Transit Alert" &&
            IB_MANAGE_FILTERS.every(filter => getIBManageSelectedValues(filter.id).length === 0);
    }

    const expected = getIBManageQuickFocusSelections(focusName);

    return IB_MANAGE_FILTERS.every(filter => {
        const selectedValues = getIBManageSelectedValues(filter.id);
        const expectedValues = expected[filter.id] || [];

        return areIBManageValueSetsEqual(selectedValues, expectedValues);
    });
}

function getIBManageQuickFocusSelections(focusName) {
    const aging43Values = getIBManageAgingRangeValues(43);
    const aging14Values = getIBManageAgingRangeValues(14);

    if (focusName === "aging43") {
        return {
            ibManageAgingFilter: aging43Values
        };
    }

    if (focusName === "missing100") {
        return {
            ibManageMissingFilter: ["missing:90:100"]
        };
    }

    if (focusName === "qtaHigh") {
        return {
            ibManageQtaFilter: ["QTA High Attention"]
        };
    }

    if (focusName === "foundOb14") {
        return {
            ibManageAgingFilter: aging14Values,
            ibManageObStatusFilter: ["Found at OB"]
        };
    }

    return {};
}

function areIBManageValueSetsEqual(leftValues, rightValues) {
    if (leftValues.length !== rightValues.length) return false;

    const rightSet = new Set(rightValues);

    return leftValues.every(value => rightSet.has(value));
}

function setIBManageQuickFocusActive(focusName) {
    ibManageActiveQuickFocus = focusName || "";

    document.querySelectorAll("[data-ib-focus]").forEach(button => {
        button.classList.toggle("active", button.dataset.ibFocus === ibManageActiveQuickFocus);
    });
}

function getIBManageAgingRangeValues(minAging) {
    const select = document.getElementById("ibManageAgingFilter");

    if (!select) return [];

    return Array.from(select.options)
        .filter(option => {
            const [, startText, endText] = option.value.split(":");
            const start = Number(startText);
            const end = Number(endText);

            return !Number.isNaN(start) &&
                !Number.isNaN(end) &&
                end >= minAging;
        })
        .map(option => option.value);
}

function renderIBManageBars(containerId, counts, total, limit = 5, unit = "", filterKey = "") {
    const container = document.getElementById(containerId);

    if (!container) return;

    const items = Array.isArray(counts)
        ? counts.slice(0, limit)
        : Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([label, count]) => ({
                label,
                count
            }));

    if (items.length === 0) {
        container.innerHTML = `<div class="manage-empty-line">No data</div>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const label = item.label;
        const count = item.count;
        const percent = total === 0 ? 0 : (count / total) * 100;
        const meta = item.meta
            ? `<small class="manage-mini-bar-meta">${escapeHtml(item.meta)}</small>`
            : "";

        return `
            <div class="manage-mini-bar ${filterKey && ibManageChartFilters[filterKey] === label ? "active" : ""}"
                 ${filterKey ? `data-manage-chart-filter="${escapeHtml(filterKey)}" data-filter-value="${escapeHtml(label)}" role="button" tabindex="0"` : ""}>
                <div class="manage-mini-bar-top">
                    <span>${escapeHtml(label || "(blank)")}${meta}</span>
                    <strong>${count.toLocaleString()}${unit ? ` ${escapeHtml(unit)}` : ""}</strong>
                </div>
                <div class="manage-mini-bar-track">
                    <div style="width:${Math.max(percent, 2).toFixed(1)}%"></div>
                </div>
            </div>
        `;
    }).join("");

    if (filterKey) {
        container.querySelectorAll("[data-manage-chart-filter]").forEach(item => {
            const activate = () => toggleIBManageChartFilter(
                item.dataset.manageChartFilter,
                item.dataset.filterValue
            );

            item.addEventListener("click", activate);
            item.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activate();
                }
            });
        });
    }
}

function toggleIBManageChartFilter(filterKey, value) {
    ibManageChartFilters[filterKey] = ibManageChartFilters[filterKey] === value ? "" : value;

    if (!ibManageChartFilters[filterKey]) {
        delete ibManageChartFilters[filterKey];
    }

    ibManageCurrentPage = 1;
    applyIBManageSearch();
}

function matchesIBManageChartFilters(item) {
    const columnMap = {
        subWh: "SUB WH",
        qtaProcess: "QTA Process Alert",
        type: "Type",
        obStatus: "OB_Status",
        zone: "Zone_Delivery",
        transitAlert: "Transit Alert"
    };

    return Object.entries(ibManageChartFilters).every(([filterKey, selectedValue]) => {
        if (filterKey === "aging") {
            return matchesIBManageAgingChartValue(item["Aging"], selectedValue);
        }

        const column = columnMap[filterKey];

        return !selectedValue || !column ||
            String(item[column] ?? "").trim() === selectedValue;
    });
}

function matchesIBManageAgingChartValue(rawValue, range) {
    const aging = parseIBManageNumber(rawValue);

    if (!range) return true;
    if (range === "0-21") return aging >= 0 && aging <= 21;
    if (range === "22-42") return aging >= 22 && aging <= 42;
    if (range === "43+") return aging >= 43;
    if (range === "57+") return aging >= 57;

    const [startText, endText] = range.split("-");
    const start = Number(startText);
    const end = Number(endText);

    return !Number.isNaN(start) && !Number.isNaN(end) && aging >= start && aging <= end;
}

function groupByIBManageSortedByAging(data, column) {
    const groups = data.reduce((result, item) => {
        const label = String(item[column] ?? "(blank)").trim() || "(blank)";
        const aging = parseIBManageNumber(item["Aging"]);

        if (!result[label]) {
            result[label] = {
                label,
                count: 0,
                totalAging: 0
            };
        }

        result[label].count += 1;
        result[label].totalAging += aging;

        return result;
    }, {});

    return Object.values(groups)
        .map(item => ({
            label: item.label,
            count: item.count,
            avgAging: item.count === 0 ? 0 : item.totalAging / item.count
        }))
        .sort((left, right) => left.avgAging - right.avgAging || right.count - left.count)
        .map(item => ({
            label: item.label,
            count: item.count,
            meta: `${item.avgAging.toFixed(1)}d`
        }));
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

function renderIBManageAgingChart(data) {
    const canvas = document.getElementById("ibManageAgingChart");
    const legend = document.getElementById("ibManageAgingLegend");

    if (!canvas || typeof Chart === "undefined") return;

    if (ibManageAgingChart) {
        ibManageAgingChart.destroy();
        ibManageAgingChart = null;
    }

    const ranges = [
        "0-7",
        "8-14",
        "15-21",
        "22-28",
        "29-35",
        "36-42",
        "43-49",
        "50-56",
        "57+"
    ];
    const count = Object.fromEntries(ranges.map(range => [range, 0]));

    data.forEach(item => {
        const aging = parseIBManageNumber(item["Aging"]);

        if (aging <= 7) count["0-7"]++;
        else if (aging <= 14) count["8-14"]++;
        else if (aging <= 21) count["15-21"]++;
        else if (aging <= 28) count["22-28"]++;
        else if (aging <= 35) count["29-35"]++;
        else if (aging <= 42) count["36-42"]++;
        else if (aging <= 49) count["43-49"]++;
        else if (aging <= 56) count["50-56"]++;
        else count["57+"]++;
    });

    const values = ranges.map(range => count[range]);
    const theme = typeof getChartTheme === "function"
        ? getChartTheme()
        : {
            text: "#444",
            tick: "#666",
            grid: "#E5E7EB",
            tooltip: "#2B2B2B"
        };

    ibManageAgingChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: ranges,
            datasets: [{
                data: values,
                barPercentage: 0.85,
                categoryPercentage: 0.90,
                borderRadius: 8,
                borderSkipped: false,
                backgroundColor: [
                    "#D1D5DB",
                    "#A7F3C0",
                    "#16A34A",
                    "#FDE68A",
                    "#FFD400",
                    "#FBD38D",
                    "#EA580C",
                    "#FCA5A5",
                    "#DC2626"
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (elements.length === 0) return;

                toggleIBManageAgingRangeFilter(ranges[elements[0].index]);
            },
            layout: {
                padding: {
                    top: 18,
                    right: 8,
                    bottom: 18,
                    left: 8
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: theme.tooltip,
                    callbacks: {
                        label(context) {
                            return context.raw.toLocaleString() + " IB";
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: theme.grid
                    },
                    ticks: {
                        color: theme.tick,
                        callback(value) {
                            return value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: theme.tick
                    }
                }
            },
            animation: {
                duration: 900,
                easing: "easeOutQuart"
            }
        },
        plugins: [{
            id: "ibManageAgingValueLabel",
            afterDatasetsDraw(chart) {
                const { ctx } = chart;

                ctx.save();
                ctx.font = "bold 12px Poppins";
                ctx.fillStyle = theme.text;
                ctx.textAlign = "center";

                chart.getDatasetMeta(0).data.forEach((bar, index) => {
                    ctx.fillText(values[index].toLocaleString(), bar.x, bar.y - 8);
                });

                ctx.restore();
            }
        }]
    });

    if (legend) {
        renderIBManageAgingLegend(legend, count);
    }
}

function renderIBManageAgingLegend(legend, count) {
    const normal = count["0-7"] + count["8-14"] + count["15-21"];
    const follow = count["22-28"] + count["29-35"] + count["36-42"];
    const urgent = count["43-49"] + count["50-56"] + count["57+"];

    legend.innerHTML = `
        <div class="legend-item chart-filter-option ${ibManageChartFilters.aging === "0-21" ? "active" : ""}"
             data-manage-aging-filter="0-21" role="button" tabindex="0">
            <div class="legend-left">
                <span class="legend-color" style="background:#22C55E"></span>
                <span class="legend-label">Normal (0-21)</span>
            </div>
            <span class="legend-value">${normal.toLocaleString()}</span>
        </div>

        <div class="legend-item chart-filter-option ${ibManageChartFilters.aging === "22-42" ? "active" : ""}"
             data-manage-aging-filter="22-42" role="button" tabindex="0">
            <div class="legend-left">
                <span class="legend-color" style="background:#FFD400"></span>
                <span class="legend-label">Need Follow (22-42)</span>
            </div>
            <span class="legend-value">${follow.toLocaleString()}</span>
        </div>

        <div class="legend-item chart-filter-option ${ibManageChartFilters.aging === "43+" ? "active" : ""}"
             data-manage-aging-filter="43+" role="button" tabindex="0">
            <div class="legend-left">
                <span class="legend-color" style="background:#DC2626"></span>
                <span class="legend-label">Urgent (43+)</span>
            </div>
            <span class="legend-value">${urgent.toLocaleString()}</span>
        </div>
    `;

    legend.querySelectorAll("[data-manage-aging-filter]").forEach(item => {
        const activate = () => toggleIBManageAgingRangeFilter(item.dataset.manageAgingFilter);

        item.addEventListener("click", activate);
        item.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
            }
        });
    });
}

function toggleIBManageAgingRangeFilter(range) {
    toggleIBManageChartFilter("aging", range);
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
    if (value === null || value === undefined) {
        return {
            text: ""
        };
    }

    if (["Cost IB", "Pending AMT", "SDR AMT"].includes(column)) {
        return {
            text: "฿ " + Math.round(parseIBManageNumber(value)).toLocaleString()
        };
    }

    if (ibManageActiveView === "qta" && column === "Type") {
        return {
            text: value,
            html: getIBManageTypeBadge(value)
        };
    }

    if (ibManageActiveView === "qta" && column === "Aging") {
        return {
            text: value,
            html: getIBManageAgingBadge(value)
        };
    }

    if (ibManageActiveView === "qta" && column === "% SDR") {
        return {
            text: formatIBManageSdrPercent(value),
            html: getIBManageSdrBadge(value)
        };
    }

    if (["Total SKU", "Store Receive", "SKU Pending", "SKU H", "Total QTY", "Total QTY Sent Transit", "Aging"].includes(column)) {
        return {
            text: parseIBManageNumber(value).toLocaleString()
        };
    }

    if (column === "% SDR") {
        return {
            text: formatIBManageSdrPercent(value)
        };
    }

    if (["QTA Process Alert", "OB_Status", "OB_DC", "Zone_Delivery", "Type"].includes(column)) {
        const tone = getIBManageBadgeTone(column, value);
        const zoneClass = column === "Zone_Delivery" ? getIBManageZoneClass(value) : "";
        const badgeClass = ["manage-cell-badge", tone, zoneClass]
            .filter(Boolean)
            .join(" ");

        return {
            text: value,
            html: `<span class="${badgeClass}">${escapeHtml(value)}</span>`
        };
    }

    return {
        text: value
    };
}

function getIBManageColumnClass(column) {
    const classMap = {
        "No.": "col-no",
        "IB No.": "col-ib",
        "Store": "col-store",
        "Store name": "col-store-name",
        "Type": "col-type",
        "Generate Date": "col-date",
        "Sent Transit Date": "col-date",
        "Aging": "col-aging",
        "Total SKU": "col-number col-total-sku",
        "SKU Pending": "col-number col-sku-pending",
        "SKU H": "col-number",
        "% SDR": "col-percent",
        "Cost IB": "col-money",
        "Pending AMT": "col-money",
        "SDR AMT": "col-money",
        "QTA Process Alert": "col-qta",
        "Remark": "col-remark",
        "OB_Status": "col-ob-status",
        "OB_DC": "col-ob-dc",
        "Zone_Delivery": "col-zone"
    };

    return classMap[column] || "col-default";
}

function getIBManageColumnLabel(column) {
    const labelMap = {
        "Store name": "Name",
        "Sent Transit Date": "Transit Date",
        "% SDR": "% Missing",
        "QTA Process Alert": "QTA Process",
        "OB_Status": "OB Pending",
        "OB_DC": "OB DC",
        "Zone_Delivery": "Zone Delivery"
    };

    return labelMap[column] || column;
}

function getIBManageTypeBadge(type) {
    const typeMap = {
        "e-com ib": "type-ecom",
        "extra ib": "type-extra",
        "last stock ib": "type-last",
        "new store ib": "type-new",
        "normal ib": "type-normal",
        "special ib": "type-special"
    };
    const typeClass = typeMap[normalizeText(type)] || "";

    return `<span class="type-badge ${typeClass}">${escapeHtml(type)}</span>`;
}

function getIBManageAgingBadge(aging) {
    const agingValue = parseIBManageNumber(aging);
    let agingClass = "";

    if (agingValue <= 7) {
        agingClass = "aging-range-0-7";
    } else if (agingValue <= 14) {
        agingClass = "aging-range-8-14";
    } else if (agingValue <= 21) {
        agingClass = "aging-range-15-21";
    } else if (agingValue <= 28) {
        agingClass = "aging-range-22-28";
    } else if (agingValue <= 35) {
        agingClass = "aging-range-29-35";
    } else if (agingValue <= 42) {
        agingClass = "aging-range-36-42";
    } else if (agingValue <= 49) {
        agingClass = "aging-range-43-49";
    } else if (agingValue <= 56) {
        agingClass = "aging-range-50-56";
    } else {
        agingClass = "aging-range-57-plus";
    }

    return `<span class="aging-badge ${agingClass}">${agingValue.toLocaleString()}</span>`;
}

function formatIBManageSdrPercent(value) {
    const percent = getIBManageSdrPercent(value);
    const roundedPercent = Math.round(percent * 10) / 10;

    return roundedPercent === 100 ? "100%" : `${roundedPercent.toFixed(1)}%`;
}

function getIBManageSdrBadge(value) {
    const percent = getIBManageSdrPercent(value);
    const sdrClass = getIBManageSdrToneClass(percent);

    return `<span class="aging-badge sdr-badge ${sdrClass}">${formatIBManageSdrPercent(value)}</span>`;
}

function getIBManageSdrToneClass(percent) {
    if (percent >= 100) return "sdr-critical";
    if (percent > 10) return "sdr-red";
    if (percent > 5) return "sdr-orange";
    if (percent >= 1) return "sdr-yellow";
    if (percent > 0.6) return "sdr-blue";

    return "sdr-green";
}

function getIBManageBadgeTone(column, value) {
    const text = normalizeText(value);

    if (column === "OB_Status") {
        return text.includes("found") && !text.includes("not found") ? "success" : "warning";
    }

    if (column === "QTA Process Alert") {
        if (text.includes("high")) return "danger";
        if (text.includes("recheck") || text.includes("check")) return "warning";
        if (text.includes("settlement")) return "success";
        return "neutral";
    }

    if (column === "Type") {
        if (text.includes("special")) return "danger";
        if (text.includes("new store")) return "success";
        return "neutral";
    }

    if (column === "OB_DC") {
        return text === "-" || text === "" ? "muted" : "success";
    }

    if (column === "Zone_Delivery") {
        return text.includes("exception") ? "danger" : "neutral";
    }

    return "neutral";
}

function getIBManageValueClass(column, value) {
    if (ibManageActiveView === "qta" && ["Aging", "% SDR"].includes(column)) {
        return "";
    }

    if (column === "Aging" && parseIBManageNumber(value) >= 42) {
        return "value-aging-alert";
    }

    if (column === "% SDR") {
        const sdr = getIBManageSdrPercent(value);

        if (sdr >= 100) return "value-sdr-critical";
        if (sdr > 10) return "value-sdr-red";
        if (sdr > 5) return "value-sdr-orange";
        if (sdr >= 1) return "value-sdr-yellow";
        if (sdr > 0.6) return "value-sdr-blue";
        return "value-sdr-green";
    }

    return "";
}

function getIBManageSdrPercent(value) {
    const number = parseIBManageNumber(value);

    return String(value ?? "").includes("%") ? number : number * 100;
}

function getIBManageZoneClass(value) {
    const zone = normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    if (!zone) return "";

    const knownZones = {
        bkk: "zone-bkk",
        "hub-bu": "zone-hub-bu",
        "new-store": "zone-new-store",
        "hub-bn": "zone-hub-bn",
        "hub-bs": "zone-hub-bs",
        exception: "zone-exception",
        center: "zone-center",
        central: "zone-center",
        north: "zone-north",
        south: "zone-south",
        east: "zone-east",
        west: "zone-west"
    };

    if (knownZones[zone]) {
        return knownZones[zone];
    }

    const paletteIndex = Array.from(zone).reduce(
        (sum, char) => sum + char.charCodeAt(0),
        0
    ) % 6;

    return `zone-auto-${paletteIndex + 1}`;
}

function exportIBManageToExcel() {
    if (!Array.isArray(ibManageFilteredData) || ibManageFilteredData.length === 0) {
        updateIBManageEmptyState("ไม่มีข้อมูลสำหรับ Export");
        return;
    }

    const columns = getIBManageTableColumns();
    const exportData = ibManageFilteredData.map((item, index) => {
        const row = {
            "No.": index + 1
        };

        columns.forEach(column => {
            row[getIBManageColumnLabel(column)] = item[column] ?? "";
        });

        return row;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    const today = new Date();
    const viewName = ibManageActiveView === "qta"
        ? "QTA IB Pending Manage"
        : "Outbound Transport Manage";
    const fileName =
        `${viewName} ${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}.xlsx`;

    XLSX.utils.book_append_sheet(wb, ws, viewName.slice(0, 31));
    XLSX.writeFile(wb, fileName);
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
        setIBManageStatus(message, false, true);
        updateIBManageEmptyState(message);
    }
}

function setIBManageStatus(message, isError = false, showSpinner = false) {
    const status = document.getElementById("ibManageStatus");

    if (!status) return;

    status.classList.toggle("loading-error", isError);
    status.innerHTML = showSpinner
        ? `<span class="loading-spinner"></span><span class="loading-text">${message}</span>`
        : message;
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
    const nextRefresh = formatIBManageUpdatedAt(getNextIBManageRefreshTime());
    const autoLabel = isIBManageAutoRefreshEnabled()
        ? `Next refresh : ${nextRefresh}`
        : "Auto refresh: Off";
    const sourceLabel = {
        "network": "Network",
        "cache": "Cache",
        "stale-cache": "Stale cache"
    }[source] || source;

    info.textContent = `${sourceLabel} | ${updatedAt} | ${autoLabel}`;
}

function updateIBManageDataStatus(source = "network") {
    const updatedAt = formatIBManageUpdatedAt(ibManageLastUpdatedAt || new Date().toISOString());
    const nextRefresh = formatIBManageUpdatedAt(getNextIBManageRefreshTime());
    const sourceLabel = source === "stale-cache" ? "Cached data, refreshing..." : "Last Update";

    setIBManageStatus(
        `${sourceLabel} : ${updatedAt} | Next refresh : ${nextRefresh}`,
        false,
        source === "stale-cache"
    );
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
        return getIBManageLocalStorageCache();
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
        expiresAt: getNextIBManageRefreshTime(new Date(now)).getTime()
    };

    try {
        const db = await openIBManageCacheDb();

        await runIBManageCacheTransaction(db, "readwrite", store => store.put(record));
    } catch (error) {
        console.warn("IB Manage cache write skipped", error);
        setIBManageLocalStorageCache(record);
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

function getIBManageLocalStorageCache() {
    try {
        const rawCache = localStorage.getItem(IB_MANAGE_CACHE_STORAGE_KEY);

        return rawCache ? JSON.parse(rawCache) : null;
    } catch (error) {
        console.warn("IB Manage fallback cache read skipped", error);
        return null;
    }
}

function setIBManageLocalStorageCache(record) {
    try {
        localStorage.setItem(IB_MANAGE_CACHE_STORAGE_KEY, JSON.stringify(record));
    } catch (error) {
        console.warn("IB Manage fallback cache write skipped", error);
    }
}

function initIBManageAutoRefresh() {
    updateIBManageAutoRefreshButton();
    scheduleIBManageAutoRefresh();

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;

        refreshExpiredIBManageCache().then(didRefresh => {
            if (!didRefresh) {
                scheduleIBManageAutoRefresh();
            }
        });
    });
}

function toggleIBManageAutoRefresh() {
    const nextValue = !isIBManageAutoRefreshEnabled();

    localStorage.setItem(IB_MANAGE_AUTO_REFRESH_STORAGE_KEY, nextValue ? "on" : "off");
    updateIBManageAutoRefreshButton();

    if (nextValue) {
        scheduleIBManageAutoRefresh();
        updateIBManageDataStatus(ibManageHasLoaded ? "cache" : "network");
        updateIBManageCacheInfo({
            updatedAt: ibManageLastUpdatedAt
        }, ibManageHasLoaded ? "cache" : "Auto on");
    } else {
        clearIBManageAutoRefreshTimer();
        setIBManageStatus("Auto refresh paused", false);
        updateIBManageCacheInfo({
            updatedAt: ibManageLastUpdatedAt
        }, ibManageHasLoaded ? "cache" : "Auto off");
    }
}

function isIBManageAutoRefreshEnabled() {
    return localStorage.getItem(IB_MANAGE_AUTO_REFRESH_STORAGE_KEY) !== "off";
}

function updateIBManageAutoRefreshButton() {
    const button = document.getElementById("ibManageAutoRefreshToggle");
    const isEnabled = isIBManageAutoRefreshEnabled();

    if (!button) return;

    button.classList.toggle("active", isEnabled);
    button.setAttribute("aria-pressed", String(isEnabled));
    button.textContent = isEnabled ? "⏱ Auto: On" : "⏱ Auto: Off";
}

function scheduleIBManageAutoRefresh() {
    clearIBManageAutoRefreshTimer();
    updateIBManageAutoRefreshButton();

    if (!isIBManageAutoRefreshEnabled()) return;

    const nextRefresh = getNextIBManageRefreshTime();
    const delay = Math.max(nextRefresh.getTime() - Date.now(), 1000);

    ibManageAutoRefreshTimer = setTimeout(() => {
        if (!isIBManageAutoRefreshEnabled()) return;

        loadIBManageData({
            forceRefresh: true,
            autoRefresh: true
        }).finally(scheduleIBManageAutoRefresh);
    }, delay);
}

function clearIBManageAutoRefreshTimer() {
    if (!ibManageAutoRefreshTimer) return;

    clearTimeout(ibManageAutoRefreshTimer);
    ibManageAutoRefreshTimer = null;
}

async function refreshExpiredIBManageCache() {
    if (!isIBManageAutoRefreshEnabled() || !ibManageHasLoaded) {
        return false;
    }

    const cached = await readIBManageCache();

    if (!cached || cached.expiresAt > Date.now()) {
        return false;
    }

    loadIBManageData({
        forceRefresh: true,
        autoRefresh: true
    });

    return true;
}

function getNextIBManageRefreshTime(fromDate = new Date()) {
    if (typeof getNextDataRefreshTime === "function") {
        return getNextDataRefreshTime(fromDate);
    }

    const todaySchedule = IB_MANAGE_AUTO_REFRESH_FALLBACK_SCHEDULE.map(time =>
        buildIBManageRefreshDate(fromDate, time)
    );
    const nextToday = todaySchedule.find(time => time.getTime() > fromDate.getTime());

    if (nextToday) return nextToday;

    return getNextIBManageRefreshDay(fromDate);
}

function getNextIBManageRefreshDay(fromDate) {
    const nextDate = new Date(fromDate);

    nextDate.setDate(nextDate.getDate() + 1);

    return buildIBManageRefreshDate(nextDate, IB_MANAGE_AUTO_REFRESH_FALLBACK_SCHEDULE[0]);
}

function buildIBManageRefreshDate(baseDate, time) {
    const date = new Date(baseDate);

    date.setHours(time.hour, time.minute, 0, 0);

    return date;
}

function getSmartPageRange(currentPage, totalPages, siblingCount = 2) {
    const safeTotal = Math.max(Number(totalPages) || 1, 1);
    const safeCurrent = Math.min(Math.max(Number(currentPage) || 1, 1), safeTotal);
    const pageSet = new Set([1, safeTotal]);
    const start = Math.max(1, safeCurrent - siblingCount);
    const end = Math.min(safeTotal, safeCurrent + siblingCount);

    for (let page = start; page <= end; page += 1) {
        pageSet.add(page);
    }

    const sortedPages = Array.from(pageSet).sort((left, right) => left - right);
    const range = [];

    sortedPages.forEach((page, index) => {
        const previousPage = sortedPages[index - 1];

        if (index > 0 && page - previousPage > 1) {
            range.push("...");
        }

        range.push(page);
    });

    return range;
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
        const matchChartType = typeof dashboardChartFilters === "undefined" ||
            !dashboardChartFilters.type ||
            String(item["Type"] ?? "").trim() === dashboardChartFilters.type;

        const matchSubWH = matchesSelectedValue(selectedSubWH, item["SUB WH"]);
        const matchChartSubWH = typeof dashboardChartFilters === "undefined" ||
            !dashboardChartFilters.subwh ||
            String(item["SUB WH"] ?? "").trim() === dashboardChartFilters.subwh;

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
            matchChartType &&
            matchSubWH &&
            matchChartSubWH &&
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
        case "0-21":
            return agingValue >= 0 && agingValue <= 21;
        case "22-42":
            return agingValue >= 22 && agingValue <= 42;
        case "43+":
            return agingValue >= 43;
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

    if (typeof clearPowerBIFilters === "function") {
        clearPowerBIFilters();
    }

    MULTI_FILTERS.forEach(filter => {
        const select = document.getElementById(filter.id);

        if (filterChoices[filter.id]) {
            filterChoices[filter.id].removeActiveItems();
        }

        Array.from(select.options).forEach(option => {
            option.selected = false;
        });
    });

    if (typeof syncPowerBIFilters === "function") {
        syncPowerBIFilters();
    }

    document.getElementById("generateFrom").value = "";
    document.getElementById("generateTo").value = "";
    document.getElementById("transitFrom").value = "";
    document.getElementById("transitTo").value = "";

    currentPage = 1;
    sortColumn = "";
    sortDirection = "asc";
    if (typeof clearDashboardChartFilters === "function") {
        clearDashboardChartFilters();
    } else {
        agingChartFilter = "";
    }
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
    updateText("costSub", "Total Cost IB");
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

