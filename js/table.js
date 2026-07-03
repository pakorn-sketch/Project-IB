const ROWS_PER_PAGE = 100;

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

    rows.forEach(item=>{

        tbody.innerHTML += `
        <tr>

            <td>${item["IB No."]}</td>

            <td>${item["Store"]}</td>

            <td>${item["Type"]}</td>

            <td>${item["SUB WH"]}</td>

            <td>${item["Generate Date"]}</td>

            <td>${item["Sent Transit Date"]}</td>

            <td>${item["Aging"]}</td>

            <td>${Number(item["Total SKU"]).toLocaleString()}</td>

            <td>${Number(item["SKU Pending"]).toLocaleString()}</td>

            <td>${Number(item["% SDR"]*100).toFixed(2)}%</td>

            <td>${Number(item["Cost IB"]).toLocaleString()}</td>

            <td>${item["Remark"]}</td>

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