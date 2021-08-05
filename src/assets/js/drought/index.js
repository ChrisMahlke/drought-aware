import "../../style/index.scss";
import config from './config.json';

import { loadCss, loadModules } from 'esri-loader';

import * as AppHeaderComponent from './components/header/index';
import * as BookmarksComponent from './components/bookmarks/index';
import * as ErrorHandler from './utils/ErrorHandler';
import * as HomeComponent from './components/home/index';
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
                    minScale: 30999535
                },
                ui: {
                    components: []
                }
            });

            webMap.when(webMapLoadedSuccessHandler, ErrorHandler.hydrateWebMapErrorAlert);
            mapView.when(viewLoadedSuccessHandler, ErrorHandler.hydrateMapViewErrorAlert);

            /*watchUtils.watch(mapView, "resizing", (resizing) => {
                console.debug("resizing", resizing);
            });
            watchUtils.when(webMap, "loadStatus", (loadStatus) => {
                console.debug("LOAD STATUS", loadStatus);
            });
            watchUtils.whenTrue(mapView, "updating", (response) => {
                console.debug("UPDATING", response);
            });
            watchUtils.whenTrue(mapView, "ready", (ready) => {
                console.debug("READY", ready);
            });
            watchUtils.when(mapView, "animation", function(animation) {
                console.debug("1", animation.state); // prints out "running"
                animation.when(function(animation) {
                    console.debug("2", animation.state); // prints out "finished"
                })
                    .catch(function(animation) {
                        console.debug("3", animation.state); // prints out "stopped"
                    });
            });*/

            watchUtils.whenTrue(mapView, "stationary", viewStationaryHandler);

            let informationIcon = document.getElementsByClassName("information-icon")[0];
            calcite.addEvent(informationIcon, "click", function (event) {
                document.getElementsByClassName("modal-overlay")[0].style.display = "flex";
            })

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
            })
            // app header
            AppHeaderComponent.init({
                view: response,
                position: config.widgetPositions.appHeader
            });
            // legend
            LegendComponent.init({
                view: response,
                position: config.widgetPositions.legend
            });
            // Administrative level toggle
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

            addLayer({
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

            document.getElementsByClassName("reset-chart-icon-container")[0].addEventListener("click", (event) => {
                selId = new Date(inputDataset[inputDataset.length - 1].date).getTime();
                selectedEvent = d3.select("rect[id='" + selId + "']");
                let initXPosition = d3.select("rect[id='" + selId + "']").attr("x");
                // mouse-over scrubber
                clickScrubber.attr("transform", "translate(" + parseFloat(initXPosition) + "," + 20 + ")");
                clickScrubber.style("display", null);
                clickScrubber.style("opacity", "1");
                let formattedDate = getFormattedDate(new Date(parseInt(selId)));
                d3.select(".click-scrubber-text").text(formattedDate);

                let endDate = new Date(inputDataset[inputDataset.length - 1].date);
                let startDate = new Date(endDate.getTime() - (60 * 60 * 24 * 7 * 1000));
                let urlSearchParams = new URLSearchParams(location.search);
                urlSearchParams.set("date", selId.toString());
                window.history.replaceState({}, '', `${location.pathname}?${urlSearchParams}`);

                let layersToRemove = mapView.map.layers.filter(lyr => {
                    if (lyr.title === config.drought_layer_name) {
                        return lyr;
                    }
                });
                mapView.map.removeMany(layersToRemove.items);
                addLayer({
                    "url": config.droughtURL,
                    "start": startDate,
                    "end": endDate,
                    "title": config.drought_layer_name,
                    "view": mapView
                })
            });
        }

        function addLayer(params) {
            const layer = new FeatureLayer({
                url: params.url,
                layerId: 2,
                timeExtent: {
                    start: params.start,
                    end: params.end
                },
                opacity: 0.65,
                title: params.title,
                useViewTime: false
            });
            params.view.map.add(layer, 2);
            params.view.popup = null;
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
                    }).then(monthlyDroughtOutlookResponseHandler);


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
                                let weeksLabel = `Weeks`;
                                if (consecutiveWeeks < 1) {
                                    consecutiveWeeksElement.style.color = "#393939";
                                } else if (consecutiveWeeks > 0 && consecutiveWeeks < 8) {
                                    weeksLabel = (consecutiveWeeks < 2) ? "Week" : "Weeks";
                                    consecutiveWeeksElement.style.color = "#e4985a";
                                } else if (consecutiveWeeks > 8) {
                                    weeksLabel = (consecutiveWeeks < 2) ? "Week" : "Weeks";
                                    consecutiveWeeksElement.style.color = "#b24543";
                                }
                                consecutiveWeeksElement.innerHTML = `${consecutiveWeeks.toString()} Consecutive ${weeksLabel}`;
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
                                    date: date//new Date(Date.UTC(year, month, day))
                                };
                            });
                            inputDataset.reverse();

                            let params = new URLSearchParams(location.search);
                            let selId = params.get("date") || new Date(inputDataset[inputDataset.length - 1].date).getTime();
                            createChart({
                                data: inputDataset,
                                selected: selId
                            });

                            // selected date/time
                            selectedEvent = d3.select("rect[id='" + selId + "']");
                            let initXPosition = d3.select("rect[id='" + selId + "']").attr("x");
                            // mouse-over scrubber
                            clickScrubber.attr("transform", "translate(" + parseFloat(initXPosition) + "," + 20 + ")");
                            clickScrubber.style("display", null);
                            clickScrubber.style("opacity", "1");
                            let formattedDate = getFormattedDate(new Date(parseInt(selId)));
                            d3.select(".click-scrubber-text").text(formattedDate);

                            updateCurrentDroughtStatus(response);
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
                document.getElementsByClassName("drought-status-location-label")[0].innerHTML = label;
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

        function updateCurrentDroughtStatus(response) {
            let mostRecentFeature = response.features[0].attributes;
            let drought = {
                d0 : mostRecentFeature["d0"],
                d1 : mostRecentFeature["d1"],
                d2 : mostRecentFeature["d2"],
                d3 : mostRecentFeature["d3"],
                d4 : mostRecentFeature["d4"]
            };
            let condition = highestValueAndKey(drought);
            let key = condition["key"];
            let label = "";
            let color = "";
            if (mostRecentFeature["nothing"] === 100) {
                label = config.drought_colors.nothing.label;
                color = config.drought_colors.nothing.color;
            } else if (key === "d0") {
                label = config.drought_colors[key].label;
                color = "#b19657";
            } else if (key === "d1") {
                label = config.drought_colors[key].label;
                color = "#cb9362";
            } else {
                label = config.drought_colors[key].label;
                color = config.drought_colors[key].color;
            }
            let currentDroughtStatusElement = document.getElementsByClassName("drought-status-label")[0];
            currentDroughtStatusElement.innerHTML = label;
            currentDroughtStatusElement.style.color = color;
            document.getElementById("selectedDate").innerHTML = format(new Date(mostRecentFeature["ddate"]), "PPP");
        }

        function getFormattedDate(date) {
            return (date.getMonth() > 8 ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' + ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' + date.getFullYear();
        }

        const keys = Object.keys(config.drought_colors);
        const keyColors = [
            config.drought_colors.d4.color,
            config.drought_colors.d3.color,
            config.drought_colors.d2.color,
            config.drought_colors.d1.color,
            config.drought_colors.d0.color,
            "rgb(255, 255, 255, 0.0)"
        ];
        let selectedDate = null;
        let selId = null;
        let barChartMargin = null;
        let barChartWidth = null;
        let barChartHeight = null;
        let barChartX = null;
        let barChartSvg = null;
        let barChartPath = null;
        let gx_bar = null;
        let barChartXAxis = null;
        let barChartYAxis = null;
        let scrubber = null;
        let clickScrubber = null;
        let selectedEvent = null;
        let series = null;
        let colors = null;
        let chartNode = document.getElementById("stackedBarchart");
        const createChart = (input) => {
            let inputDataset = input.data;

            // TODO
            barChartHeight = 145;
            barChartWidth = chartNode.offsetWidth;
            barChartMargin = {
                top: 25,
                right: 0,
                bottom: 30,
                left: 35
            };

            // TODO
            // Clear previous svg
            d3.select("#stackedBarchart").selectAll("svg").remove();
            // stack
            series = d3.stack().keys(keys)(inputDataset)
            // colors
            colors = d3.scaleOrdinal().domain(keys).range(keyColors);

            barChartX = d3.scaleBand()
                .domain(inputDataset.map(d => d.date))
                .range([barChartMargin.left, barChartWidth - barChartMargin.right])
                .padding(0.1);

            let barChartY = d3.scaleLinear()
                .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
                .range([barChartHeight - barChartMargin.bottom, barChartMargin.top]);

            barChartXAxis = (g, x) => g
                .attr("transform", `translate(0,${barChartHeight - barChartMargin.bottom})`)
                .call(d3.axisBottom(x).tickValues(x.domain()
                    .filter((e,i) => i % Math.round(barChartWidth/8) === 0))
                    .tickFormat(d3.timeFormat("%m/%Y")));

            barChartYAxis = (g, y) => g
                .attr("transform", `translate(${barChartMargin.left},0)`)
                .call(d3.axisLeft(y).ticks(5).tickFormat(formatTick));

            let barChartExtent = [
                [barChartMargin.left, barChartMargin.top],
                [barChartWidth - barChartMargin.right, barChartHeight - barChartMargin.top]
            ];

            const barChartZooming = d3.zoom()
                .scaleExtent([1, 64])
                .translateExtent(barChartExtent)
                .extent(barChartExtent)
                .on("zoom", barChartZoomed);

            barChartSvg = d3.select("#stackedBarchart")
                .append("svg")
                .attr("width", barChartWidth)
                .attr("height", barChartHeight)
                .on("mouseover", chartMouseOverHandler)
                .on("mouseout", chartMouseOutHandler);

            barChartSvg.append("clipPath")
                .attr("id", "chart-clip")
                .append("rect")
                .attr("x", barChartMargin.left)
                .attr("y", barChartMargin.top)
                .attr("width", barChartWidth - barChartMargin.left - barChartMargin.right)
                .attr("height", barChartHeight - barChartMargin.top - barChartMargin.bottom);

            barChartPath = barChartSvg.append("g")
                .attr("class", "bars")
                .selectAll("g")
                .data(series)
                .enter().append("g")
                .attr("clip-path","url(#chart-clip)")
                .attr("fill", ({key}) => colors(key))
                .selectAll("rect")
                .data(d => {
                    return d;
                })
                .enter().append("rect")
                .attr("x", d => {
                    return barChartX(d.data.date);
                })
                .attr("y", d => {
                    return barChartY(d[1]);
                })
                .attr("id", d => {
                    return new Date(d.data.date).getTime();
                })
                .attr("height", d => {
                    return barChartY(d[0]) - barChartY(d[1]);
                })
                .attr("width", 1)
                .on("mousemove", chartMouseMoveHandler)
                .on("click", chartMouseClickHandler);

            gx_bar = barChartSvg.append("g")
                .call(barChartXAxis, barChartX);

            barChartSvg.append("g")
                .call(barChartYAxis, barChartY);

            barChartSvg.call(barChartZooming);

            scrubber = barChartSvg.append("g")
                .attr("class", "scrubber")
                .style("display", "none");

            scrubber.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", 0)
                .attr("y2", 120)
                .attr("stroke-width", .5)
                .attr("stroke", "#000000")
                .style("opacity", 1.0);

            clickScrubber = barChartSvg.append("g")
                .attr("class", "click-scrubber")
                .style("display", "none");

            clickScrubber.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", 0)
                .attr("y2", 100)
                .attr("stroke-width", 1.0)
                .attr("stroke", "#000000")
                .style("opacity", 1.0);

            clickScrubber.append("rect")
                .attr("width", 100)
                .attr("height", 20)
                .attr("transform", "translate(-50, -20)")
                .attr("id", "click-scrubber-text-container")
                .style("fill", "#454545");

            clickScrubber.append("text")
                .attr("class", "click-scrubber-text")
                .attr("dy", "-5")
                .attr("text-anchor", "middle")
                .style("font-size", '.75rem')
                .style("fill", '#fff');

            d3.select("#click-scrubber-text-container").attr("transform", "translate(-" + 100 + ",-" + 20 + ")");
            d3.select(".click-scrubber-text").attr("transform", "translate(-" + 50 + ",0)");

            function formatTick(d) {
                return this.parentNode.nextSibling ? `\xa0${d}` : `${d}%`;
            }

            return barChartSvg.node();
        }

        function chartMouseOverHandler(event) {
            scrubber.style("display", "block");
            d3.select("#areaChartScrubberContent").style("display", "block");
        }

        function chartMouseOutHandler(event) {
            scrubber.style("display", "none");
            d3.select("#areaChartScrubberContent").style("display", "none");
        }

        function chartMouseMoveHandler(event) {
            let d = d3.select(this).data()[0]
            let currentXPosition = d3.pointer(event)[0];
            let pageX = event.pageX;
            if ((window.innerWidth - pageX) < 150) {
                pageX = pageX - 150;
            }
            let formattedDate = getFormattedDate(d.data.date);
            d3.select("#areaChartScrubberContentDate").html(formattedDate);
            d3.select("#areaChartScrubberContent_d4").html(`${Math.round(d.data.d4).toString()} %`);
            d3.select("#areaChartScrubberContent_d3").html(`${Math.round(d.data.d3).toString()} %`);
            d3.select("#areaChartScrubberContent_d2").html(`${Math.round(d.data.d2).toString()} %`);
            d3.select("#areaChartScrubberContent_d1").html(`${Math.round(d.data.d1).toString()} %`);
            d3.select("#areaChartScrubberContent_d0").html(`${Math.round(d.data.d0).toString()} %`);

            scrubber.attr("transform", "translate(" + (currentXPosition - 2) + "," + 0 + ")");
            d3.select("#areaChartScrubberContent")
                .style("position", "absolute")
                .style("left", (pageX - 2) + "px")
                .style("top", "-90px");
        }

        function chartMouseClickHandler(event) {
            selectedEvent = event;
            let d = d3.select(this).data()[0];

            selId = new Date(d.data.date).getTime();

            d3.select(".click-scrubber-text").text(getFormattedDate(d.data.date));

            let pageX = event.pageX;
            if ((window.innerWidth - pageX) < 60) {
                d3.select("#click-scrubber-text-container").attr("transform", "translate(-" + 100 + ",-" + 20 + ")");
                d3.select(".click-scrubber-text").attr("transform", "translate(-" + 50 + ",0)");
            } else {
                d3.select("#click-scrubber-text-container").attr("transform", "translate(-" + 50 + ",-" + 20 + ")");
                d3.select(".click-scrubber-text").attr("transform", "translate(0,0)");
            }

            let currentXPosition = d3.pointer(event)[0];
            clickScrubber.attr("transform", "translate(" + currentXPosition + "," + 20 + ")");
            clickScrubber.style("display", null);
            clickScrubber.style("opacity", "1");

            let endDate = new Date(d.data.date);
            let startDate = new Date(endDate.getTime() - (60 * 60 * 24 * 7 * 1000));
            let urlSearchParams = new URLSearchParams(location.search);
            urlSearchParams.set("date", selId.toString());
            window.history.replaceState({}, '', `${location.pathname}?${urlSearchParams}`);

            let layersToRemove = mapView.map.layers.filter(lyr => {
                if (lyr.title === config.drought_layer_name) {
                    return lyr;
                }
            });
            mapView.map.removeMany(layersToRemove.items);
            addLayer({
                "url": config.droughtURL,
                "start": startDate,
                "end": endDate,
                "title": config.drought_layer_name,
                "view": mapView
            });
        }

        function barChartZoomed(event) {
            barChartX.range([barChartMargin.left, barChartWidth - barChartMargin.right].map(d =>
                event.transform.applyX(d)
            ));
            barChartSvg.selectAll(".bars rect").attr("x", d => barChartX(d.data.date)).attr("width", barChartX.bandwidth());
            gx_bar.call(barChartXAxis, barChartX);

            if (selectedEvent !== null) {
                let tmp = 0;
                if (selectedEvent.target !== undefined ) {
                    tmp = selectedEvent.target.getAttribute("x");
                } else {
                    tmp = selectedEvent.attr("x");
                }
                d3.selectAll(".click-scrubber").attr("transform", "translate(" + tmp + "," + 20 + ")");
            }
        }












        function reportWindowSize(event) {
            //console.debug(areaChartDimensions.offsetWidth);
            /*createChart(droughtData);
            selectedDate = selectedLocation.attributes.ddate;
            let date = new Date(selectedDate);
            let formattedDate = ((date.getMonth() > 8) ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' + ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' + date.getFullYear();
            let currentXPosition = d3.pointer(event)[0];
            d3.select(".click-scrubber-text").text(formattedDate);
            clickScrubber.attr("transform", "translate(" + currentXPosition + "," + 20 + ")");
            clickScrubber.style("display", null);
            clickScrubber.style("opacity", "1");*/
        }

        window.onresize = reportWindowSize;
    });
}
