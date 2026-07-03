// ===============================
// IB Pending Monitor
// Dashboard v1.0
// ===============================

window.onload = () => {

    loadDashboard();

    document
        .getElementById("refreshBtn")
        .addEventListener("click", loadDashboard);

};

// ===============================
// Load Dashboard
// ===============================

async function loadDashboard() {

    try {

        const data = await getData();

        console.log("Google Sheet Data :", data);

        document.getElementById("lastUpdate").innerHTML =
            "Last Update : " + new Date().toLocaleString();

       createSummary(data);
       renderTable(data);
    }

    catch (error) {

        console.error(error);

    }

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
        receivePercent.toFixed(1) + "All SKUs"
    );

    updateText(
        "receiveSub",
        receivedSKU.toLocaleString() + "% Received"
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