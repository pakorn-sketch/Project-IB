// =====================================================
// Dashboard Analytics V2
// IB Pending Monitor
// =====================================================

// ---------- Chart Objects ----------

let typeChart = null;
let subwhChart = null;
let agingChart = null;


// =====================================================
// Load Dashboard Charts
// =====================================================

function loadCharts(data = filteredData){

    destroyCharts();

    buildTypeChart(data);

    buildSubWHChart(data);

    buildAgingChart(data);

}


// =====================================================
// Destroy Old Charts
// =====================================================

function destroyCharts(){

    if(typeChart){

        typeChart.destroy();
        typeChart = null;

    }

    if(subwhChart){

        subwhChart.destroy();
        subwhChart = null;

    }

    if(agingChart){

        agingChart.destroy();
        agingChart = null;

    }

}
