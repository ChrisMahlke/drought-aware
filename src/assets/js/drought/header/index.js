export function init(params) {
    addAppHeaderWidget(params.view, params.position);
}

function addAppHeaderWidget(view, position) {
    const appHdrComponent = document.getElementById("appHdrComponent");
    view.ui.add("appHdrComponent", position);
    appHdrComponent.style.display = "block";
}