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

    data = getValidRows(data,"Type");
    const count = {};

data.forEach(item=>{

    const type = item["Type"].trim();

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

                        return `${context.label} : ${value.toLocaleString()} (${percent}%)`;

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

}); // ← จบ new Chart()

renderTypeLegend(labels, values, colors); // ← เพิ่มตรงนี้

} // ← จบ buildTypeChart()

function buildSubWHChart(data){

    data = getValidRows(data,"SUB WH");

    const count = {};

    data.forEach(item=>{

        const subwh = item["SUB WH"].trim();

        count[subwh] = (count[subwh] || 0) + 1;

    });
const labels = Object.keys(count);

const values = Object.values(count);

}


function buildAgingChart(data){

}

// ======================================
// Render Type Legend
// ======================================

function renderTypeLegend(labels, values, colors){

    const legend = document.getElementById("typeLegend");

    if(!legend) return;

    legend.innerHTML = "";

    const items = labels.map((label,index)=>({

        label: label,
        value: values[index],
        color: colors[index]

    }));

    // เรียงจากมาก → น้อย
    items.sort((a,b)=>b.value-a.value);

    items.forEach(item=>{

        legend.innerHTML += `

        <div class="legend-item">

            <div class="legend-left">

                <span class="legend-color"
                      style="background:${item.color}">
                </span>

                <span class="legend-label">

                    ${item.label}

                </span>

            </div>

            <span class="legend-value">

                ${item.value.toLocaleString()}

            </span>

        </div>

        `;

    });

}
// =====================================================
// Utilities
// =====================================================

// คืนข้อมูลที่ไม่ใช่ค่าว่าง
function getValidRows(data, field){

    return data.filter(row=>{

        const value = row[field];

        return value !== undefined &&
               value !== null &&
               value.toString().trim() !== "";

    });

}
