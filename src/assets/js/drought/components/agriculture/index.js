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

        let totalSalesValue = selectedFeature.attributes[total_sales] || 0;
        let laborValue = selectedFeature.attributes[labor] || 0;
        let cornValue = selectedFeature.attributes[corn] || 0;
        let soyValue = selectedFeature.attributes[soy] || 0;
        let hayValue = selectedFeature.attributes[hay] || 0;
        let winterValue = selectedFeature.attributes[winter] || 0;
        let livestockValue = selectedFeature.attributes[livestock] || 0;
        let populationValue = selectedFeature.attributes[population] || 0;

        //const sum = calculateOther(cornValue, soyValue, hayValue, winterValue, livestockValue);
        //const other = totalSalesValue - sum;

        updateLaborStatistics(document.getElementsByClassName("jobs"), laborValue);
        updateAgricultureItem(document.getElementsByClassName("totalSales"), totalSalesValue);
        updateAgricultureItem(document.getElementsByClassName("cornSales"), cornValue);
        updateAgricultureItem(document.getElementsByClassName("soySales"), soyValue);
        updateAgricultureItem(document.getElementsByClassName("haySales"), hayValue);
        updateAgricultureItem(document.getElementsByClassName("wheatSales"), winterValue);
        updateAgricultureItem(document.getElementsByClassName("livestockSales"), livestockValue);
        //updateAgricultureItem(document.getElementsByClassName("otherSales"), other);
        updateDemographicStatistics(document.getElementsByClassName("population"), populationValue);
    }
}

function calculateOther(...args) {
    return args.reduce(function (acc, cur) {
        let current = (cur > -1) ? cur : 0;
        console.debug(current);
        return acc + current;
    });
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
