export function showScrim() {
    let droughtStatusComponentRect = document.getElementById("droughtStatusComponent").getBoundingClientRect();
    let agrComponentRect = document.getElementById("agrComponent").getBoundingClientRect();
    let overlayEle = document.getElementsByClassName("overlay")[0];
    overlayEle.style.width = droughtStatusComponentRect.width + agrComponentRect.width + "px";
}
