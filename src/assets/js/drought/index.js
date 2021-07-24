import "../../style/index.scss";
import jsonResponse from './data.json';
import config from './config.json';

import { loadCss, loadModules } from 'esri-loader';

import * as calcite from "calcite-web";
import * as d3 from "d3";
import { differenceInWeeks, format } from 'date-fns'

window.onSignInHandler = (portal) => {
    // initialize calcite
    calcite.init();
    // esri styles
    loadCss();

    loadModules([
        "esri/Map",
        "esri/WebMap",
        "esri/geometry/Point",
        "esri/layers/FeatureLayer",
        "esri/TimeExtent",
        "esri/Graphic",
        "esri/geometry/Extent",
        "esri/views/MapView",
        "esri/tasks/QueryTask",
        "esri/tasks/support/Query",
        "esri/core/watchUtils",
        "esri/widgets/Legend",
        "esri/widgets/Home",
        "esri/widgets/Search",
        "esri/widgets/Zoom",
    ]).then(([Map, WebMap, Point, FeatureLayer, TimeExtent, Graphic, Extent,
                 MapView, QueryTask, Query,
                 watchUtils, Legend, Home, Search, Zoom]) => {

        // DOM nodes
        let countyButtonEle = document.getElementById("county");
        let stateButtonEle = document.getElementById("state");

        // The URLSearchParams spec defines an interface and convenience methods for working with the query string of a
        // URL (e.g. everything after "?"). This means no more regex'ing and string splitting URLs!
        let params = new URLSearchParams(location.search);
        // url params
        let selectedX = parseInt(params.get("x"));
        let selectedY = parseInt(params.get("y"));
        // selected admin
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

        let webmap = new WebMap({
            portalItem: {
                id: config.webMapId
            }
        });

        let mapView = new MapView({
            container: "viewDiv",
            map: webmap,
            padding: {
                bottom: 215
            },
            ui: {
                components: []
            }
        });
        mapView.popup = null;
        mapView.on("click", mapClickHandler);

        webmap.load()
            .then(function() {
                // load the basemap to get its layers created
                console.debug("Basemap loaded");
                return webmap.basemap.load();
            })
            .then(function() {
                // grab all the layers and load them
                const allLayers = webmap.allLayers;
                const promises = allLayers.map(function(layer) {
                    return layer.load();
                });
                console.debug("Layers loaded");
                return Promise.all(promises.toArray());
            })
            .then(function(layers) {
                console.debug("All layers loaded");
                let agrLayer = layers.filter(layer => {
                    return layer.title === "TotalAgSales Centroids - copy";
                });

                console.debug(agrLayer)

                /*let legendWidget = new Legend({
                    view: mapView,
                    layerInfos: [{
                        layer: agrLayer[0]
                    }]
                });*/

                const bookmarks = webmap.bookmarks.items;
                const bookmarksNavEle = document.getElementsByClassName("bookmarks-nav")[0];
                bookmarks.forEach(bookmark => {
                    let bookmarkEle = document.createElement("div");
                    bookmarkEle.setAttribute("class", "btn btn-grouped btn-small btn-white bookmark-btn");
                    bookmarkEle.setAttribute("id", bookmark.uid);
                    bookmarkEle.innerHTML = bookmark.name;
                    bookmarksNavEle.appendChild(bookmarkEle);
                });
                bookmarksNavEle.addEventListener("click", event => {
                    bookmarks.forEach(bookmark => {
                        if (bookmark.uid === event.target.id) {
                            mapView.goTo(bookmark.extent)
                                .catch(function(error) {
                                    if (error.name !== "AbortError") {
                                        console.error(error);
                                    }
                                });
                        }
                    });
                });

                const homeWidget = new Home({
                    view: mapView
                });

                const zoomWidget = new Zoom({
                    view: mapView
                });

                const searchWidget = new Search({
                    view: mapView,
                    resultGraphicEnabled: false
                });
                searchWidget.on("search-complete", event => {
                    console.debug("search-complete", event);
                    let resultGeometry = event.results[0].results[0].feature.geometry;
                    let resultExtent = event.results[0].results[0].extent;
                    config.boundaryQuery.geometry = resultGeometry;
                    mapClickHandler(null);
                    mapView.view.goTo(resultGeometry)
                        .catch(function(error) {
                            if (error.name !== "AbortError") {
                                console.error(error);
                            }
                        });
                });

                mapView.ui.add("bookmark-component", "");
                mapView.ui.add(zoomWidget, {
                    position: "top-left"
                });
                mapView.ui.add(homeWidget, {
                    position: "top-left"
                });
                mapView.ui.add(searchWidget, {
                    position: ""
                });
                mapView.ui.add("app-title-component", "top-right");
                mapView.ui.add("administrative-subdivision", "bottom-left");

                let urlExtent = new Extent({
                    "xmin": params.get("xmin") || -14464636.127431296,
                    "ymin": params.get("ymin") || 3973666.0196191105,
                    "xmax": params.get("xmax") || -7028842.015851326,
                    "ymax": params.get("ymax") || 6414758.95493385,
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

                // fetch the latest date in the service
                fetchData({
                    url: config.droughtURL + "/2?resultRecordCount=1",
                    returnGeometry: false,
                    orderByFields: ["ddate DESC"],
                    outFields: ["ddate"],
                    q: ""
                }).then(response => {
                    if (response.features.length > 0) {
                        const features = response.features;
                        const selectedChartDate = parseInt(params.get("date")) || features[0].attributes.ddate;
                        const endDate = new Date(selectedChartDate);
                        const startDate = new Date(endDate.getTime() - (60 * 60 * 24 * 7 * 1000));

                        const layer = new FeatureLayer({
                            url: config.droughtURL,
                            layerId: 2,
                            timeExtent: {
                                start: startDate,
                                end: endDate
                            },
                            opacity: 0.65,
                            title: config.drought_layer_name,
                            useViewTime: false
                        });
                        mapView.map.add(layer, 2);
                        mapView.popup = null;

                        updateSelectedDateLabel(selectedChartDate);

                        //createChart(features);
                    }
                });
            })
            .catch(function(error) {
                console.debug(error);
            });

        // Watch view's stationary property for becoming true.
        watchUtils.whenTrue(mapView, "stationary", function() {
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
        });

        if (!isNaN(selectedX) && !isNaN(selectedY)) {
            mapClickHandler(null);
        }

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
            });
        });

        function mapClickHandler(event) {
            // show visualization container
            calcite.removeClass(document.getElementById("administrative-subdivision"), "hide");
            calcite.removeClass(document.getElementById("bottom-component"), "hide");
            document.getElementById("dataComponentLoader").setAttribute("active", "");

            // TODO
            if (event !== null) {
                config.boundaryQuery.geometry = event.mapPoint;
                const params = new URLSearchParams(location.search);
                params.set("x", event.mapPoint.x);
                params.set("y", event.mapPoint.y);
                window.history.replaceState({}, '', `${location.pathname}?${params}`);
            }

            // apply geometry
            fetchData(config.boundaryQuery).then(retrieveGeometryResponseHandler).then(response => {
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
                fetchData({
                    url: config.agricultureImpactURL,
                    returnGeometry: false,
                    outFields: ["*"],
                    q: agrQuery
                }).then(updateAgriculturalImpactComponent);

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
                fetchData({
                    url: config.droughtURL + droughtQueryLayerId,
                    returnGeometry: false,
                    orderByFields: ["ddate DESC"],
                    outFields: ["*"],
                    q: droughtQuery
                }).then(response => {
                    if (response.features.length > 0) {
                        let features = response.features;
                        selectedDate = response.features[0].attributes.ddate;
                        let formattedSelectedDate = format(selectedDate, "P");
                        let consecutiveWeeksQuery = "";
                        if (config.selected.adminAreaId === config.COUNTY_ADMIN) {
                            consecutiveWeeksQuery = `name = '${features[0].attributes["name"]}' AND state_abbr = '${features[0].attributes["state_abbr"]}' AND D2_D4 = 0 AND ddate <= date '${formattedSelectedDate}'`;
                        } else {
                            consecutiveWeeksQuery = `state_abbr = '${features[0].attributes["state_abbr"]}' AND D2_D4 = 0 AND ddate <= date '${formattedSelectedDate}'`
                        }
                        fetchData({
                            url: config.droughtURL + droughtQueryLayerId,
                            returnGeometry: false,
                            orderByFields: ["ddate desc"],
                            outFields: ["*"],
                            q: consecutiveWeeksQuery
                        }).then(response => {
                            let responseDate = response.features[0].attributes.ddate;
                            const consecutiveWeeks = differenceInWeeks(new Date(selectedDate), new Date(responseDate)) - 1;

                            let consecutiveWeeksElement = document.getElementById("consecutiveWeeks");
                            consecutiveWeeksElement.innerHTML = `${consecutiveWeeks.toString()} weeks`;
                            if (consecutiveWeeks < 1) {
                                consecutiveWeeksElement.style.color = "#393939";
                            } else if (consecutiveWeeks > 0 && consecutiveWeeks < 8) {
                                consecutiveWeeksElement.style.color = "#e4985a";
                            } else if (consecutiveWeeks > 8) {
                                consecutiveWeeksElement.style.color = "#b24543";
                            }
                        });
                        createChart(features);
                        updateCurrentDroughtStatus(response);
                        updateSelectedLocationComponent(response);
                        document.getElementById("dataComponentLoader").removeAttribute("active");
                    }
                });

                // Monthly outlook
                fetchData({
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
                fetchData({
                    url: config.seasonalDroughtOutlookURL,
                    returnGeometry: false,
                    outFields: ["*"],
                    spatialRel: "esriSpatialRelIntersects",
                    orderByFields: ["fid_persis desc", "fid_improv desc", "fid_dev desc", "fid_remove desc"],
                    geometryType: "esriGeometryPolygon",
                    geometry: selectedFeature.geometry,
                    q: ""
                }).then(seasonalDroughtOutlookResponseHandler);
            });
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
            } else {
                label = config.drought_colors[key].label;
                color = config.drought_colors[key].color;
            }
            let currentDroughtStatusElement = document.getElementsByClassName("drought-status-label")[0];
            currentDroughtStatusElement.innerHTML = label;
            currentDroughtStatusElement.style.color = color;
            document.getElementById("selectedDate").innerHTML = format(new Date(mostRecentFeature["ddate"]), "PPP");
        }

        async function fetchData(params) {
            return await queryService(params);
        }

        function queryService(params) {
            let queryTask = new QueryTask({
                url: params.url
            });
            let query = new Query();
            query.returnGeometry = params.returnGeometry;
            query.outFields = params.outFields;
            query.orderByFields = params.orderByFields;
            query.geometry = params.geometry;
            query.inSR = 102003;
            query.where = params.q;
            return queryTask.execute(query);
        }

        function updateSelectedDateLabel(date) {
            const dateObj = new Date(date);
            document.getElementById("selectedDate").innerHTML = format(dateObj, "PPP");
        }

        const areaChartHeight = 150;
        const areaChartWidth = 800;
        const areaChartMargin = {
            top: 20,
            right: 0,
            bottom: 30,
            left: 30
        };
        const keys = ["d4", "d3", "d2", "d1", "d0"];
        const keyColors = ["#aa3332", "#dc6f4d", "#eaa771", "#ecd092", "#eee1b4"];
        let selectedDate = null;
        let selectedLocation = null;
        function createChart(data) {
            if (selectedDate) {
                d3.select("#areaChart").selectAll("svg").remove();
                try {
                    const collection = new Map();
                    let inputDataset = [];
                    inputDataset = data.map(feature => {
                        collection.set(new Date(feature.attributes.ddate).toDateString(), feature);
                        return {
                            d0: feature.attributes.d0,
                            d1: feature.attributes.d1,
                            d2: feature.attributes.d2,
                            d3: feature.attributes.d3,
                            d4: feature.attributes.d4,
                            date: feature.attributes.ddate
                        };
                    });

                    let series = d3.stack().keys(keys)(inputDataset)

                    let colors = d3.scaleOrdinal()
                        .domain(keys)
                        .range(keyColors);

                    let area = (inputDataset, x) => d3.area()
                        .curve(d3.curveNatural)
                        .x(d => x(d.data.date))
                        .y0(d => areaChartY(d[0]))
                        .y1(d => areaChartY(d[1]));

                    let areaChartX = d3.scaleUtc()
                        .domain(d3.extent(inputDataset, d => d.date))
                        .range([areaChartMargin.left, areaChartWidth - areaChartMargin.right]);

                    let areaChartY = d3.scaleLinear()
                        .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
                        .range([areaChartHeight - areaChartMargin.bottom, areaChartMargin.top]);

                    let areaChartXAxis = (g, x) => g
                        .attr("transform", `translate(0,${areaChartHeight - areaChartMargin.bottom})`)
                        .call(d3.axisBottom(x)
                            .ticks(areaChartWidth / 60).tickSizeOuter(0));

                    let areaChartYAxis = (g, y) => g
                        .attr("transform", `translate(${areaChartMargin.left},0)`)
                        .call(d3.axisLeft(y).ticks(5));

                    let areaChartExtent = [
                        [areaChartMargin.left, areaChartMargin.top],
                        [areaChartWidth - areaChartMargin.right, areaChartHeight - areaChartMargin.top]
                    ];

                    const areaChartZooming = d3.zoom()
                        .scaleExtent([1, 64])
                        .translateExtent(areaChartExtent)
                        .extent(areaChartExtent)
                        .on("zoom", areaChartZoomed);

                    let areaChartPath = null;
                    let gx_area = null;
                    let xz_area = areaChartX;

                    const areaChart = () => {

                        let areaChartSvg = d3.select("#areaChart")
                            .append("svg")
                            .attr("width", areaChartWidth)
                            .attr("height", areaChartHeight);

                        areaChartSvg.append("clipPath")
                            .attr("id", "areaChart-clip")
                            .append("rect")
                            .attr("x", areaChartMargin.left)
                            .attr("y", areaChartMargin.top)
                            .attr("width", areaChartWidth - areaChartMargin.left - areaChartMargin.right)
                            .attr("height", areaChartHeight - areaChartMargin.top - areaChartMargin.bottom);


                        areaChartPath = areaChartSvg.append("g")
                            .selectAll("path")
                            .data(series)
                            .join("path")
                            .attr("clip-path", "url(#areaChart-clip)")
                            .attr("fill", ({key}) => colors(key))
                            .attr("d", area(inputDataset, areaChartX));

                        gx_area = areaChartSvg.append("g")
                            .call(areaChartXAxis, areaChartX);

                        areaChartSvg.append("g")
                            .call(areaChartYAxis, areaChartY);


                        let scrubber = areaChartSvg.append("g")
                            .attr("class", "scrubber")
                            .style("display", "none");
                        scrubber.append("line")
                            .attr("x1", 0)
                            .attr("y1", 0)
                            .attr("x2", 0)
                            .attr("y2", 100)
                            .style("opacity", 1.0)
                            .attr("stroke-width", 1)
                            .attr("stroke", "#232323");

                        d3.select("#areaChartScrubberContent")
                            .style("position", "relative")
                            .style("left", "50px")
                            .style("top", "-195px");

                        let clickScrubber = areaChartSvg.append("g")
                            .attr("class", "click-scrubber")
                            .style("display", "none");
                        clickScrubber.append("line")
                            .attr("x1", 0)
                            .attr("y1", 0)
                            .attr("x2", 0)
                            .attr("y2", 100)
                            .style("opacity", 1.0)
                            .attr("stroke-width", 1)
                            .attr("stroke", "#000000");
                        clickScrubber.append("rect")
                            .attr("width", 100)
                            .attr("height", 20)
                            .attr("transform", "translate(-50, -20)")
                            .attr("class", "click-scrubber-text-container")
                            .style("fill", "#454545");
                        clickScrubber.append("text")
                            .attr('class', "click-scrubber-text")
                            .attr("dy", "-5")
                            .attr("text-anchor", "middle")
                            .style('font-size', '.75rem')
                            .style('fill', '#fff');

                        let chartSVG = d3.select("#areaChart svg");
                        let mouseG = chartSVG.append("g")
                            .attr("class", "mouse-over-effects");
                        mouseG.append('svg:rect') // append a rect to catch mouse movements on canvas
                            .attr('width', areaChartWidth) // can't catch mouse events on a g element
                            .attr('height', areaChartHeight)
                            .attr('fill', 'none')
                            .attr('pointer-events', 'all')
                            .on("mouseover", function (event) {
                                scrubber.style("display", "block");
                                d3.select("#areaChartScrubberContent").style("display", "block");
                            })
                            .on("mouseout", function (event) {
                                scrubber.style("display", "none");
                                d3.select("#areaChartScrubberContent").style("display", "none");
                            })
                            .on("mousemove", function (event) {
                                let currentXPosition = d3.pointer(event)[0];
                                scrubber.attr("transform", "translate(" + currentXPosition + "," + 20 + ")");
                                let xValue = xz_area.invert(currentXPosition);
                                let tmp = collection.get(new Date(xValue).toDateString());
                                if (tmp !== undefined) {
                                    selectedLocation = tmp;
                                    let date = new Date(tmp.attributes.ddate);
                                    let formattedDate = ((date.getMonth() > 8) ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' + ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' + date.getFullYear();
                                    d3.select("#areaChartScrubberContentDate").html(formattedDate);
                                    d3.select("#areaChartScrubberContent_d4").html(`${Math.round(tmp.attributes.d4).toString()} %`);
                                    d3.select("#areaChartScrubberContent_d3").html(`${Math.round(tmp.attributes.D3_D4).toString()} %`);
                                    d3.select("#areaChartScrubberContent_d2").html(`${Math.round(tmp.attributes.D2_D4).toString()} %`);
                                    d3.select("#areaChartScrubberContent_d1").html(`${Math.round(tmp.attributes.D1_D4).toString()} %`);
                                    d3.select("#areaChartScrubberContent_d0").html(`${Math.round(tmp.attributes.D0_D4).toString()} %`);
                                }

                                d3.select("#areaChartScrubberContent")
                                    .style("position", "relative")
                                    .style("left", currentXPosition + "px")
                                    .style("top", "-275px");
                            })
                            .on("click", function (event) {
                                selectedDate = selectedLocation.attributes.ddate;
                                let date = new Date(selectedDate);
                                let formattedDate = ((date.getMonth() > 8) ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' + ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' + date.getFullYear();
                                let currentXPosition = d3.pointer(event)[0];
                                d3.select(".click-scrubber-text").text(formattedDate);
                                clickScrubber.attr("transform", "translate(" + currentXPosition + "," + 20 + ")");
                                clickScrubber.style("display", null);
                                clickScrubber.style("opacity", "1");


                                const endDate = new Date(selectedDate);
                                const startDate = new Date(endDate.getTime() - (60 * 60 * 24 * 7 * 1000));

                                //updateSelectedDateLabel(selectedDate);

                                const urlSearchParams = new URLSearchParams(location.search);
                                urlSearchParams.set("date", selectedDate.toString());
                                window.history.replaceState({}, '', `${location.pathname}?${urlSearchParams}`);

                                const layersToRemove = mapView.map.layers.filter(lyr => {
                                    if (lyr.title === config.drought_layer_name) {
                                        return lyr;
                                    }
                                });
                                mapView.map.removeMany(layersToRemove.items);

                                const layer = new FeatureLayer({
                                    url: config.droughtURL,
                                    layerId: 2,
                                    timeExtent: {
                                        start: startDate,
                                        end: endDate
                                    },
                                    opacity: 0.75,
                                    title: config.drought_layer_name,
                                    useViewTime: false
                                });
                                mapView.map.add(layer, 0);
                            });


                        areaChartSvg.call(areaChartZooming);

                        return areaChartSvg.node();
                    }

                    function areaChartZoomed(event) {
                        xz_area = event.transform.rescaleX(areaChartX);
                        let xPos = xz_area(selectedDate);
                        //let w = (areaChartWidth - areaChartMargin.left - areaChartMargin.right);
                        d3.selectAll(".click-scrubber").attr("transform", "translate(" + xPos + "," + 20 + ")").style("opacity", (xPos > 30 && xPos < 800) ? 1 : 0);
                        areaChartPath.attr("d", area(inputDataset, xz_area));
                        gx_area.call(areaChartXAxis, xz_area);
                    }

                    areaChart();
                } catch (error) {
                    console.debug(error);
                }
            }
        }
    });
}