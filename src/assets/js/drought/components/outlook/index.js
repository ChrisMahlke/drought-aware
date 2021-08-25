import "./index.scss";
import config from "../../config.json";

/**
 * Update the monthly drought label
 * component: DROUGHT OUTLOOK
 *
 * @param response
 */
export function monthlyDroughtOutlookResponseHandler(response) {
    console.debug(response);
    const outlook = processOutlookResponse(response);
    update(document.getElementsByClassName("monthlyOutlookDate"), outlook.date);
    update(document.getElementsByClassName("monthlyOutlookLabel"), outlook.label);
}

function update(nodes, data) {
    for (let node of nodes) {
        node.innerHTML = data;
    }
}

/**
 * Update the seasonal drought label
 * component: DROUGHT OUTLOOK
 *
 * @param response
 */
export function seasonalDroughtOutlookResponseHandler(response) {
    console.debug(response);
    const outlook = processOutlookResponse(response);
    update(document.getElementsByClassName("seasonalOutlookDate"), outlook.date);
    update(document.getElementsByClassName("seasonalOutlookLabel"), outlook.label);
}

/**
 * Process the outlook response.
 * component: DROUGHT OUTLOOK
 *
 * @param response
 * @returns {{date: string, label: string}}
 */
function processOutlookResponse(response) {
    let outlook = {
        "date": config.drought_colors.nothing.label,
        "label": config.drought_colors.nothing.label
    };
    const { features } = response;
    if (features.length > 0) {
        const { attributes } = features[0];
        outlook.date = attributes["Target"];
        if (attributes["FID_improv"] === 1) {
            outlook.label = "Drought Improves";
        } else if (attributes["FID_persis"] === 1) {
            outlook.label = "Drought Persists";
        } else if (attributes["FID_remove"] === 1) {
            outlook.label = "Drought Removal Likely";
        } else if (attributes["FID_dev"] === 1) {
            outlook.label = "Drought Develops";
        }
    }
    return outlook;
}
