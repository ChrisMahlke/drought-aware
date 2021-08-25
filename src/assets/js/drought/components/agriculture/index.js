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

        updateLaborStatistics(document.getElementsByClassName("jobs"), selectedFeature.attributes[labor]);
        updateAgricultureItem(document.getElementsByClassName("totalSales"), selectedFeature.attributes[total_sales]);
        updateAgricultureItem(document.getElementsByClassName("cornSales"), selectedFeature.attributes[corn]);
        updateAgricultureItem(document.getElementsByClassName("soySales"), selectedFeature.attributes[soy]);
        updateAgricultureItem(document.getElementsByClassName("haySales"), selectedFeature.attributes[hay]);
        updateAgricultureItem(document.getElementsByClassName("wheatSales"), selectedFeature.attributes[winter]);
        updateAgricultureItem(document.getElementsByClassName("livestockSales"), selectedFeature.attributes[livestock]);
        updateDemographicStatistics(document.getElementsByClassName("population"), selectedFeature.attributes[population]);
    }
}

function updateLaborStatistics(nodes, data) {
    const value = (Number(data) > -1) ? `${Number(data).toLocaleString()}` : `No Data`;
    for (let node of nodes) {
        node.innerHTML = value;
    }
}

function updateAgricultureItem(nodes, data) {
    const value = (Number(data) > -1) ? `$${Number(data).toLocaleString()}` : `No Data`;
    for (let node of nodes) {
        node.innerHTML = value;
    }
}

function updateDemographicStatistics(nodes, data) {
    const value = (Number(data) > -1) ? `${Number(data).toLocaleString()}` : `No Data`;
    for (let node of nodes) {
        node.innerHTML = value;
    }
}
