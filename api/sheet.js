const API_URL =
"https://script.google.com/macros/s/AKfycbyYNIGkhzTs-ZtQ4zgV3evYdVjmgh49a74Lze0YZzy66uyVqFmLbhFNxZTW10oPBvs/exec";

async function getData(){

    const response = await fetch(API_URL);

    const data = await response.json();

    return data;

}