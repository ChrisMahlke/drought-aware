import "./index.scss";
import config from "../../config.json";

/**
 * Update the monthly drought label
 * component: DROUGHT OUTLOOK
 *
 * @param response
 */
export function monthlyDroughtOutlookResponseHandler(response) {
    const outlook = processOutlookResponse(response);
    document.getElementById("monthlyOutlookDate").innerHTML = outlook.date;
    document.getElementById("monthlyOutlookLabel").innerHTML = outlook.label;
}

/**
 * Update the seasonal drought label
 * component: DROUGHT OUTLOOK
 *
 * @param response
 */
export function seasonalDroughtOutlookResponseHandler(response) {
    const outlook = processOutlookResponse(response);
    document.getElementById("seasonalOutlookDate").innerHTML = outlook.date;
    document.getElementById("seasonalOutlookLabel").innerHTML = outlook.label;
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
