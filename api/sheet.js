const API_URL =
"https://script.google.com/macros/s/AKfycbyYNIGkhzTs-ZtQ4zgV3evYdVjmgh49a74Lze0YZzy66uyVqFmLbhFNxZTW10oPBvs/exec";

async function getData(options = {}){

    const url = new URL(API_URL);

    if (options.forceRefresh) {
        url.searchParams.set("_refresh", Date.now());
    }

    const response = await fetch(url.toString(), {
        cache: "no-store",
        headers: {
            "Cache-Control": "no-cache"
        }
    });

    if (!response.ok) {
        throw new Error(`Data refresh failed: ${response.status}`);
    }

    const data = await response.json();

    return data;

}
