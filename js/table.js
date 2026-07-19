let ROWS_PER_PAGE = Number(document.querySelector(".page-size.active").dataset.size);
let currentPage = 1;
let tableData = [];

function renderTable(data) {
    tableData = data.filter(item => String(item["IB No."] || "").trim() !== "");
    currentPage = 1;

    loadTable();
}

function loadTable() {
    const tbody = document.getElementById("tableBody");
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const rows = tableData.slice(start, end);
    const totalPages = Math.max(1, Math.ceil(tableData.length / ROWS_PER_PAGE));

    tbody.innerHTML = rows.map((item, index) => `
        <tr>
            <td class="col-no">${start + index + 1}</td>
            <td class="col-ib">${escapeTableHtml(item["IB No."])}</td>
            <td class="col-store">${escapeTableHtml(item["Store"])}</td>
            <td class="col-type">${getTypeBadge(item["Type"])}</td>
            <td class="col-subwh">${escapeTableHtml(item["SUB WH"])}</td>
            <td class="col-date">${formatDate(item["Generate Date"])}</td>
            <td class="col-date">${formatDate(item["Sent Transit Date"])}</td>
            <td class="col-aging">${getAgingBadge(item["Aging"])}</td>
            <td class="col-number">${formatTableNumber(item["Total SKU"], "SKU")}</td>
            <td class="col-number">${formatTableNumber(item["SKU Pending"], "SKU")}</td>
            <td class="col-percent">${getSdrBadge(item["% SDR"])}</td>
            <td class="money">${formatCurrency(item["Cost IB"])}</td>
            <td class="remark" title="${escapeTableHtml(item["Remark"])}">${escapeTableHtml(item["Remark"])}</td>
        </tr>
    `).join("");

    const visibleStart = tableData.length === 0 ? 0 : start + 1;
    const visibleEnd = Math.min(end, tableData.length);

    document.getElementById("pageInfo").textContent =
        `${visibleStart.toLocaleString()}–${visibleEnd.toLocaleString()} of ${tableData.length.toLocaleString()} • Page ${currentPage.toLocaleString()} / ${totalPages.toLocaleString()}`;
    renderPageJump(totalPages);

    document.getElementById("firstPage").disabled = currentPage === 1;
    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;
    document.getElementById("lastPage").disabled = currentPage === totalPages;
}

function renderPageJump(totalPages) {
    const container = document.getElementById("pageJump");

    if (!container) return;

    container.innerHTML = "";

    getSmartPageRange(currentPage, totalPages).forEach(page => {
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
        button.className = page === currentPage ? "active" : "";
        button.setAttribute("aria-label", `Go to page ${page}`);
        button.addEventListener("click", () => {
            currentPage = page;
            loadTable();
        });
        container.appendChild(button);
    });
}

document.getElementById("firstPage").onclick = () => {
    currentPage = 1;
    loadTable();
};

document.getElementById("prevPage").onclick = () => {
    if (currentPage > 1) {
        currentPage--;
        loadTable();
    }
};

document.getElementById("nextPage").onclick = () => {
    if (currentPage < Math.ceil(tableData.length / ROWS_PER_PAGE)) {
        currentPage++;
        loadTable();
    }
};

document.getElementById("lastPage").onclick = () => {
    currentPage = Math.max(1, Math.ceil(tableData.length / ROWS_PER_PAGE));
    loadTable();
};

document.querySelectorAll(".page-size").forEach(btn => {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".page-size").forEach(button => {
            button.classList.remove("active");
        });

        this.classList.add("active");

        ROWS_PER_PAGE =
            this.dataset.size === "all"
                ? tableData.length
                : Number(this.dataset.size);

        currentPage = 1;
        loadTable();
    });
});

function formatDate(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleDateString("en-CA");
}

function formatTableNumber(value, unit = "") {
    const number = Number(value);

    return Number.isFinite(number)
        ? `${number.toLocaleString()}${unit ? ` ${unit}` : ""}`
        : "";
}

function formatCurrency(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return "฿0.00";

    return `฿${number.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function getTypeBadge(type) {
    const map = {
        "E-com IB": "type-ecom",
        "Extra IB": "type-extra",
        "Last Stock IB": "type-last",
        "New Store IB": "type-new",
        "Normal IB": "type-normal",
        "Special IB": "type-special"
    };

    return `<span class="type-badge ${map[type] || ""}">${escapeTableHtml(type)}</span>`;
}

function getAgingBadge(aging) {
    const agingValue = Number(aging);
    let cls = "";

    if (agingValue <= 42) {
        cls = "aging-green";
    } else if (agingValue <= 56) {
        cls = "aging-yellow";
    } else if (agingValue <= 90) {
        cls = "aging-orange";
    } else {
        cls = "aging-red";
    }

    return `<span class="aging-badge ${cls}">${agingValue.toLocaleString()} Days</span>`;
}

function getSdrBadge(value) {
    const rawValue = String(value ?? "").trim();
    const parsedValue = Number(rawValue.replace(/,/g, "").replace(/%/g, ""));
    const percent = rawValue.includes("%") ? parsedValue : parsedValue * 100;
    const safePercent = Number.isFinite(percent) ? percent : 0;
    let cls = "sdr-green";

    if (safePercent >= 100) {
        cls = "sdr-critical";
    } else if (safePercent > 10) {
        cls = "sdr-red";
    } else if (safePercent > 5) {
        cls = "sdr-orange";
    } else if (safePercent >= 1) {
        cls = "sdr-yellow";
    } else if (safePercent > 0.6) {
        cls = "sdr-blue";
    }

    return `<span class="sdr-badge ${cls}">${safePercent.toFixed(2)}%</span>`;
}

function escapeTableHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
