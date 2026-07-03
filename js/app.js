window.onload=()=>{

    loadDashboard();

}

async function loadDashboard(){

    try{

        const data=await getData();

        console.log(data);

        document.getElementById("lastUpdate").innerHTML=
        "Last Update : "+new Date().toLocaleString();

        createSummary(data);

    }

    catch(e){

        console.log(e);

    }

}function createSummary(data){

    document.getElementById("pendingIB").innerHTML=data.length;

    let sku=0;

    let cost=0;

    let aging=0;

    let warning=0;

    let critical=0;

    data.forEach(x=>{

        sku+=Number(x["SKU Pending"]||0);

        cost+=Number(x["Cost IB"]||0);

        aging+=Number(x["Aging"]||0);

        if(Number(x["Aging"])>=42)
            warning++;

        if(Number(x["Aging"])>=56)
            critical++;

    });

    document.getElementById("pendingSKU").innerHTML=
    sku.toLocaleString();

    document.getElementById("pendingCost").innerHTML=
    cost.toLocaleString(undefined,{
        maximumFractionDigits:0
    });

    document.getElementById("avgAging").innerHTML=
    (aging/data.length).toFixed(1);

    document.getElementById("warning").innerHTML=
    warning;

    document.getElementById("critical").innerHTML=
    critical;

}document
.getElementById("refreshBtn")
.onclick=()=>{

    loadDashboard();

}