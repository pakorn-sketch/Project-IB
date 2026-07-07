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
const THEME_STORAGE_KEY = "ibPendingTheme";
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

    const initialHash = window.location.hash.replace("#", "");
    const initialPage = Object.entries(APP_PAGES)
        .find(([, page]) => page.hash === initialHash)?.[0] || "dashboard";

    showPage(initialPage, false);
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

    MULTI_FILTERS.forEach(filter => {
        document.getElementById(filter.id).addEventListener("change", applyFilters);
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

