import "./index.scss";
import * as calcite from "calcite-web";

export function showScrim(params) {
    let maskFontColorCSS_key = "mask-font-color";
    let maskElementOpacityCSS_key = "mask-font-opacity";
    let droughtStatusComponentEle = document.getElementById("droughtStatusComponent");
    let droughtStatusEle = document.getElementById("drought-status");
    let agrComponentEle = document.getElementById("agrComponent");
    let outlookValues = document.getElementsByClassName("outlook-value");
    let dollarSigns = document.getElementsByClassName("dollar-sign");
    let legendWidgetEle = document.getElementById("legendWidget");
    let overlayMessageContainer = document.getElementsByClassName("overlay-message")[0];

    let show = (params.mostRecentDate.getTime() === params.selectedDate.getTime());
    if (!show) {
        calcite.addClass(droughtStatusComponentEle, maskFontColorCSS_key);
        calcite.addClass(agrComponentEle, maskFontColorCSS_key);
        calcite.addClass(droughtStatusEle, maskFontColorCSS_key);
        for (let i = 0, max = outlookValues.length; i < max; i++) {
            calcite.addClass(outlookValues[i], maskFontColorCSS_key);
        }
        calcite.addClass(legendWidgetEle, maskElementOpacityCSS_key);
        calcite.removeClass(overlayMessageContainer, "hide");
        for (let i = 0, max = dollarSigns.length; i < max; i++) {
            calcite.addClass(dollarSigns[i], maskFontColorCSS_key);
        }
    } else {
        calcite.removeClass(droughtStatusComponentEle, maskFontColorCSS_key);
        calcite.removeClass(agrComponentEle, maskFontColorCSS_key);
        calcite.removeClass(droughtStatusEle, maskFontColorCSS_key);
        for (let i = 0, max = outlookValues.length; i < max; i++) {
            calcite.removeClass(outlookValues[i], maskFontColorCSS_key);
        }
        calcite.removeClass(legendWidgetEle, maskElementOpacityCSS_key);
        calcite.addClass(overlayMessageContainer, "hide");
        for (let i = 0, max = dollarSigns.length; i < max; i++) {
            calcite.removeClass(dollarSigns[i], maskFontColorCSS_key);
        }
    }
}
