import "../../style/index.scss";
import config from './config.json';

import { loadCss, loadModules } from 'esri-loader';

import * as AppHeaderComponent from './components/header/index';
import * as BookmarksComponent from './components/bookmarks/index';
import * as Chart from './components/charts/index';
import * as DataUtils from './utils/DataUtils';
import * as ErrorHandler from './utils/ErrorHandler';
import * as FormatUtils from './utils/FormatUtils';
import * as HomeComponent from './components/home/index';
import * as LayerUtils from './utils/LayerUtils';
import * as LegendComponent from './components/legend/index';
import * as Mobile from './utils/Mobile';
import * as QueryUtils from './utils/QueryUtils';
import * as SearchComponent from './components/search/index';
import * as ZoomComponent from './components/zoom/index';

import * as calcite from "calcite-web";
import * as d3 from "d3";
import { differenceInWeeks, format } from 'date-fns';
import * as Scrim from "./components/scrim";
import {hydrateErrorAlert, noResponseHandler} from "./utils/ErrorHandler";

window.onSignInHandler = (portal) => {
    // initialize calcite
    calcite.init();
    // esri styles
    loadCss();

    loadModules([
        "esri/WebMap",
        "esri/geometry/Point",
        "esri/Graphic",
        "esri/geometry/Extent",
        "esri/views/MapView",
        "esri/core/watchUtils"
    ]).then(([WebMap, Point, Graphic, Extent, MapView, watchUtils]) => {

        const isMobile = Mobile.isMobileBrowser();

        // Cache DOM Nodes used by the app
        let bottomLeft = null;
        let bottomRight = null;
        let dataComponentLoadingIndicator = document.getElementById("dataComponentLoader");
        let adminSubdivision = document.getElementById("administrativeSubdivision");
        let bottomComponent = document.getElementById("bottomComponent");
        let countyButtonEle = document.getElementById("county");
        let stateButtonEle = document.getElementById("state");

        let selectedDateObj = {};
        let inputDataset = [];

        // The URLSearchParams spec defines an interface and convenience methods for working with the query string of a
        // URL (e.g. everything after "?"). This means no more regex'ing and string splitting URLs!
        let params = new URLSearchParams(location.search);
        // url params
        let selectedX = parseFloat(params.get("x"));
        let selectedY = parseFloat(params.get("y"));
        config.selected.adminAreaId = params.get("admin") || config.COUNTY_ADMIN;
        params.set("admin", config.selected.adminAreaId);
        // If there was no selected point, do not append it to the URL
        window.history.replaceState({}, '', `${location.pathname}?${params}`);

        // Hydrate the boundary query from url params
        let boundaryQueryUrl = "";
        let boundaryQueryOutFields = [];
        if (config.selected.adminAreaId === config.COUNTY_ADMIN) {
            boundaryQueryUrl = config.county_boundary;
            boundaryQueryOutFields = config.county_boundary_outfields;
        } else {
            boundaryQueryUrl = config.state_boundary;
            boundaryQueryOutFields = config.state_boundary_outfields;
            // update admin toggle buttons
            countyButtonEle.checked = false;
            stateButtonEle.checked = true;
        }

        config.boundaryQuery = {
            url: boundaryQueryUrl,
            returnGeometry: true,
            outFields: boundaryQueryOutFields,
            geometry: new Point({
                "x": selectedX,
                "y": selectedY,
                "spatialReference": {
                    "wkid": 3857
                },
                "type": "point"
            }),
            q: ""
        };

        if (isMobile) {
            config.widgetPositions.appHeader = "manual";
            config.widgetPositions.home = "bottom-right";
            config.widgetPositions.zoom = "bottom-right";
        }

        // MapView
        let mapView = null;

        // Fetch the latest date in the service
        // We will use the response to apply the correct Time Extent to the drought layer
        // This query also doubles as a check to determine if the drought feature service is operational.
        // If this query returns an error the entire app is un-usable.
        QueryUtils.fetchData({
            url: config.droughtURL + "2?resultRecordCount=1",
            returnGeometry: false,
            orderByFields: ["ddate desc"],
            outFields: ["ddate"],
            q: ""
        }).then(successHandler).catch(ErrorHandler.hydrateErrorAlert);

        function successHandler(response) {
            const { features } = response;
            selectedDateObj = selectedDateHandler(parseInt(params.get("date")) || features[0].attributes.ddate);

            let webMap = new WebMap({
                portalItem: {
                    id: config.webMapId
                }
            });
            webMap.when(webMapLoadedSuccessHandler, ErrorHandler.hydrateWebMapErrorAlert);

            mapView = new MapView({
                container: "viewDiv",
                map: webMap,
                constraints: {
                    snapToZoom: true,
                    rotationEnabled: false,
                    minScale: config.mapViewMinScale,
                    maxScale: config.mapViewMaxScale
                },
                ui: {
                    components: []
                }
            });
            mapView.when(viewLoadedSuccessHandler, ErrorHandler.hydrateMapViewErrorAlert);

            watchUtils.whenTrue(mapView, "stationary", viewStationaryHandler);

            bottomLeft = document.getElementsByClassName("esri-ui-bottom-left")[0];
            bottomRight = document.getElementsByClassName("esri-ui-bottom-right")[0];
        }

        function webMapLoadedSuccessHandler(response) {
            console.debug("WebMap Success", response)
        }

        function viewLoadedSuccessHandler(response) {
            // zoom
            ZoomComponent.init({
                view: response,
                position: config.widgetPositions.zoom
            });

            // home
            HomeComponent.init({
                view: response,
                position: config.widgetPositions.home
            });

            // bookmarks
            BookmarksComponent.init({
                view: response
            });

            // search
            SearchComponent.init({
                view: response,
                position: ""
            }).then(response => {
                response.on("search-complete", event => {
                    const feature = event.results[0].results[0].feature;
                    config.boundaryQuery.geometry = feature.geometry;
                    mapClickHandler({
                        "mapPoint": new Point({
                            "x": feature.geometry.x,
                            "y": feature.geometry.y,
                            "spatialReference": {
                                "wkid": 3857
                            },
                            "type": "point"
                        })
                    });
                });
            }, error => {
                console.debug(error)
            });

            // app header
            AppHeaderComponent.init({
                view: response,
                position: config.widgetPositions.appHeader
            });

            // legend
            LegendComponent.init({
                view: response,
                position: config.widgetPositions.legend
            }).then(response => {
                document.getElementById("minValue").innerHTML = "< $50 million"//formatter.format(visualVariables.minDataValue);
                document.getElementById("maxValue").innerHTML = "> $1 Billion"//formatter.format(visualVariables.maxDataValue);
                document.getElementById("legendWidget").appendChild(document.getElementsByClassName("esri-legend")[0]);
            });

            response.ui.add("administrativeSubdivision", "bottom-left");

            response.on("click", mapClickHandler);

            let params = new URLSearchParams(location.search);
            let urlExtent = new Extent({
                "xmin": params.get("xmin") || response.map.initialViewProperties.viewpoint.targetGeometry.xmin,
                "ymin": params.get("ymin") || response.map.initialViewProperties.viewpoint.targetGeometry.ymin,
                "xmax": params.get("xmax") || response.map.initialViewProperties.viewpoint.targetGeometry.xmax,
                "ymax": params.get("ymax") || response.map.initialViewProperties.viewpoint.targetGeometry.ymax,
                "spatialReference": {
                    "wkid": 3857
                }
            });
            response.goTo(urlExtent)
                .catch(function(error) {
                    if (error.name !== "AbortError") {
                        console.error(error);
                    }
                });

            LayerUtils.addLayer({
                "url": config.droughtURL,
                "start": selectedDateObj.startDate,
                "end": selectedDateObj.endDate,
                "title": config.drought_layer_name,
                "view": response
            });

            if (!isNaN(selectedX) && !isNaN(selectedY)) {
                mapClickHandler(null);
            }

            // splash screen
            calcite.addClass(document.getElementById("splash"), "hide");
            calcite.addClass(document.getElementById("appLoadingIndicator"), "hide");

            document.querySelectorAll(".radio-group-input").forEach(item => {
                item.addEventListener("click", event => {
                    config.selected.adminAreaId = event.target.id;
                    if (config.selected.adminAreaId === config.COUNTY_ADMIN) {
                        config.boundaryQuery.url = config.county_boundary;
                        config.boundaryQuery.outFields = config.county_boundary_outfields;
                    } else if (config.selected.adminAreaId === config.STATE_ADMIN) {
                        config.boundaryQuery.url = config.state_boundary;
                        config.boundaryQuery.outFields = config.state_boundary_outfields;
                    }

                    const params = new URLSearchParams(location.search);
                    params.set("admin", config.selected.adminAreaId);
                    window.history.replaceState({}, '', `${location.pathname}?${params}`);
                    selectedX = parseFloat(params.get("x"));
                    selectedY = parseFloat(params.get("y"));

                    config.boundaryQuery.geometry.x = selectedX;
                    config.boundaryQuery.geometry.y = selectedY;
                    config.boundaryQuery.geometry.type = "point";

                    if (!isNaN(selectedX) && !isNaN(selectedY)) {
                        mapClickHandler(null);
                    }
                });
            });

            document.querySelectorAll(".reset-chart-btn").forEach(item => {
                item.addEventListener('click', event => {
                    let mostRecentDate = new Date(inputDataset[inputDataset.length - 1].date).getTime();
                    Chart.setSelectedEvent(d3.select("rect[id='" + mostRecentDate + "']"));
                    let initXPosition = d3.select("rect[id='" + mostRecentDate + "']").attr("x");
                    // mouse-over scrubber
                    Chart.setScrubberPosition(initXPosition);
                    let formattedDate = FormatUtils.getFormattedDate(new Date(parseInt(mostRecentDate)));
                    d3.select(".click-scrubber-text").text(formattedDate);

                    let endDate = new Date(inputDataset[inputDataset.length - 1].date);
                    let startDate = new Date(endDate.getTime() - (60 * 60 * 24 * 7 * 1000));
                    let urlSearchParams = new URLSearchParams(location.search);
                    urlSearchParams.set("date", mostRecentDate.toString());
                    window.history.replaceState({}, '', `${location.pathname}?${urlSearchParams}`);

                    // update ag layer
                    LayerUtils.toggleLayer(mapView, {
                        "mostRecentDate": new Date(inputDataset[inputDataset.length - 1].date),
                        "selectedDate": endDate
                    });

                    LayerUtils.removeLayers(mapView);
                    LayerUtils.addLayer({
                        "url": config.droughtURL,
                        "start": startDate,
                        "end": endDate,
                        "title": config.drought_layer_name,
                        "view": mapView
                    });

                    Scrim.showScrim({
                        "mostRecentDate": new Date(inputDataset[inputDataset.length - 1].date),
                        "selectedDate": endDate
                    });
                });
            });

            document.getElementsByClassName("reset-app-btn")[0].addEventListener("click", event => {
                bottomComponent.style.display = "none";
                adminSubdivision.style.display = "none";
                for (const graphic of mapView.graphics){
                    if (graphic.attributes === "BOUNDARY") {
                        mapView.graphics.remove(graphic);
                    }
                }
                Scrim.showScrim({
                    "mostRecentDate": new Date(inputDataset[inputDataset.length - 1].date),
                    "selectedDate": new Date(inputDataset[inputDataset.length - 1].date)
                });
            });
        }

        function mapClickHandler(event) {
            const params = new URLSearchParams(location.search);
            if (event !== null) {
                config.boundaryQuery.geometry = event.mapPoint;
                params.set("x", event.mapPoint.x);
                params.set("y", event.mapPoint.y);
                window.history.replaceState({}, '', `${location.pathname}?${params}`);
            } else {
                selectedX = parseFloat(params.get("x"));
                selectedY = parseFloat(params.get("y"));
                config.boundaryQuery.geometry = new Point({
                    "x": selectedX,
                    "y": selectedY,
                    "spatialReference": {
                        "wkid": 3857
                    },
                    "type": "point"
                })
            }

            QueryUtils.fetchData(config.boundaryQuery).then(retrieveGeometryResponseHandler).then(response => {
                if (response.features.length > 0) {
                    adminSubdivision.style.display = "unset";
                    bottomComponent.style.display = "flex";
                    bottomLeft.style.bottom = "215";
                    bottomRight.style.bottom = "215";
                    dataComponentLoadingIndicator.setAttribute("active", "");

                    let selectedFeature = response.features[0];
                    config.selected.state_name = selectedFeature.attributes["STATE_NAME"];

                    // Severe Drought conditions for n number of weeks
                    let agrQuery = "";

                    let selectedFIPS = "";
                    if (config.selected.adminAreaId === config.COUNTY_ADMIN) {
                        selectedFIPS = selectedFeature.attributes["FIPS"];
                        agrQuery = `CountyFIPS = '${selectedFIPS}'`;
                        config.qParams.severeDroughtConditions.url = config.droughtURL + "1";
                        config.qParams.historicDroughtConditions.url = config.droughtURL + "1";
                    } else if (config.selected.adminAreaId === config.STATE_ADMIN) {
                        selectedFIPS = selectedFeature.attributes["STATE_FIPS"];
                        agrQuery = `SateFIPS = '${selectedFIPS}'`;
                        config.qParams.severeDroughtConditions.url = config.droughtURL + "0";
                        config.qParams.historicDroughtConditions.url = config.droughtURL + "0";
                    }

                    config.qParams.severeDroughtConditions.q = `admin_fips = ${selectedFIPS} AND D2_D4 = 0 AND ddate <= date '${format(selectedDateObj.selectedDate, "P")}'`;
                    config.qParams.historicDroughtConditions.q = `admin_fips = ${selectedFIPS}`;
                    config.qParams.outlook.month.geometry = selectedFeature.geometry;
                    config.qParams.outlook.seasonal.geometry = selectedFeature.geometry;
                    config.qParams.agriculture.q = agrQuery;

                    // Agricultural Impact
                    QueryUtils.fetchData(config.qParams.agriculture).then(updateAgriculturalImpactComponent, ErrorHandler.hydrateErrorAlert);

                    // Monthly outlook
                    QueryUtils.fetchData(config.qParams.outlook.month).then(monthlyDroughtOutlookResponseHandler, ErrorHandler.hydrateErrorAlert);

                    // Season outlook
                    QueryUtils.fetchData(config.qParams.outlook.seasonal).then(seasonalDroughtOutlookResponseHandler, ErrorHandler.hydrateErrorAlert);

                    // Severe Drought conditions for n number of weeks
                    QueryUtils.fetchData(config.qParams.severeDroughtConditions).then(severeDroughtConditionsSuccessHandler, ErrorHandler.hydrateErrorAlert);

                    // Historic Data
                    QueryUtils.fetchData(config.qParams.historicDroughtConditions).then(historicDataQuerySuccessHandler, ErrorHandler.hydrateErrorAlert);
                } else {
                    ErrorHandler.noResponseHandler();
                }
            });
        }

        function historicDataQuerySuccessHandler(response) {
            const { features } = response;
            inputDataset = features.map(feature => {
                const { attributes } = feature;
                let date = new Date(attributes.ddate);
                return {
                    d0: attributes.d0,
                    d1: attributes.d1,
                    d2: attributes.d2,
                    d3: attributes.d3,
                    d4: attributes.d4,
                    nothing: attributes.nothing,
                    date: date,
                    d1_d4: attributes.D1_D4,
                };
            });
            inputDataset.reverse();

            let params = new URLSearchParams(location.search);
            let dateFromUrl = params.get("date") || new Date(inputDataset[inputDataset.length - 1].date).getTime();
            Chart.createChart({
                data: inputDataset,
                view: mapView
            });

            // selected date/time
            Chart.setSelectedEvent(d3.select("rect[id='" + dateFromUrl + "']"));
            let initXPosition = d3.select("rect[id='" + dateFromUrl + "']").attr("x");
            // mouse-over scrubber
            Chart.setScrubberPosition(initXPosition);
            let formattedDate = FormatUtils.getFormattedDate(new Date(parseInt(dateFromUrl)));
            d3.select(".click-scrubber-text").text(formattedDate);

            updateDroughtPercentage(response, parseInt(dateFromUrl));
            updateCurrentDroughtStatus(response);
            updateSelectedLocationComponent(response);
            dataComponentLoadingIndicator.removeAttribute("active");
        }

        function severeDroughtConditionsSuccessHandler(response) {
            let responseDate = response.features[0].attributes.ddate;
            const consecutiveWeeks = differenceInWeeks(new Date(selectedDateObj.selectedDate), new Date(responseDate)) - 1;
            let consecutiveWeeksElement = document.getElementById("consecutiveWeeks");
            consecutiveWeeksElement.innerHTML = `${consecutiveWeeks.toString()}`;
        }

        function viewStationaryHandler(response) {
            // Get the new extent of the view only when view is stationary.
            const currentExtent = mapView.extent;
            if (currentExtent) {
                const params = new URLSearchParams(location.search);
                params.set("xmin", currentExtent.xmin);
                params.set("ymin", currentExtent.ymin);
                params.set("xmax", currentExtent.xmax);
                params.set("ymax", currentExtent.ymax);
                window.history.replaceState({}, '', `${location.pathname}?${params}`);
            }
        }

        function selectedDateHandler(inputDate) {
            let endDate = new Date(inputDate);
            return {
                "selectedDate" : inputDate,
                "startDate": new Date(endDate.getTime() - (60 * 60 * 24 * 7 * 1000)),
                "endDate": endDate
            }
        }

        async function retrieveGeometryResponseHandler(response) {
            console.debug("RESPONSE", response)
            if (response.features.length > 0) {
                config.boundaryQuery.geometry = response.features[0].geometry;
                for (const graphic of mapView.graphics){
                    if (graphic.attributes === "BOUNDARY") {
                        mapView.graphics.remove(graphic);
                    }
                }

                const polygonGraphic = new Graphic({
                    geometry: response.features[0].geometry,
                    symbol: config.selectedGeographicSymbology,
                    attributes: "BOUNDARY"
                });
                mapView.graphics.add(polygonGraphic);
            } else {
                // no features
            }
            return await response;
        }

        function updateAgriculturalImpactComponent(response) {
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

            function updateLaborStatistics(node, data) {
                if (Number(data) > -1) {
                    node.innerHTML = `${Number(data).toLocaleString()}`;
                } else {
                    node.innerHTML = `No Data`;
                }
            }

            function updateAgricultureItem(node, data) {
                if (Number(data) > -1) {
                    node.innerHTML = `$${Number(data).toLocaleString()}`;
                } else {
                    node.innerHTML = `No Data`;
                }
            }

            function updateDemographicStatistics(node, data) {
                node.innerHTML = `${Number(data).toLocaleString()}`;
            }
        }

        function updateSelectedLocationComponent(response) {
            const selectedFeature = response.features[0];
            let label = `${selectedFeature.attributes["name"]}, ${config.selected.state_name}`;
            if (config.selected.adminAreaId !== config.COUNTY_ADMIN) {
                label = `${config.selected.state_name}`;
            }
            document.getElementsByClassName("selected-location")[0].innerHTML = label.toUpperCase();
        }

        /**
         * Update the monthly drought label
         * component: DROUGHT OUTLOOK
         *
         * @param response
         */
        function monthlyDroughtOutlookResponseHandler(response) {
            let monthlyOutlookDate = document.getElementById("monthlyOutlookDate");
            let monthlyOutlookLabel = document.getElementById("monthlyOutlookLabel");

            if (response.features.length > 0) {
                const features = response.features;
                if (features.length > 0) {
                    let feature = features[0];
                    monthlyOutlookDate.innerHTML = feature.attributes["Target"];
                    if (feature.attributes["FID_improv"] === 1) {
                        monthlyOutlookLabel.innerHTML = "Drought Improves";
                    } else if (feature.attributes["FID_persis"] === 1) {
                        monthlyOutlookLabel.innerHTML = "Drought Persists";
                    } else if (feature.attributes["FID_remove"] === 1) {
                        monthlyOutlookLabel.innerHTML = "Drought Removal Likely";
                    } else if (feature.attributes["FID_dev"] === 1) {
                        monthlyOutlookLabel.innerHTML = "Drought Develops";
                    }
                }
            } else {
                monthlyOutlookDate.innerHTML = "No Drought";
                monthlyOutlookLabel.innerHTML = "No Drought";
            }
        }

        /**
         * Update the seasonal drought label
         * component: DROUGHT OUTLOOK
         *
         * @param response
         */
        function seasonalDroughtOutlookResponseHandler(response) {
            let seasonalOutlookDateEle = document.getElementById("seasonalOutlookDate");
            let seasonalOutlookLabelEle = document.getElementById("seasonalOutlookLabel");

            let features = response.features;
            if (features.length > 0) {
                let feature = features[0];
                seasonalOutlookDateEle.innerHTML = feature.attributes["Target"];
                if (feature.attributes["FID_improv"] === 1) {
                    seasonalOutlookLabelEle.innerHTML = "Drought Improves";
                } else if (feature.attributes["FID_persis"] === 1) {
                    seasonalOutlookLabelEle.innerHTML = "Drought Persists";
                } else if (feature.attributes["FID_remove"] === 1) {
                    seasonalOutlookLabelEle.innerHTML = "Drought Removal Likely";
                } else if (feature.attributes["FID_dev"] === 1) {
                    seasonalOutlookLabelEle.innerHTML = "Drought Develops";
                }
            } else {
                seasonalOutlookDateEle.innerHTML = "No Drought";
                seasonalOutlookLabelEle.innerHTML = "No Drought";
            }
        }

        /**
         * Update the drought percentage of the selected area.
         * component: HISTORIC DATA
         *
         * @param droughtQueryResponse
         * @param selectedDate
         */
        function updateDroughtPercentage(droughtQueryResponse, selectedDate) {
            let { features } = droughtQueryResponse;
            let found = features.find(feature => {
                return selectedDate === feature.attributes.ddate;
            });
            let { attributes } = found;
            let currentDroughtStatusElement = document.getElementsByClassName("drought-percentage")[0];
            currentDroughtStatusElement.innerHTML = attributes["D1_D4"].toFixed(0);
        }

        /**
         * Update the drought status label.
         * component: LATEST DROUGHT CONDITIONS
         *
         * @param response
         */
        function updateCurrentDroughtStatus(response) {
            console.debug("updateCurrentDroughtStatus", response);
            let { attributes } = response.features[0];
            let drought = {
                d0 : attributes["d0"],
                d1 : attributes["d1"],
                d2 : attributes["d2"],
                d3 : attributes["d3"],
                d4 : attributes["d4"]
            };
            let condition = DataUtils.highestValueAndKey(drought);
            let key = condition["key"];
            let label = config.drought_colors[key].label;
            let color = config.drought_colors[key].color;
            if (attributes["nothing"] === 100) {
                label = config.drought_colors.nothing.label;
                color = config.drought_colors.nothing.color;
            } else if (key === "d0") {
                label = config.drought_colors[key].label;
                color = "#b19657";
            } else if (key === "d1") {
                label = config.drought_colors[key].label;
                color = "#cb9362";
            }
            let currentDroughtStatusElement = document.getElementById("drought-status");
            currentDroughtStatusElement.innerHTML = label;
            currentDroughtStatusElement.style.color = color;
        }
    });
}
