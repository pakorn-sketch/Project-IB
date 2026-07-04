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
// =====================================================
// IB Type Doughnut
// =====================================================

function buildTypeChart(data){

    const count = {};

    data.forEach(item=>{

        const type = item["Type"] || "Unknown";

        count[type] = (count[type] || 0) + 1;

    });

    const labels = Object.keys(count);

    const values = Object.values(count);

    const colorMap = {

        "E-com IB":"#6DA8FF",
        "Extra IB":"#C8A2FF",
        "New Store IB":"#7EDC95",
        "Normal IB":"#FFD54A",
        "Special IB":"#FF8F8F"

    };

    const colors = labels.map(label => colorMap[label] || "#D1D5DB");

    const canvas = document.getElementById("typeChart");

    if(!canvas) return;

    typeChart = new Chart(canvas,{

        type:"doughnut",

        data:{

            labels:labels,

           datasets:[{

    data:values,

    backgroundColor:colors,

    borderWidth:0,

    hoverOffset:16,

    hoverBorderWidth:2,

    hoverBorderColor:"#ffffff"

}]
        },

        options:{

            responsive:true,

            maintainAspectRatio:false,

            cutout:"74%",
            radius:"92%",

            plugins:{

    legend:{
        display:false
    },

    tooltip:{

        backgroundColor:"#2B2B2B",

        padding:12,

        cornerRadius:10,

        displayColors:true,

        callbacks:{

            label:function(context){

                const total = context.dataset.data.reduce((a,b)=>a+b,0);

                const value = context.raw;

                const percent = ((value/total)*100).toFixed(1);

                return ` ${context.label} : ${value.toLocaleString()} (${percent}%)`;

            }

        }

    }

},

            animation:{

    animateRotate:true,

    animateScale:true,

    duration:1200,

    easing:"easeOutQuart"

}

        }

    });

}
function buildSubWHChart(data){

}

function buildAgingChart(data){

}
