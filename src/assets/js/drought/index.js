import "../../style/index.scss";
import config from './config.json';

import { loadCss, loadModules } from 'esri-loader';

import * as AppHeaderComponent from './components/header/index';
import * as BookmarksComponent from './components/bookmarks/index';
import * as Chart from './components/charts/index';
import * as ErrorHandler from './utils/ErrorHandler';
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

window.onSignInHandler = (portal) => {
    // initialize calcite
    calcite.init();
    // esri styles
    loadCss();

    loadModules([
        "esri/WebMap",
        "esri/geometry/Point",
        "esri/layers/FeatureLayer",
        "esri/Graphic",
        "esri/geometry/Extent",
        "esri/views/MapView",
        "esri/core/watchUtils"
    ]).then(([WebMap, Point, FeatureLayer, Graphic, Extent, MapView, watchUtils]) => {

        const isMobile = Mobile.isMobileBrowser();

        // Cache DOM Nodes used by the app
        let bottomLeft = null;
        let bottomRight = null;
        let dataComponentLoadingIndicator = document.getElementById("dataComponentLoader");
        let adminSubdivision = document.getElementById("administrativeSubdivision");
        let bottomComponent = document.getElementById("bottomComponent");
        let countyButtonEle = document.getElementById("county");
        let stateButtonEle = document.getElementById("state");

        let selectedDate = null;

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


        let selectedDateObj = {};
        let inputDataset = [];

        if (isMobile) {
            config.widgetPositions.appHeader = "manual";
            config.widgetPositions.home = "bottom-right";
            config.widgetPositions.zoom = "bottom-right";
        }

        // WebMap
        let webMap = null;
        // MapView
        let mapView = null;

        // Fetch the latest date in the service
        // We will use the response to apply the correct Time Extent to the drought layer
        // This query also doubles as a check to determine if the drought feature service is operational.
        // If this query returns an error the entire app is un-usable.
        QueryUtils.fetchData({
            url: config.droughtURL + "/2?resultRecordCount=1",
            returnGeometry: false,
            orderByFields: ["ddate DESC"],
            outFields: ["ddate"],
            q: ""
        }).then(successHandler).catch(ErrorHandler.hydrateErrorAlert);

        function successHandler(response) {
            const { features } = response;
            selectedDateObj = selectedDateHandler(parseInt(params.get("date")) || features[0].attributes.ddate);

            webMap = new WebMap({
                portalItem: {
                    id: config.webMapId
                }
            });

            mapView = new MapView({
                container: "viewDiv",
                map: webMap,
                constraints: {
                    snapToZoom: true,
                    minScale: 30999535,
                    maxScale: 577791
                },
                ui: {
                    components: []
                }
            });

            webMap.when(webMapLoadedSuccessHandler, ErrorHandler.hydrateWebMapErrorAlert);
            mapView.when(viewLoadedSuccessHandler, ErrorHandler.hydrateMapViewErrorAlert);

            watchUtils.whenTrue(mapView, "stationary", viewStationaryHandler);

            let informationIcon = document.getElementsByClassName("information-icon")[0];
            calcite.addEvent(informationIcon, "click", event => {
                document.getElementsByClassName("modal-overlay")[0].style.display = "flex";
            });

            let resetAppBtnEle = document.getElementsByClassName("reset-app-btn")[0];
            calcite.addEvent(resetAppBtnEle, "click", event => {
                bottomComponent.style.display = "none";
                adminSubdivision.style.display = "none";
                for (const graphic of mapView.graphics){
                    if (graphic.attributes === "BOUNDARY") {
                        mapView.graphics.remove(graphic);
                    }
                }
            });

            bottomLeft = document.getElementsByClassName("esri-ui-bottom-left")[0];
            bottomRight = document.getElementsByClassName("esri-ui-bottom-right")[0];
        }

        function webMapLoadedSuccessHandler(response) {
            console.debug("WebMap Success", response)
        }

        function viewLoadedSuccessHandler(response) {
            console.debug("View Success", response);

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
                    let resultGeometry = event.results[0].results[0].feature.geometry;
                    let resultExtent = event.results[0].results[0].extent;
                    config.boundaryQuery.geometry = resultGeometry;
                    mapClickHandler({
                        "mapPoint": new Point({
                            "x": event.results[0].results[0].feature.geometry.x,
                            "y": event.results[0].results[0].feature.geometry.y,
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
                let visualVariables = response.renderer.visualVariables[0];
                console.debug(visualVariables);
                console.debug(visualVariables.minDataValue);
                console.debug(visualVariables.maxDataValue);

                let formatter = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    // These options are needed to round to whole numbers if that's what you want.
                    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
                    maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
                });
                document.getElementById("minValue").innerHTML = formatter.format(visualVariables.minDataValue);
                document.getElementById("maxValue").innerHTML = formatter.format(visualVariables.maxDataValue);
                document.getElementById("legendWidget").appendChild(document.getElementsByClassName("esri-legend")[0]);
            });

            mapView.ui.add("administrativeSubdivision", "bottom-left");

            response.on("click", mapClickHandler);

            //
            let params = new URLSearchParams(location.search);
            let urlExtent = new Extent({
                "xmin": params.get("xmin") || webMap.initialViewProperties.viewpoint.targetGeometry.xmin,
                "ymin": params.get("ymin") || webMap.initialViewProperties.viewpoint.targetGeometry.ymin,
                "xmax": params.get("xmax") || webMap.initialViewProperties.viewpoint.targetGeometry.xmax,
                "ymax": params.get("ymax") || webMap.initialViewProperties.viewpoint.targetGeometry.ymax,
                "spatialReference": {
                    "wkid": 3857
                }
            });
            mapView.goTo(urlExtent)
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
                "view": mapView
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

            document.getElementsByClassName("reset-chart-btn")[0].addEventListener("click", (event) => {
                let mostRecentDate = new Date(inputDataset[inputDataset.length - 1].date).getTime();
                Chart.setSelectedEvent(d3.select("rect[id='" + mostRecentDate + "']"));
                let initXPosition = d3.select("rect[id='" + mostRecentDate + "']").attr("x");
                // mouse-over scrubber
                Chart.setScrubberPosition(initXPosition);
                let formattedDate = getFormattedDate(new Date(parseInt(mostRecentDate)));
                d3.select(".click-scrubber-text").text(formattedDate);

                let endDate = new Date(inputDataset[inputDataset.length - 1].date);
                let startDate = new Date(endDate.getTime() - (60 * 60 * 24 * 7 * 1000));
                let urlSearchParams = new URLSearchParams(location.search);
                urlSearchParams.set("date", mostRecentDate.toString());
                window.history.replaceState({}, '', `${location.pathname}?${urlSearchParams}`);

                LayerUtils.removeLayers(mapView);
                LayerUtils.addLayer({
                    "url": config.droughtURL,
                    "start": startDate,
                    "end": endDate,
                    "title": config.drought_layer_name,
                    "view": mapView
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

                    // Agriculture + Population
                    let agrQuery = "";
                    if (config.selected.adminAreaId === config.COUNTY_ADMIN) {
                        config.selected.county_fips = response.features[0].attributes["FIPS"];
                        agrQuery = `CountyFIPS = '${config.selected.county_fips}'`;
                    } else if (config.selected.adminAreaId === config.STATE_ADMIN) {
                        config.selected.state_fips = response.features[0].attributes["STATE_FIPS"];
                        agrQuery = `SateFIPS = '${config.selected.state_fips}'`;
                    }
                    QueryUtils.fetchData({
                        url: config.agricultureImpactURL,
                        returnGeometry: false,
                        outFields: ["*"],
                        q: agrQuery
                    }).then(updateAgriculturalImpactComponent);


                    // Monthly outlook
                    QueryUtils.fetchData({
                        url: config.monthlyDroughtOutlookURL,
                        returnGeometry: false,
                        outFields: ["*"],
                        spatialRel: "esriSpatialRelIntersects",
                        orderByFields: ["fid_persis desc", "fid_improv desc", "fid_dev desc", "fid_remove desc"],
                        geometryType: "esriGeometryPolygon",
                        geometry: selectedFeature.geometry,
                        q: ""
                    }).then(monthlyDroughtOutlookResponseHandler, monthlyDroughtOutlookErrorHandler);


                    // Season outlook
                    QueryUtils.fetchData({
                        url: config.seasonalDroughtOutlookURL,
                        returnGeometry: false,
                        outFields: ["*"],
                        spatialRel: "esriSpatialRelIntersects",
                        orderByFields: ["fid_persis desc", "fid_improv desc", "fid_dev desc", "fid_remove desc"],
                        geometryType: "esriGeometryPolygon",
                        geometry: selectedFeature.geometry,
                        q: ""
                    }).then(seasonalDroughtOutlookResponseHandler);


                    // Drought
                    let droughtQuery = "";
                    let droughtQueryLayerId = "";
                    if (config.selected.adminAreaId === config.COUNTY_ADMIN) {
                        droughtQueryLayerId = "1";
                        droughtQuery = `admin_fips = ${config.selected.county_fips}`;
                    } else {
                        droughtQueryLayerId = "0";
                        droughtQuery = `admin_fips  = ${config.selected.state_fips}`;
                    }
                    QueryUtils.fetchData({
                        url: config.droughtURL + droughtQueryLayerId,
                        returnGeometry: false,
                        orderByFields: ["ddate DESC"],
                        outFields: ["*"],
                        q: droughtQuery
                    }).then(response => {
                        if (response.features.length > 0) {
                            let droughtData = response.features;
                            selectedDate = droughtData[0].attributes.ddate;
                            let formattedSelectedDate = format(selectedDate, "P");
                            let consecutiveWeeksQuery = "";
                            if (config.selected.adminAreaId === config.COUNTY_ADMIN) {
                                consecutiveWeeksQuery = `name = '${droughtData[0].attributes["name"]}' AND state_abbr = '${droughtData[0].attributes["state_abbr"]}' AND D2_D4 = 0 AND ddate <= date '${formattedSelectedDate}'`;
                            } else {
                                consecutiveWeeksQuery = `state_abbr = '${droughtData[0].attributes["state_abbr"]}' AND D2_D4 = 0 AND ddate <= date '${formattedSelectedDate}'`
                            }
                            QueryUtils.fetchData({
                                url: config.droughtURL + droughtQueryLayerId,
                                returnGeometry: false,
                                orderByFields: ["ddate desc"],
                                outFields: ["*"],
                                q: consecutiveWeeksQuery
                            }).then(response => {
                                let responseDate = response.features[0].attributes.ddate;
                                const consecutiveWeeks = differenceInWeeks(new Date(selectedDate), new Date(responseDate)) - 1;
                                let consecutiveWeeksElement = document.getElementById("consecutiveWeeks");
                                consecutiveWeeksElement.innerHTML = `${consecutiveWeeks.toString()}`;//${weeksLabel}`;
                            });

                            inputDataset = droughtData.map(feature => {
                                let date = new Date(feature.attributes.ddate);
                                return {
                                    d0: feature.attributes.d0,
                                    d1: feature.attributes.d1,
                                    d2: feature.attributes.d2,
                                    d3: feature.attributes.d3,
                                    d4: feature.attributes.d4,
                                    nothing: feature.attributes.nothing,
                                    date: date,
                                    d1_d4: feature.attributes.D1_D4,
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
                            let formattedDate = getFormattedDate(new Date(parseInt(dateFromUrl)));
                            d3.select(".click-scrubber-text").text(formattedDate);

                            updateDroughtStatusComponent(response, parseInt(dateFromUrl));
                            updateSelectedLocationComponent(response);
                            dataComponentLoadingIndicator.removeAttribute("active");
                        }
                    });
                } else {
                    document.getElementsByClassName("alert-title")[0].innerHTML = "Select another location please.";
                    document.getElementsByClassName("alert-message")[0].innerHTML = "Please select a location in the United States or Puerto Rico.";
                    document.getElementsByClassName("alert-link")[0].innerHTML = "";
                    document.getElementsByClassName("custom-alert")[0].setAttribute("icon", "exclamation-mark-triangle");
                    document.getElementsByClassName("custom-alert")[0].setAttribute("color", "yellow");
                    document.getElementsByClassName("custom-alert")[0].setAttribute("auto-dismiss-duration", "fast");
                    document.getElementsByClassName("custom-alert")[0].setAttribute("active", "true");
                    document.getElementsByClassName("custom-alert")[0].setAttribute("aria-hidden", "true");
                }
            });
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

        function highestValueAndKey(obj) {
            let [highestItems] = Object.entries(obj).sort(([ ,v1], [ ,v2]) => v2 - v1);
            return {
                "key": highestItems[0],
                "value": highestItems[1]
            }
        }

        async function retrieveGeometryResponseHandler(response) {
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
            if (response.features.length > 0) {
                const selectedFeature = response.features[0];
                let label = `${selectedFeature.attributes["name"]}, ${config.selected.state_name}`;
                if (config.selected.adminAreaId !== config.COUNTY_ADMIN) {
                    label = `${config.selected.state_name}`;
                }
                document.getElementsByClassName("selected-location")[0].innerHTML = label;
            }
        }

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
                        monthlyOutlookLabel.style.color = "#87b178";
                    } else if (feature.attributes["FID_persis"] === 1) {
                        monthlyOutlookLabel.innerHTML = "Drought Persists";
                        monthlyOutlookLabel.style.color = "#6b4628";
                    } else if (feature.attributes["FID_remove"] === 1) {
                        monthlyOutlookLabel.innerHTML = "Drought Removal Likely";
                        monthlyOutlookLabel.style.color = "#78a0b1";
                    } else if (feature.attributes["FID_dev"] === 1) {
                        monthlyOutlookLabel.innerHTML = "Drought Develops";
                        monthlyOutlookLabel.style.color = "#6b4628";
                    }
                }
            } else {
                monthlyOutlookDate.innerHTML = "No Data";
                monthlyOutlookLabel.innerHTML = "No Data";
            }
        }

        function monthlyDroughtOutlookErrorHandler(error) {
            console.debug("error", error);
        }

        function seasonalDroughtOutlookResponseHandler(response) {
            let seasonalOutlookDateEle = document.getElementById("seasonalOutlookDate");
            let seasonalOutlookLabelEle = document.getElementById("seasonalOutlookLabel");
            let features = response.features;
            if (features.length > 0) {
                let feature = features[0];
                seasonalOutlookDateEle.innerHTML = feature.attributes["Target"];
                if (feature.attributes["FID_improv"] === 1) {
                    seasonalOutlookLabelEle.innerHTML = "Drought Improves";
                    seasonalOutlookLabelEle.style.color = "#87b178";
                } else if (feature.attributes["FID_persis"] === 1) {
                    seasonalOutlookLabelEle.innerHTML = "Drought Persists";
                    seasonalOutlookLabelEle.style.color = "#6b4628";
                } else if (feature.attributes["FID_remove"] === 1) {
                    seasonalOutlookLabelEle.innerHTML = "Drought Removal Likely";
                    seasonalOutlookLabelEle.style.color = "#78a0b1";
                } else if (feature.attributes["FID_dev"] === 1) {
                    seasonalOutlookLabelEle.innerHTML = "Drought Develops";
                    seasonalOutlookLabelEle.style.color = "#6b4628";
                }
            } else {
                seasonalOutlookDateEle.innerHTML = "No Data";
                seasonalOutlookLabelEle.innerHTML = "No Data";
            }
        }

        function updateDroughtStatusComponent(droughtQueryResponse, selectedDate) {
            let { features } = droughtQueryResponse;
            let found = features.find(feature => {
                return selectedDate === feature.attributes.ddate;
            });
            let { attributes } = found;
            let currentDroughtStatusElement = document.getElementsByClassName("drought-status")[0];
            currentDroughtStatusElement.innerHTML = attributes["D1_D4"];
        }

        function getFormattedDate(date) {
            return (date.getMonth() > 8 ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' + ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' + date.getFullYear();
        }
    });
}
