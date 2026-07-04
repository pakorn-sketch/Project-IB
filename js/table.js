let ROWS_PER_PAGE = 100;

let currentPage = 1;
let tableData = [];

function renderTable(data){

    tableData = data.filter(item =>
        String(item["IB No."] || "").trim() !== ""
    );

    currentPage = 1;

    loadTable();

}

function loadTable(){

    const tbody = document.getElementById("tableBody");

    tbody.innerHTML = "";

    const start = (currentPage-1) * ROWS_PER_PAGE;

    const end = start + ROWS_PER_PAGE;

    const rows = tableData.slice(start,end);

   rows.forEach((item,index)=>{

        tbody.innerHTML += `
        <tr>

            <td>${start + index + 1}</td>

            <td>${item["IB No."]}</td>

            <td>${item["Store"]}</td>

            <td>${getTypeBadge(item["Type"])}</td>

            <td>${item["SUB WH"]}</td>

            <td>${formatDate(item["Generate Date"])}</td>

            <td>${formatDate(item["Sent Transit Date"])}</td>

            <td>${getAgingBadge(item["Aging"])}</td>

            <td>${Number(item["Total SKU"]).toLocaleString()}</td>

            <td>${Number(item["SKU Pending"]).toLocaleString()}</td>

            <td>${Number(item["% SDR"]*100).toFixed(2)}%</td>

            <td class="money">
            ฿${Number(item["Cost IB"]).toLocaleString(undefined,{
        minimumFractionDigits:2,
        maximumFractionDigits:2
    })}
</td>

            <td class="remark" title="${item["Remark"]}">
    ${item["Remark"]}
</td>

        </tr>
        `;

    });

    document.getElementById("pageInfo").innerHTML =
        `Page ${currentPage} / ${Math.ceil(tableData.length / ROWS_PER_PAGE)}`;

}

document.getElementById("nextPage").onclick=()=>{

    if(currentPage < Math.ceil(tableData.length / ROWS_PER_PAGE)){

        currentPage++;

        loadTable();

    }

}

document.getElementById("prevPage").onclick=()=>{

    if(currentPage>1){

        currentPage--;

        loadTable();

    }

}

function formatDate(dateString){

    if(!dateString) return "";

    const date = new Date(dateString);

    return date.toLocaleDateString("en-CA");

}
// ===============================
// Type Badge
// ===============================

function getTypeBadge(type){

    const map = {

        "E-com IB":      "type-ecom",
        "Extra IB":      "type-extra",
        "New Store IB":  "type-new",
        "Normal IB":     "type-normal",
        "Special IB":    "type-special"

    };

    return `<span class="type-badge ${map[type] || ""}">${type}</span>`;

}

// ===============================
// Aging Badge
// ===============================

function getAgingBadge(aging){

    aging = Number(aging);

    let cls = "";

    if(aging <= 42){

        cls = "aging-green";

    }else if(aging <= 56){

        cls = "aging-yellow";

    }else if(aging <= 90){

        cls = "aging-orange";

    }else{

        cls = "aging-red";

    }

    return `<span class="aging-badge ${cls}">${aging}</span>`;

}
document.querySelectorAll(".page-size")forEach(btn=>{

    btn.addEventListener("click",function(){

        document.querySelectorAll(".page-size")
.forEach(b=>{

    b.classList.remove("active");

});

        this.classList.add("active");

        ROWS_PER_PAGE = Number(this.dataset.size);

        currentPage = 1;

        loadTable();

    });

});
