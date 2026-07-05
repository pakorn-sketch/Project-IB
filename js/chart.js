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

        "E-com IB":"#C8A2FF",
        "Extra IB":"#f39e00",
        "New Store IB":"#7EDC95",
        "Normal IB":"#fcffba",
        "Special IB":"#ff7d7d",
        "Last Stock IB": "#F472B6"

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
    plugins:[ChartDataLabels],
    options:{

        responsive:true,

        maintainAspectRatio:false,

        cutout:"74%",

        radius:"92%",
plugins:{

    legend:{
        display:false
    },

    datalabels:{

        color:"#000000",

        font:{
            weight:"bold",
            size:14
        },

        formatter:(value,context)=>{

            const total = context.dataset.data.reduce((a,b)=>a+b,0);

            const percent = ((value/total)*100).toFixed(1);

            if(percent < 2) return "";

            return percent + "%";

        }

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

        const subwh = String(item["SUB WH"]).trim();

        count[subwh] = (count[subwh] || 0) + 1;

    });

    const labels = Object.keys(count);
    const values = Object.values(count);

    // เรียงจากมาก -> น้อย
    const result = labels.map((label,index)=>({

        label:label,
        value:values[index]

    }));

    result.sort((a,b)=>b.value-a.value);

    const sortedLabels = result.map(item=>item.label);
    const sortedValues = result.map(item=>item.value);

    // ==========================
    // กำหนดสีแต่ละ SUB WH
    // ==========================

    const colorMap = {

        "C01MM":"#A8D8FF",      // ฟ้าอ่อน
        "C01LY":"#FFC1E3",      // ชมพูอ่อน
        "IB Extra":"#4B4B4B"    // เทาเข้ม

    };

    const backgroundColors = sortedLabels.map(label => {

        const key = String(label).trim();

        return colorMap[key] || "#D1D5DB";

    });

    const canvas = document.getElementById("subwhChart");

    if(!canvas) return;

    subwhChart = new Chart(canvas,{

        type:"bar",

        data:{

            labels:sortedLabels,

            datasets:[{

                data:sortedValues,

                backgroundColor:backgroundColors,

                borderRadius:8,

                borderSkipped:false

            }]

        },

        options:{

            responsive:true,

            indexAxis:"y",

            maintainAspectRatio:false,

            plugins:{

                legend:{
                    display:false
                }

            },

            scales:{

                y:{
                    grid:{
                        display:false
                    }
                },

                x:{
                    beginAtZero:true
                }

            }

        }

    });

 renderSubWHLegend(
        sortedLabels,
        sortedValues,
        backgroundColors
    );


}


