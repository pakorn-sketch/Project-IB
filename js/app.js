// ===============================
// Global State
// ===============================

let allData = [];
let filteredData = [];
let sortColumn = "";
let sortDirection = "asc";
let agingChartFilter = "";

window.onload = () => {
    loadDashboard();
    bindEvents();
};

function bindEvents() {
    document.getElementById("refreshBtn").addEventListener("click", loadDashboard);
    document.getElementById("searchInput").addEventListener("input", applyFilters);
    document.getElementById("typeFilter").addEventListener("change", applyFilters);
    document.getElementById("subwhFilter").addEventListener("change", applyFilters);
    document.getElementById("storeFilter").addEventListener("change", applyFilters);
    document.getElementById("remarkFilter").addEventListener("change", applyFilters);
    document.getElementById("agingFilter").addEventListener("change", applyFilters);
    document.getElementById("generateFrom").addEventListener("change", applyFilters);
    document.getElementById("generateTo").addEventListener("change", applyFilters);
    document.getElementById("transitFrom").addEventListener("change", applyFilters);
    document.getElementById("transitTo").addEventListener("change", applyFilters);
    document.getElementById("clearFilterBtn").addEventListener("click", clearFilters);
    document.getElementById("exportExcelBtn").addEventListener("click", exportToExcel);
}

// ===============================
// Load Dashboard
// ===============================

async function loadDashboard() {
    try {
        allData = await getData();

        document.getElementById("lastUpdate").innerHTML =
            "Last Update : " + new Date().toLocaleString();

        buildFilter("typeFilter", "Type");
        buildChoicesTypeFilter();
        buildFilter("subwhFilter", "SUB WH");
        buildFilter("storeFilter", "Store");
        buildFilter("remarkFilter", "Remark");
        buildFilter("agingFilter", "Aging");

        applyFilters();
    } catch (error) {
        console.error(error);
    }
}

function buildChoicesTypeFilter() {
    if (window.typeChoices) {
        window.typeChoices.destroy();
    }

    window.typeChoices = new Choices("#typeFilter", {
        removeItemButton: true,
        searchEnabled: true,
        shouldSort: false,
        placeholder: true,
        placeholderValue: "Select Type",
        itemSelectText: ""
    });
}

// ===============================
// Filters
// ===============================

function getSelectedValues(id) {
    return Array.from(document.getElementById(id).selectedOptions)
        .map(option => option.value);
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
    const subwh = document.getElementById("subwhFilter").value;
    const store = document.getElementById("storeFilter").value;
    const remark = document.getElementById("remarkFilter").value;
    const aging = document.getElementById("agingFilter").value;
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

        const matchType =
            selectedTypes.length === 0 ||
            selectedTypes.includes(item["Type"]);

        const matchSubWH =
            subwh === "" ||
            item["SUB WH"] === subwh;

        const matchStore =
            store === "" ||
            item["Store"] === store;

        const matchRemark =
            remark === "" ||
            item["Remark"] === remark;

        const matchAging =
            aging === "" ||
            String(item["Aging"]) === String(aging);

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

    select.innerHTML = filterId === "typeFilter"
        ? ""
        : `<option value="">All</option>`;

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

    if (window.typeChoices) {
        window.typeChoices.removeActiveItems();
    }

    document.getElementById("subwhFilter").value = "";
    document.getElementById("storeFilter").value = "";
    document.getElementById("remarkFilter").value = "";
    document.getElementById("agingFilter").value = "";
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
