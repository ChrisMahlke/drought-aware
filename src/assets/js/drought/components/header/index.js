import "./index.scss";
import * as calcite from "calcite-web";

export function init(params) {
    addAppHeaderWidget(params.view, params.position);

    let ele = document.getElementsByClassName("information-icon")[0];
    calcite.addEvent(ele, "click", event => {
        document.getElementsByClassName("modal-overlay")[0].style.display = "flex";
    });
}

function addAppHeaderWidget(view, position) {
    const appHdrComponent = document.getElementById("appHdrComponent");
    view.ui.add("appHdrComponent", position);
    appHdrComponent.style.display = "block";
}
