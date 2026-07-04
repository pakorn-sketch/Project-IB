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

// ===============================
// Build Type Chart
// ===============================

function buildTypeChart(){

    const count = {};

    allData.forEach(item=>{

        const type = item["Type"] || "Unknown";

        count[type] = (count[type] || 0) + 1;

    });

    const labels = Object.keys(count);

    const values = Object.values(count);

    const colors = {

        "E-com IB":"#6DA8FF",
        "Extra IB":"#C8A2FF",
        "New Store IB":"#7EDC95",
        "Normal IB":"#FFD54A",
        "Special IB":"#FF8F8F"

    };

    typeChart = new Chart(

        document.getElementById("typeChart"),

        {

            type:"doughnut",

            data:{

                labels:labels,

                datasets:[{

                    data:values,

                    backgroundColor:

                        labels.map(x=>colors[x] || "#CCCCCC"),

                    borderWidth:0,

                    hoverOffset:12

                }]

            },

            options:{

                responsive:true,

                maintainAspectRatio:false,

                cutout:"72%",

                plugins:{

                    legend:{

                        position:"bottom",

                        labels:{

                            usePointStyle:true,

                            pointStyle:"circle",

                            boxWidth:10,

                            padding:18,

                            font:{

                                family:"Poppins",

                                size:13

                            }

                        }

                    }

                },

                animation:{

                    duration:1200

                }

            }

        }

    );

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
