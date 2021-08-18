import "./index.scss";
import config from "../../config.json";

/**
 *
 * @param response
 */
export function updateAgriculturalImpactComponent(response) {
    if (response.features.length > 0) {
        const selectedFeature = response.features[0];
        let labor = "CountyLabor";
        let total_sales = "County_Total_Sales";
        let corn = "County_Corn_Value";
        let soy = "County_Soy_Value";
        let hay = "County_Hay_Value";
        let winter = "County_WinterWheat_Value";
        let livestock = "County_Livestock_Value";
        let population = "CountyPop2020";
        if (config.selected.adminAreaId !== config.COUNTY_ADMIN) {
            labor = "StateLabor";
            total_sales = "State_Total_Sales";
            corn = "State_Corn_Value";
            soy = "State_Soy_Value";
            hay = "State_Hay_Value";
            winter = "State_WinterWheat_Value";
            livestock = "State_Livestock_Value";
            population = "StatePop2020";
        }

        updateLaborStatistics(document.getElementById("jobs"), selectedFeature.attributes[labor]);
        updateAgricultureItem(document.getElementById("totalSales"), selectedFeature.attributes[total_sales]);
        updateAgricultureItem(document.getElementById("cornSales"), selectedFeature.attributes[corn]);
        updateAgricultureItem(document.getElementById("soySales"), selectedFeature.attributes[soy]);
        updateAgricultureItem(document.getElementById("haySales"), selectedFeature.attributes[hay]);
        updateAgricultureItem(document.getElementById("wheatSales"), selectedFeature.attributes[winter]);
        updateAgricultureItem(document.getElementById("livestockSales"), selectedFeature.attributes[livestock]);
        updateDemographicStatistics(document.getElementById("population"), selectedFeature.attributes[population]);
    }
}

function updateLaborStatistics(node, data) {
    if (Number(data) > -1) {
        node.innerHTML = `${Number(data).toLocaleString()}`;
    } else {
        node.innerHTML = `No Data`;
    }
}

function updateAgricultureItem(node, data) {
    if (Number(data) > -1) {
        node.innerHTML = `<span class="dollar-sign">$</span>${Number(data).toLocaleString()}`;
    } else {
        node.innerHTML = `No Data`;
    }
}

function updateDemographicStatistics(node, data) {
    node.innerHTML = `${Number(data).toLocaleString()}`;
}
