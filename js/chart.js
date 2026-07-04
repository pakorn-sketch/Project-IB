// ===============================
// Dashboard Charts
// ===============================

let typeChart = null;
let subwhChart = null;
let agingChart = null;


// ===============================
// Load All Charts
// ===============================

function loadCharts(){

    destroyCharts();

    buildTypeChart();

    buildSubWHChart();

    buildAgingChart();

}


// ===============================
// Destroy Charts
// ===============================

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
// ===============================
// Build Type Chart
// ===============================

function buildTypeChart(){

    console.log("Build Type Chart");

}



// ===============================
// Build SUB WH
// ===============================

function buildSubWHChart(){

    console.log("Build SUB WH");

}



// ===============================
// Build Aging
// ===============================

function buildAgingChart(){

    console.log("Build Aging");

}
