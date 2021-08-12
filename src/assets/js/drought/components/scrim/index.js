import "./index.scss";

export function showScrim(show) {
    let overlayEle = document.getElementsByClassName("overlay")[0];
    if (show) {
        let droughtStatusComponentRect = document.getElementById("droughtStatusComponent").getBoundingClientRect();
        let agrComponentRect = document.getElementById("agrComponent").getBoundingClientRect();
        overlayEle.style.width = droughtStatusComponentRect.width + agrComponentRect.width + 5 + "px";
    } else {
        overlayEle.style.display = "none";
    }
}
