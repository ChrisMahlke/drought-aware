import "../../style/desktop.scss";
import jsonResponse from './data.json';
import config from './config.json';

import { loadCss, loadModules } from 'esri-loader';

import * as calcite from "calcite-web";
import * as d3 from "d3";
import * as UrlParams from "url-params";
import { differenceInWeeks, format } from 'date-fns'

window.onSignInHandler = (portal) => {
    // initialize calcite
    calcite.init();
    // esri styles
    loadCss();

    loadModules([
        "esri/layers/FeatureLayer",
        "esri/TimeExtent",
        "esri/geometry/Point",
        "esri/Graphic",
        "esri/geometry/Extent",
        "esri/geometry/geometryEngine",
        "esri/geometry/projection",
        "esri/geometry/SpatialReference",
        "esri/views/MapView",
        "esri/WebMap",
        "esri/tasks/QueryTask",
        "esri/tasks/support/Query",
        "esri/geometry/Polygon",
        "esri/widgets/Search",
        "esri/core/watchUtils",
    ]).then(([FeatureLayer, TimeExtent, Point, Graphic, Extent, geometryEngine, projection,
                 SpatialReference, MapView, WebMap, QueryTask, Query,
                 Polygon, Search, watchUtils]) => {

        // DOM nodes
        let dataContainerEle = document.getElementsByClassName("data-container")[0];
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
                    "wkid": 5070
                },
                "type": "point"
            }),
            q: ""
        };

        let selectedView = null;
        //
        // create the svg
        let svg = d3.select("#chart").append("svg").attr("width", config.chart.width + 25).attr("height", config.chart.height + 25);
        let g = svg.append("g").attr("transform", "translate(" + config.chart.margin.left + "," + config.chart.margin.top + ")");
        // set x scale
        let x = d3.scaleBand().range([0, config.chart.width]);
        // set y scale
        let y = d3.scaleLinear().range([config.chart.height, 0]);
        // set the colors
        let z = d3.scaleOrdinal().range(["#b2a077", "#ccaa5b", "#e4985a", "#e28060", "#b24543", "rgba(57,57,57,0.11)"]);

        let webmap = new WebMap({
            portalItem: {
                id: config.webMapId
            }
        });

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
                return Promise.all(promises.toArray());
            })
            .then(function(layers) {
                console.debug("All layers loaded");
                let tmpExt = new Extent({
                    "xmin": params.get("xmin") || -2991495.024884269,
                    "ymin": params.get("ymin") || 252581.70093458006,
                    "xmax": params.get("xmax") || 2841527.165071185,
                    "ymax": params.get("ymax") || 3191062.7476635515,
                    "spatialReference": {
                        "wkid": 5070
                    }
                });
                console.debug("selectedView", selectedView);
                selectedView.view.goTo(tmpExt)
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
                            opacity: 0.75,
                            title: config.drought_layer_name,
                            useViewTime: false
                        });
                        selectedView.view.map.add(layer, 1);

                        updateSelectedDateLabel(selectedChartDate);
                    }
                });
            })
            .catch(function(error) {
                console.error(error);
            });

        let views = config.views.map(view => {
            view.map = webmap;
            const mapView = new MapView(view);
            mapView.popup = null;
            mapView.ui.components = [];
            const mainViewGeometry = Polygon.fromExtent(mapView.extent);
            const graphic = new Graphic({
                geometry: mainViewGeometry,
                symbol: config.maskSymbol
            });
            mapView.graphics.add(graphic);
            mapView.on("click", mapClickHandler);
            mapView.when(maintainFixedExtent);

            return {
                "id": view.container,
                "view": mapView
            };
        });
        selectedView = views[0];

        // Watch view's stationary property for becoming true.
        watchUtils.whenTrue(selectedView.view, "stationary", function() {
            // Get the new extent of the view only when view is stationary.
            const currentExtent = selectedView.view.extent;
            if (currentExtent) {
                const params = new URLSearchParams(location.search);
                params.set("xmin", currentExtent.xmin);
                params.set("ymin", currentExtent.ymin);
                params.set("xmax", currentExtent.xmax);
                params.set("ymax", currentExtent.ymax);
                window.history.replaceState({}, '', `${location.pathname}?${params}`);
            }
        });

        let searchWidget = new Search({
            container: "searchWidgetContainer",
            resultGraphicEnabled: false
        });
        searchWidget.on("search-complete", event => {
            console.debug("search-complete", event);
            projection.load().then(evt => {
                let resultGeometry = event.results[0].results[0].feature.geometry;
                let resultExtent = event.results[0].results[0].extent;

                const mainViewProGeom = projection.project(resultGeometry, new SpatialReference({
                    wkid: 5070
                }));
                let mainViewGeomEngResult = geometryEngine.intersects(mainViewProGeom, views[0].view.graphics.items[0].geometry);

                const akViewProGeom = projection.project(resultGeometry, new SpatialReference({
                    wkid: 5936
                }));
                let akViewGeomEngResult = geometryEngine.intersects(akViewProGeom, views[1].view.graphics.items[0].geometry);

                const hiViewProGeom = projection.project(resultGeometry, new SpatialReference({
                    wkid: 102007
                }));
                let hiViewGeomEngResult = geometryEngine.intersects(hiViewProGeom, views[2].view.graphics.items[0].geometry);

                const prViewProGeom = projection.project(resultGeometry, new SpatialReference({
                    wkid: 5070
                }));
                let prViewGeomEngResult = geometryEngine.intersects(prViewProGeom, views[3].view.graphics.items[0].geometry);

                if (mainViewGeomEngResult) {
                    config.boundaryQuery.geometry = mainViewProGeom;
                    selectedView = views[0];
                } else if (akViewGeomEngResult) {
                    config.boundaryQuery.geometry = akViewProGeom;
                    selectedView = views[1];
                } else if (hiViewGeomEngResult) {
                    config.boundaryQuery.geometry = hiViewProGeom;
                    selectedView = views[2];
                } else if(prViewGeomEngResult) {
                    config.boundaryQuery.geometry = prViewProGeom;
                    selectedView = views[3];
                } else {
                    alert("There are no results within the map's extent!");
                }

                mapClickHandler(null);
                selectedView.view.goTo(mainViewProGeom)
                    .catch(function(error) {
                        if (error.name !== "AbortError") {
                            console.error(error);
                        }
                    });

            });
        });
        selectedView.view.ui.add(searchWidget, {
            position: "top-right"
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

        /**
         * 0) Determine correct admin area (county or state) to use for querying data
         *      - apply geometry (boundary) to map
         *
         * 1) Fetch the agricultural data (return geometry)
         *      - pass in geometry (map point) and return geometry
         *          -- update population
         *          -- update agricultural impact
         *
         * 2) Fetch the drought data based on FIPS (no geometry)
         *      - Tables (state is 0, county is 1)
         *      - sort by date
         *      - pass in q parameter based on admin selection (county or state)
         * 2a)      -- Fetch the drought data based on county, state, and D2_D4 date data
         *              --- update consecutive weeks of severe drought
         *          -- update chart
         *          -- update current drought status
         *          -- update current drought status date
         *          -- update location
         *
         * 3) Fetch monthly outlook data (spatial query based on county or state)
         *      - update monthly drought
         *
         * 4) Fetch seasonal outlook data (spatial query based on county or state)
         *      - update seasonal drought
         * @param event
         */
        function mapClickHandler(event) {
            // show visualization container
            calcite.removeClass(dataContainerEle, "hide");
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
                }).then(response => {
                    if (response.features.length > 0) {
                        updateAgriculturalImpactComponent(response);
                    }
                });



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
                console.debug("droughtQuery", droughtQuery);
                fetchData({
                    url: config.droughtURL + droughtQueryLayerId,
                    returnGeometry: false,
                    orderByFields: ["ddate DESC"],
                    outFields: ["*"],
                    q: droughtQuery
                }).then(response => {
                    if (response.features.length > 0) {
                        let features = response.features;
                        let inputDataset = features.map(feature => {
                            return {
                                date: new Date(feature.attributes.ddate),
                                d0: feature.attributes.d0,
                                d1: feature.attributes.d1,
                                d2: feature.attributes.d2,
                                d3: feature.attributes.d3,
                                d4: feature.attributes.d4,
                                nothing: feature.attributes.nothing,
                                total: 100
                            };
                        });
                        inputDataset.reverse();

                        let selectedDate = response.features[0].attributes.ddate;
                        let formattedSelectedDate = format(selectedDate, "P");

                        let urlParamsDate = parseInt(params.get("date") || selectedDate);

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
                            consecutiveWeeksElement.innerHTML = consecutiveWeeks.toString();
                            if (consecutiveWeeks < 1) {
                                consecutiveWeeksElement.style.color = "#393939";
                            } else if (consecutiveWeeks > 0 && consecutiveWeeks < 8) {
                                consecutiveWeeksElement.style.color = "#e4985a";
                            } else if (consecutiveWeeks > 8) {
                                consecutiveWeeksElement.style.color = "#b24543";
                            }
                        });
                        updateChart(inputDataset);
                        updateCurrentDroughtStatus(response);
                        updateSelectedLocationComponent(response);
                    } else {

                    }
                });

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

                projection.load().then(evt => {
                    let resultGeometry = response.features[0].geometry;
                    let mainViewProGeom = projection.project(resultGeometry, new SpatialReference({
                        wkid: 5070
                    }));
                    let mainViewGeomEngResult = geometryEngine.intersects(mainViewProGeom, views[0].view.graphics.items[0].geometry);

                    let akViewProGeom = projection.project(resultGeometry, new SpatialReference({
                        wkid: 5936
                    }));
                    let akViewGeomEngResult = geometryEngine.intersects(akViewProGeom, views[1].view.graphics.items[0].geometry);

                    let hiViewProGeom = projection.project(resultGeometry, new SpatialReference({
                        wkid: 102007
                    }));
                    let hiViewGeomEngResult = geometryEngine.intersects(hiViewProGeom, views[2].view.graphics.items[0].geometry);

                    let prViewProGeom = projection.project(resultGeometry, new SpatialReference({
                        wkid: 5070
                    }));
                    let prViewGeomEngResult = geometryEngine.intersects(prViewProGeom, views[3].view.graphics.items[0].geometry);

                    if (mainViewGeomEngResult) {
                        config.boundaryQuery.geometry = mainViewProGeom;
                        selectedView = views[0];
                    } else if (akViewGeomEngResult) {
                        config.boundaryQuery.geometry = akViewProGeom;
                        selectedView = views[1];
                    } else if (hiViewGeomEngResult) {
                        config.boundaryQuery.geometry = hiViewProGeom;
                        selectedView = views[2];
                    } else if(prViewGeomEngResult) {
                        config.boundaryQuery.geometry = prViewProGeom;
                        selectedView = views[3];
                    } else {
                        alert("There are no results within the map's extent!");
                    }

                    views.forEach(v => {
                        for (const graphic of v.view.graphics){
                            if (graphic.attributes === "BOUNDARY") {
                                v.view.graphics.remove(graphic);
                            }
                        }
                    });

                    const polygonGraphic = new Graphic({
                        geometry: response.features[0].geometry,
                        symbol: config.selectedGeographicSymbology,
                        attributes: "BOUNDARY"
                    });

                    selectedView.view.graphics.add(polygonGraphic);
                });
            } else {
                // no features
            }
            return await response;
        }

        function updateAgriculturalImpactComponent(response) {
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
            document.getElementById("jobs").innerHTML = Number(selectedFeature.attributes[labor]).toLocaleString();
            document.getElementById("totalSales").innerHTML = Number(selectedFeature.attributes[total_sales]).toLocaleString();
            document.getElementById("cornSales").innerHTML = Number(selectedFeature.attributes[corn]).toLocaleString();
            document.getElementById("soySales").innerHTML = Number(selectedFeature.attributes[soy]).toLocaleString();
            document.getElementById("haySales").innerHTML = Number(selectedFeature.attributes[hay]).toLocaleString();
            document.getElementById("wheatSales").innerHTML = Number(selectedFeature.attributes[winter]).toLocaleString();
            document.getElementById("livestockSales").innerHTML = Number(selectedFeature.attributes[livestock]).toLocaleString();
            // population
            document.getElementById("population").innerHTML = `Population: ${Number(selectedFeature.attributes[population]).toLocaleString()}`;
        }

        function updateSelectedLocationComponent(response) {
            const selectedFeature = response.features[0];
            let label = `${selectedFeature.attributes["name"]}, ${config.selected.state_name}`;
            if (config.selected.adminAreaId !== config.COUNTY_ADMIN) {
                label = `${config.selected.state_name}`;
            }
            document.getElementById("selectedLocation").innerHTML = label;

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
                monthlyOutlookDate.innerHTML = "";
                monthlyOutlookLabel.innerHTML = "";
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
                seasonalOutlookDateEle.innerHTML = "";
                seasonalOutlookLabelEle.innerHTML = "";
            }
        }

        function updateSelectedLocationPopulation(response) {
            if (response.features.length > 0) {
                const selectedFeature = response.features[0];
                document.getElementById("population").innerHTML = `Population: ${Number(selectedFeature.attributes["CountyPop2020"]).toLocaleString()}`;
            } else {

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
                label = "No Drought";
                color = "";
            } else if (key === "d0") {
                label = "Abnormally Dry";
                color = "#b2a077";
            } else if (key === "d1") {
                label = "Moderate Drought";
                color = "#ccaa5b";
            } else if (key === "d2") {
                label = "Severe Drought";
                color = "#e4985a";
            } else if (key === "d3") {
                label = "Extreme Drought";
                color = "#e28060";
            } else if (key === "d4") {
                label = "Exceptional Drought";
                color = "#b24543";
            }
            let currentDroughtStatusElement = document.getElementById("currentDroughtStatus");
            currentDroughtStatusElement.innerHTML = label;
            currentDroughtStatusElement.style.color = color;
            document.getElementById("currentDroughtStatusDate").innerHTML = format(new Date(mostRecentFeature["ddate"]), "PPP");
        }

        function updateChart(inputDataset) {
            x.domain(inputDataset.map(d => {
                return d.date;
            }));
            y.domain([0, d3.max(inputDataset, d => {
                return d.total;
            })]);
            z.domain(config.chart.keys);

            // update the bars
            let bars = d3.selectAll(".bars");
            bars.selectAll("g")
                .data(d3.stack().keys(config.chart.keys)(inputDataset))
                .attr("fill", d => {
                    return z(d.key);
                })
                .selectAll("rect")
                .data(d => {
                    return d;
                })
                .attr("x", function(d) {
                    return x(d.data.date);
                })
                .attr("y", function(d) {
                    return y(d[1]);
                })
                .attr("height", function(d) {
                    return y(d[0]) - y(d[1]);
                })
                .attr("width", x.bandwidth())
                .attr("date", function(d) {
                    return new Date(d.data.date).getTime();
                })
                .attr("d0", function(d) {
                    return d.data.d0;
                })
                .attr("d1", function(d) {
                    return d.data.d1;
                })
                .attr("d2", function(d) {
                    return d.data.d2;
                })
                .attr("d3", function(d) {
                    return d.data.d3;
                })
                .attr("d4", function(d) {
                    return d.data.d4;
                })
                .on("click", function(d) {
                    const selectedChartDate = parseInt(d.target.attributes["date"].nodeValue);
                    const endDate = new Date(selectedChartDate);
                    const startDate = new Date(endDate.getTime() - (60 * 60 * 24 * 7 * 1000));

                    updateSelectedDateLabel(selectedChartDate);

                    const urlSearchParams = new URLSearchParams(location.search);
                    urlSearchParams.set("date", selectedChartDate.toString());
                    window.history.replaceState({}, '', `${location.pathname}?${urlSearchParams}`);

                    const layersToRemove = selectedView.view.map.layers.filter(lyr => {
                        if (lyr.title === config.drought_layer_name) {
                            return lyr;
                        }
                    });
                    selectedView.view.map.removeMany(layersToRemove.items);

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
                    selectedView.view.map.add(layer, 1);
                });
        }

        async function fetchData(params) {
            return await queryService(params);
        }

        (async function() {
            try {
                let features = jsonResponse.features;
                let inputDataset = features.map(feature => {
                    return {
                        date: new Date(feature.attributes.ddate),
                        d0: feature.attributes.d0,
                        d1: feature.attributes.d1,
                        d2: feature.attributes.d2,
                        d3: feature.attributes.d3,
                        d4: feature.attributes.d4,
                        nothing: feature.attributes.nothing,
                        total: 100
                    };
                });

                x.domain(inputDataset.map(d => {
                    return d.date;
                }));
                y.domain([0, d3.max(inputDataset, d => {
                    return d.total;
                })]);
                z.domain(config.chart.keys);

                g.append("g")
                    .attr("class", "bars")
                    .selectAll("g")
                    .data(d3.stack().keys(config.chart.keys)(inputDataset))
                    .enter().append("g")
                    .attr("fill", d => {
                        return z(d.key);
                    })
                    .selectAll("rect")
                    .data(d => {
                        return d;
                    })
                    .enter().append("rect")
                    .attr("x", d => {
                        return x(d.data.date);
                    })
                    .attr("y", d => {
                        return y(d[1]);
                    })
                    .attr("height", d => {
                        return y(d[0]) - y(d[1]);
                    })
                    .attr("width", x.bandwidth());

                let xScale = d3.scaleTime().domain([new Date(inputDataset[0].date), new Date(inputDataset[inputDataset.length - 1].date)]).range([0, config.chart.width]);
                g.append("g")
                    .attr("class", "x-axis")
                    .attr("transform", "translate(0," + config.chart.height + ")")
                    .call(d3.axisBottom(xScale));

                g.append("g")
                    .attr("class", "y-axis")
                    .call(d3.axisLeft(y).ticks(5))
                    .append("text")
                    .attr("x", 2)
                    .attr("y", y(y.ticks().pop()) + 0.5)
                    .attr("dy", "0.32em")
                    .attr("fill", "#000")
                    .attr("font-weight", "bold")
                    .attr("text-anchor", "start");

                /*function zoom(svg) {
                    const extent = [[config.chart.margin.left, config.chart.margin.top], [config.chart.width - config.chart.margin.right, config.chart.height - config.chart.margin.top]];
                    svg.call(d3.zoom()
                        .scaleExtent([1, 15])
                        .translateExtent(extent)
                        .extent(extent)
                        .on("zoom", zoomed));

                    function zoomed(event) {
                        x.range([0, config.chart.width].map(d => event.transform.applyX(d)));
                        svg.selectAll(".bars rect").attr("x", d => x(d.data.date)).attr("width", x.bandwidth());
                        //let xScale = d3.scaleTime().domain([new Date(inputDataset[0].date), new Date(inputDataset[inputDataset.length - 1].date)]).range([x.range()[0], x.range()[1]]);
                        console.debug(x.doamin())
                        let xScale = d3.scaleTime().domain([inputDataset[0].date, inputDataset[inputDataset.length - 1].date]).range([0, config.chart.width]);
                        g.append("g")
                            .attr("class", "x-axis")
                            .attr("transform", "translate(0," + config.chart.height + ")")
                            .call(d3.axisBottom(xScale));
                        svg.selectAll(".x-axis").call(xScale);
                    }
                }

                svg.call(zoom);*/
            } catch(error) {
                console.log(error);
            }
        })();

        function stopEvtPropagation(event) {
            event.stopPropagation();
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

        function maintainFixedExtent(view) {
            let fixedExtent = view.extent.clone();
            // keep a fixed extent in the view
            // when the view size changes
            view.on("resize", function() {
                view.extent = fixedExtent;
            });
            return view;
        }

        function disableNavigation(view) {
            view.popup.dockEnabled = true;
            // Removes the zoom action on the popup
            view.popup.actions = [];
            // stops propagation of default behavior when an event fires
            function stopEvtPropagation(event) {
                event.stopPropagation();
            }
            // disable mouse wheel scroll zooming on the view
            view.navigation.mouseWheelZoomEnabled = true;
            // disable zooming via double-click on the view
            view.on("double-click", stopEvtPropagation);
            // disable zooming out via double-click + Control on the view
            view.on("double-click", ["Control"], stopEvtPropagation);
            // disables pinch-zoom and panning on the view
            view.navigation.browserTouchPanEnabled = false;
            view.on("drag", stopEvtPropagation);
            // disable the view's zoom box to prevent the Shift + drag
            // and Shift + Control + drag zoom gestures.
            view.on("drag", ["Shift"], stopEvtPropagation);
            view.on("drag", ["Shift", "Control"], stopEvtPropagation);
            // prevents zooming and rotation with the indicated keys
            view.on("key-down", function(event) {
                let prohibitedKeys = ["+", "-", "_", "=", "a", "d"];
                let keyPressed = event.key.toLowerCase();
                if (prohibitedKeys.indexOf(keyPressed) !== -1) {
                    event.stopPropagation();
                }
            });
            return view;
        }

        // prevents the user from opening the popup with click
        function disablePopupOnClick(view) {
            view.on("click", function(event) {
                event.stopPropagation();
            });
            return view;
        }

        function updateSelectedDateLabel(date) {
            const dateObj = new Date(date);
            document.getElementById("selectedDate").innerHTML = format(dateObj, "PPP");
        }
    });
}