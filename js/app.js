// ===============================
// Global Data
// ===============================

let allData = [];
let filteredData = [];

window.onload = () => {

    loadDashboard();

    document
        .getElementById("refreshBtn")
        .addEventListener("click", loadDashboard);

    document
        .getElementById("searchInput")
        .addEventListener("input", applyFilters);

    document
        .getElementById("typeFilter")
        .addEventListener("change", applyFilters);

    document
        .getElementById("subwhFilter")
        .addEventListener("change", applyFilters);

    document
        .getElementById("storeFilter")
        .addEventListener("change", applyFilters);
    
    document
    .getElementById("remarkFilter")
    .addEventListener("change", applyFilters);

    document
    .getElementById("agingFilter")
    .addEventListener("change", applyFilters);

    document
    .getElementById("generateFrom")
    .addEventListener("change", applyFilters);

    document
    .getElementById("generateTo")
    .addEventListener("change", applyFilters);

    document
    .getElementById("transitFrom")
    .addEventListener("change", applyFilters);

    document
    .getElementById("transitTo")
    .addEventListener("change", applyFilters);

};

// ===============================
// Load Dashboard
// ===============================

async function loadDashboard() {

    try {

        allData = await getData();

        console.log("Google Sheet Data :", allData);

        console.log(Object.keys(allData[0]));
    

        document.getElementById("lastUpdate").innerHTML =
            "Last Update : " + new Date().toLocaleString();

        // Build Filters
        buildFilter("typeFilter", "Type", "Type");
     new TomSelect("#typeFilter",{

         plugins:['remove_button'],

            create:false,

            persist:false

});
        buildFilter("subwhFilter", "SUB WH", "SUB WH");
        buildFilter("storeFilter", "Store", "Store");
        buildFilter("remarkFilter", "Remark", "Remark");
        buildFilter("agingFilter", "Aging", "Aging");
        // Render
        applyFilters();

    }

    catch (error) {

        console.error(error);

    }

}

// ===============================
// Get Selected Values
// ===============================

function getSelectedValues(id){

    return Array.from(
        document.getElementById(id).selectedOptions
    ).map(option => option.value);

}

// ===============================
// Apply Filters
// ===============================
function formatDateOnly(value) {

    if (!value) return "";

    const d = new Date(value);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}

function applyFilters() {

    // Search
    const keyword = document
        .getElementById("searchInput")
        .value
        .toLowerCase()
        .trim();

    // Filters
    const types = getSelectedValues("typeFilter");
    const subwhs = getSelectedValues("subwhFilter");
    const stores = getSelectedValues("storeFilter");
    const remarks = getSelectedValues("remarkFilter");
    const agings = getSelectedValues("agingFilter");

    // Date Range
    const generateFrom = document.getElementById("generateFrom").value;
    const generateTo = document.getElementById("generateTo").value;

    const transitFrom = document.getElementById("transitFrom").value;
    const transitTo = document.getElementById("transitTo").value;

    filteredData = allData.filter(item => {

        // ---------------- Search ----------------

        const matchSearch =
            keyword === "" ||
            Object.values(item).some(value =>
                String(value)
                    .toLowerCase()
                    .includes(keyword)
            );

        // ---------------- Dropdown ----------------

        const matchType =
    types.length === 0 ||
    types.includes(item["Type"]);

const matchSubWH =
    subwhs.length === 0 ||
    subwhs.includes(item["SUB WH"]);

const matchStore =
    stores.length === 0 ||
    stores.includes(item["Store"]);

const matchRemark =
    remarks.length === 0 ||
    remarks.includes(item["Remark"]);

const matchAging =
    agings.length === 0 ||
    agings.includes(String(item["Aging"]));
    


const generateDate = formatDateOnly(item["Generate Date"]);

const matchGenerateDate =
    (!generateFrom || generateDate >= generateFrom) &&
    (!generateTo || generateDate <= generateTo);

const transitDate = formatDateOnly(item["Sent Transit Date"]);

const matchTransitDate =
    (!transitFrom || transitDate >= transitFrom) &&
    (!transitTo || transitDate <= transitTo);

// ===== Debug =====
console.log(
    "Generate Raw :", item["Generate Date"],
    "=>", generateDate,
    "From:", generateFrom,
    "To:", generateTo
);

console.log(
    "Transit Raw :", item["Sent Transit Date"],
    "=>", transitDate,
    "From:", transitFrom,
    "To:", transitTo
);


        return (

            matchSearch &&
            matchType &&
            matchSubWH &&
            matchStore &&
            matchRemark &&
            matchAging &&
            matchGenerateDate &&
            matchTransitDate

        );

    });

    createSummary(filteredData);

    renderTable(filteredData);

}

// ===============================
// Build Filter
// ===============================

function buildFilter(filterId, columnName, defaultText) {

    const select = document.getElementById(filterId);

    select.innerHTML = `<option value="">${defaultText}</option>`;

  const values = [...new Set(

    allData
        .map(item => item[columnName])
        .filter(Boolean)

)].sort((a, b) => {

    // ถ้าเป็นตัวเลข ให้เรียงแบบตัวเลข
    if (!isNaN(a) && !isNaN(b)) {
        return Number(a) - Number(b);
    }

    // ถ้าเป็นข้อความ ให้เรียง A-Z
    return String(a).localeCompare(String(b));

});

    values.forEach(value => {

        const option = document.createElement("option");

        option.value = value;
        option.textContent = value;

        select.appendChild(option);

    });

}

// ===============================
// KPI Summary
// ===============================

function createSummary(data) {

    // นับเฉพาะรายการที่มี IB No.
    const validData = data.filter (item =>
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

    const receivePercent =
        totalSKU === 0 ? 0 : (receivedSKU / totalSKU) * 100;

    const pendingPercent =
        totalSKU === 0 ? 0 : (pendingSKU / totalSKU) * 100;

    const avgAging =
    validData.length === 0 ? 0 : totalAging / validData.length;

    // ===========================
    // Render KPI
    // ===========================

    document.getElementById("pendingIB").innerHTML =
        validData.length.toLocaleString();

    document.getElementById("totalSKU").innerHTML =
        totalSKU.toLocaleString();

    document.getElementById("receivedSKU").innerHTML =
        receivedSKU.toLocaleString();

    document.getElementById("pendingSKU").innerHTML =
        pendingSKU.toLocaleString();

    document.getElementById("pendingCost").innerHTML =
        "฿ " + formatNumber(totalCost);

    document.getElementById("avgAging").innerHTML =
        avgAging.toFixed(1);

    updateText("warning", warning.toLocaleString());

    updateText("critical", critical.toLocaleString());

    // ===========================
    // Card Description
    // ===========================

  updateText("ibSub", "Total Pending IB");

updateText(
    "skuSub",
    "All SKUs"
);

updateText(
    "receiveSub",
    receivePercent.toFixed(1) + "% Received"
);

updateText(
    "pendingSub",
    pendingPercent.toFixed(1) + "% Remaining"
);

updateText(
    "costSub",
    "Pending Value"
);

updateText(
    "agingSub",
    "Average Days"
);

}

// ===============================
// Format Money
// ===============================

function formatNumber(value) {

    if (value >= 1000000000)
        return (value / 1000000000).toFixed(2) + " B";

    if (value >= 1000000)
        return (value / 1000000).toFixed(2) + " M";

    if (value >= 1000)
        return (value / 1000).toFixed(2) + " K";

    return value.toLocaleString();

}

// ===============================
// Update Card Text
// ===============================

function updateText(id, value) {

    const el = document.getElementById(id);

    if (el)
        el.innerHTML = value;

}