function buildAgingChart(data){

    const ranges = [
        "0-7",
        "8-14",
        "15-21",
        "22-28",
        "29-35",
        "36-42",
        "43-49",
        "50-56",
        "57+"
    ];

    const count = {
        "0-7":0,
        "8-14":0,
        "15-21":0,
        "22-28":0,
        "29-35":0,
        "36-42":0,
        "43-49":0,
        "50-56":0,
        "57+":0
    };

    data.forEach(item=>{

    const raw = String(item["Aging"] ?? "").trim();

    if(raw === "") return;

    const aging = Number(raw);

    if(isNaN(aging)) return;

    if(aging<=7) count["0-7"]++;
    else if(aging<=14) count["8-14"]++;
    else if(aging<=21) count["15-21"]++;
    else if(aging<=28) count["22-28"]++;
    else if(aging<=35) count["29-35"]++;
    else if(aging<=42) count["36-42"]++;
    else if(aging<=49) count["43-49"]++;
    else if(aging<=56) count["50-56"]++;
    else count["57+"]++;

});

    const values = ranges.map(r=>count[r]);

    const canvas = document.getElementById("agingChart");

    if(!canvas) return;

    agingChart = new Chart(canvas,{

        type:"bar",

        data:{

            labels:ranges,

            datasets:[{

                data:values,
                
                barPercentage:0.85,

                categoryPercentage:0.90,

                borderRadius:8,

                borderSkipped:false,

                backgroundColor:[

                    "#D1D5DB", // 0-7 เทา

                    "#A7F3C0", // 8-14 เขียวอ่อน

                    "#16A34A", // 15-21 เขียว

                    "#FDE68A", // 22-28 เหลืองอ่อน

                    "#FFD400", // 29-35 เหลือง DIY

                    "#FBD38D", // 36-42 ส้มอ่อน

                    "#EA580C", // 43-49 ส้มเข้ม

                    "#FCA5A5", // 50-56 ชมพู

                    "#DC2626"  // 57+ แดง

                ]

            }]

        },

        options:{

    responsive:true,

    maintainAspectRatio:false,
 
    onClick:(event,elements)=>{

        if(elements.length===0) return;

        const index = elements[0].index;

        const selected = ranges[index];

if(agingChartFilter === selected){

    agingChartFilter = "";

}else{

    agingChartFilter = selected;

}

        console.log(agingChartFilter);

        applyFilters();

    },

    layout:{

        padding:{

            top:20,
            right:10,
            bottom:30,
            left:10

        }

    },

            plugins:{

                legend:{
                    display:false
                },
datalabels:{

    color:"#ffffff",

    font:{
        weight:"bold",
        size:13
    },

    formatter:(value,context)=>{

        const data = context.chart.data.datasets[0].data;

        const total = data.reduce((a,b)=>a+b,0);

        const percent = ((value/total)*100).toFixed(1);

        if(percent < 2) return "";

        return percent + "%";

    }

},
                tooltip:{

                    callbacks:{

                        label:function(context){

                            return context.raw.toLocaleString() + " IB";

                        }

                    }

                }

            },

            scales:{

                y:{

                    beginAtZero:true,

                    grid:{
                        color:"#E5E7EB"
                    },

                    ticks:{

                        callback:function(value){

                            return value.toLocaleString();

                        }

                    }

                },

                x:{

                    grid:{
                        display:false
                    }

                }

            },

            animation:{

                duration:1200,

                easing:"easeOutQuart"

            }

        },

        plugins:[{

            id:"valueLabel",

            afterDatasetsDraw(chart){

                const {ctx}=chart;

                ctx.save();

                ctx.font="bold 13px Poppins";

                ctx.fillStyle="#444";

                ctx.textAlign="center";

                chart.getDatasetMeta(0).data.forEach((bar,index)=>{

                    ctx.fillText(

                        values[index].toLocaleString(),

                        bar.x,

                        bar.y-10

                    );

                });

                ctx.restore();

            }

        }]

    });
   renderAgingLegend(count);

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

function renderSubWHLegend(labels, values, colors){

    const legend = document.getElementById("subwhLegend");

    if(!legend) return;

    legend.innerHTML = "";

    labels.forEach((label,index)=>{

        legend.innerHTML += `

        <div class="legend-item">

            <div class="legend-left">

                <span class="legend-color"

                    style="background:${colors[index]}">

                </span>

                <span class="legend-label">

                    ${label}

                </span>

            </div>

            <span class="legend-value">

                ${values[index].toLocaleString()}

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
function renderAgingLegend(count){

    const legend = document.getElementById("agingLegend");

    if(!legend) return;

    const normal =
        count["0-7"] +
        count["8-14"] +
        count["15-21"];

    const follow =
        count["22-28"] +
        count["29-35"] +
        count["36-42"];

    const urgent =
        count["43-49"] +
        count["50-56"] +
        count["57+"];

    legend.innerHTML = `

        <div class="legend-item">

            <div class="legend-left">

                <span class="legend-color" style="background:#22C55E"></span>

                <span class="legend-label">

                    Normal (0-21)

                </span>

            </div>

            <span class="legend-value">

                ${normal.toLocaleString()}

            </span>

        </div>

        <div class="legend-item">

            <div class="legend-left">

                <span class="legend-color" style="background:#FFD400"></span>

                <span class="legend-label">

                    Need Follow (22-42)

                </span>

            </div>

            <span class="legend-value">

                ${follow.toLocaleString()}

            </span>

        </div>

        <div class="legend-item">

            <div class="legend-left">

                <span class="legend-color" style="background:#DC2626"></span>

                <span class="legend-label">

                    Urgent (43+)

                </span>

            </div>

            <span class="legend-value">

                ${urgent.toLocaleString()}

            </span>

        </div>

    `;

}