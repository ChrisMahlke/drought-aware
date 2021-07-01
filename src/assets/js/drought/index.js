import "../../style/index.scss";
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
    ]).then(([Graphic, Extent, geometryEngine, projection,
                 SpatialReference, MapView, WebMap, QueryTask, Query,
                 Polygon, Search, watchUtils]) => {

        let selectedView = null;
        //
        let boundaryQuery = {
            url: config.county_boundary,
            returnGeometry: true,
            outFields: config.county_boundary_outfields,
            geometry: config.selected.mapPoint,
            q: ""
        };
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
            return {
                "id": view.container,
                "view": mapView
            };
        });

        selectedView = views[0];

        let searchWidget = new Search();
        searchWidget.on("search-complete", function(event) {
            projection.load().then(function (evt) {
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
                    // lower 48
                    views[0].view.graphics.add(new Graphic(resultExtent, config.searchResultSymbol));
                    //document.getElementsByClassName("inset-map-icon")[3].click();
                } else if (akViewGeomEngResult) {
                    views[1].view.graphics.add(new Graphic(resultExtent, config.searchResultSymbol));
                    //document.getElementsByClassName("inset-map-icon")[0].click();
                } else if (hiViewGeomEngResult) {
                    views[2].view.graphics.add(new Graphic(resultExtent, config.searchResultSymbol));
                    //document.getElementsByClassName("inset-map-icon")[1].click();
                } else if(prViewGeomEngResult) {
                    views[3].view.graphics.add(new Graphic(resultExtent, config.searchResultSymbol));
                    //document.getElementsByClassName("inset-map-icon")[2].click();
                } else {
                    alert("There are no results within the map's extent!");
                }

            });
        });
        views[0].view.ui.add(searchWidget, {
            position: "top-right"
        });

        document.querySelectorAll(".inset-map-icon").forEach(item => {
            item.addEventListener("click", event => {
                console.debug(event);
                let insetContainerIcon = event.target;
                let insetContainer = event.target.parentElement;
                let selectedID = event.target.dataset.id;

                let mainContainerEle = document.getElementById("mainMapContainer");
                let mainContainerMapId = mainContainerEle.dataset.id;
                mainContainerEle.append(document.getElementById(selectedID));
                mainContainerEle.setAttribute("data-id", selectedID);

                insetContainer.setAttribute("data-id", mainContainerMapId);
                insetContainerIcon.setAttribute("data-id", mainContainerMapId);
                insetContainer.append(document.getElementById(mainContainerMapId));

                views[0].view.ui.remove(searchWidget);
                views[1].view.ui.remove(searchWidget);
                views[2].view.ui.remove(searchWidget);
                views[3].view.ui.remove(searchWidget);

                if (selectedID === "mainMapView") {
                    selectedView = views[0];
                    setTimeout(function() {
                        selectedView.view.ui.add(searchWidget, {
                            position: "top-right"
                        });
                        let ext = new Extent({
                            xmin: -2991495.024884269,
                            ymin: 252581.70093458006,
                            xmax: 2841527.165071185,
                            ymax: 3191062.7476635515,
                            spatialReference: new SpatialReference({wkid:5070})
                        });
                        selectedView.view.goTo(ext, {
                            "duration": 500
                        });
                    }, 500);
                } else if (selectedID === "akView") {
                    selectedView = views[1];
                    setTimeout(function() {
                        selectedView.view.ui.add(searchWidget, {
                            position: "top-right"
                        });
                        let ext = new Extent({
                            xmax: 3475410.6485892846,
                            xmin: -131660.68640217,
                            ymax: 180833.21465040476,
                            ymin: -2253261.915541197,
                            spatialReference: new SpatialReference({wkid:5936})
                        });
                        selectedView.view.goTo(ext, {
                            "duration": 500
                        });
                    }, 500);
                } else if (selectedID === "hiView") {
                    selectedView = views[2];
                    setTimeout(function() {
                        selectedView.view.ui.add(searchWidget, {
                            position: "top-right"
                        });
                        let ext = new Extent({
                            xmax: 438254.12528946745,
                            xmin: -530539.8459393329,
                            ymax: 1094985.328358173,
                            ymin: 608767.3014444704,
                            spatialReference: new SpatialReference({wkid:102007})
                        });
                        selectedView.view.goTo(ext, {
                            "duration": 500
                        });
                    }, 500);
                } else if (selectedID === "prView") {
                    selectedView = views[3];
                    setTimeout(function() {
                        selectedView.view.ui.add(searchWidget, {
                            position: "top-right"
                        });
                        let ext = new Extent({
                            xmax: 3401648.6556114405,
                            xmin: 2993043.359452082,
                            ymax: 87926.33967047348,
                            ymin: -117144.36347717477,
                            spatialReference: new SpatialReference({wkid:5070})
                        });
                        selectedView.view.goTo(ext, {
                            "duration": 500
                        });
                    }, 500);
                }
            });
        })

        document.querySelectorAll(".radio-group-input").forEach(item => {
            item.addEventListener("click", event => {
                config.selected.adminAreaId = event.target.id;
                if (config.selected.adminAreaId === "county") {
                    boundaryQuery.url = config.county_boundary;
                    boundaryQuery.outFields = config.county_boundary_outfields;
                } else if (config.selected.adminAreaId === "state") {
                    boundaryQuery.url = config.state_boundary;
                    boundaryQuery.outFields = config.state_boundary_outfields;
                }
            });
        });

        function mapClickHandler(event) {
            config.selected.mapPoint = event.mapPoint;
            // un-hide the visualization container
            let dataContainerEle = document.getElementById("dataContainer");
            calcite.removeClass(dataContainerEle, "hide");

            // 0) Determine correct admin area (county or state) to use for querying data
            //      - apply geometry (boundary) to map
            //
            // 1) Fetch the agricultural data (return geometry)
            //      - pass in geometry (map point) and return geometry
            //          -- update population
            //          -- update agricultural impact
            //
            // 2) Fetch the drought data based on FIPS (no geometry)
            //      - Tables (state is 0, county is 1)
            //      - sort by date
            //      - pass in q parameter based on admin selection (county or state)
            // 2a)      -- Fetch the drought data based on county, state, and D2_D4 date data
            //              --- update consecutive weeks of severe drought
            //          -- update chart
            //          -- update current drought status
            //          -- update current drought status date
            //          -- update location
            //
            // 3) Fetch monthly outlook data (spatial query based on county or state)
            //      - update monthly drought
            //
            // 4) Fetch seasonal outlook data (spatial query based on county or state)
            //      - update seasonal drought

            boundaryQuery.geometry = config.selected.mapPoint;
            // apply geometry
            fetchData(boundaryQuery).then(retrieveGeometryResponseHandler);

            /*
            fetchData({
                url: config.agricultureImpactURL + "0",
                returnGeometry: true,
                outFields: ["*"],
                geometry: config.selected.mapPoint,
                q: ""
            }).then(response => {
                // apply geometry (boundary selection)
                agricultureImpactResponseHandler(response).then(response => {

                    updateSelectedLocationPopulation(response);
                    updateAgriculturalImpactComponent(response);

                    let selectedFeature = response.features[0];

                    fetchData({
                        url: config.droughtURL + "1",
                        returnGeometry: false,
                        orderByFields: ["ddate ASC"],
                        outFields: ["*"],
                        q: `admin_fips = ${selectedFeature.attributes["CountyFIPS"]}`
                    }).then(response => {
                        if (response.features.length > 0) {
                            const features = response.features;
                            const inputDataset = features.map(feature => {
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

                            const selectedDate = response.features[response.features.length - 1].attributes.ddate;
                            let formattedSelectedDate = format(selectedDate, "P");
                            fetchData({
                                url: config.droughtURL + "1",
                                returnGeometry: false,
                                orderByFields: ["ddate desc"],
                                outFields: ["*"],
                                q: `name = '${features[0].attributes["name"]}' AND state_abbr = '${features[0].attributes["state_abbr"]}' AND D2_D4 = 0 AND ddate <= date '${formattedSelectedDate}'`
                            }).then(response => {
                                let responseDate = response.features[0].attributes.ddate;
                                const consecutiveWeeks = differenceInWeeks(new Date(selectedDate), new Date(responseDate)) - 1;

                                document.getElementById("consecutiveWeeks").innerHTML = consecutiveWeeks.toString();
                                if (consecutiveWeeks < 1) {
                                    document.getElementById("consecutiveWeeks").style.color = "#393939";
                                } else if (consecutiveWeeks > 0 && consecutiveWeeks < 8) {
                                    document.getElementById("consecutiveWeeks").style.color = "#e4985a";
                                } else if (consecutiveWeeks > 8) {
                                    document.getElementById("consecutiveWeeks").style.color = "#b24543";
                                }
                            });

                            updateChart(inputDataset);
                            updateCurrentDroughtStatus(response);
                            updateSelectedLocationComponent(response);
                        } else {

                        }
                    });

                    fetchData({
                        url: config.droughtOutlookURL + "0",
                        returnGeometry: false,
                        outFields: ["*"],
                        spatialRel: "esriSpatialRelIntersects",
                        orderByFields: ["fid_persis desc", "fid_improv desc", "fid_dev desc", "fid_remove desc"],
                        geometryType: "esriGeometryPolygon",
                        geometry: selectedFeature.geometry,
                        q: ""
                    }).then(monthlyDroughtOutlookResponseHandler);

                    fetchData({
                        url: config.droughtOutlookURL + "1",
                        returnGeometry: false,
                        outFields: ["*"],
                        spatialRel: "esriSpatialRelIntersects",
                        orderByFields: ["fid_persis desc", "fid_improv desc", "fid_dev desc", "fid_remove desc"],
                        geometryType: "esriGeometryPolygon",
                        geometry: selectedFeature.geometry,
                        q: ""
                    }).then(seasonalDroughtOutlookResponseHandler);
                });
            });
            */
        }

        function highestValueAndKey(obj) {
            let [highestItems] = Object.entries(obj).sort(([ ,v1], [ ,v2]) => v2 - v1);
            console.debug(`key: ${highestItems[0]}\tvalue: ${highestItems[1]}`);
            return {
                "key": highestItems[0],
                "value": highestItems[1]
            }
        }

        async function retrieveGeometryResponseHandler(response) {
            if (response.features.length > 0) {
                for (const graphic of selectedView.view.graphics){
                    if (graphic.attributes === "BOUNDARY") {
                        selectedView.view.graphics.remove(graphic);
                    }
                }

                const polygonGraphic = new Graphic({
                    geometry: response.features[0].geometry,
                    symbol: config.selectedGeographicSymbology,
                    attributes: "BOUNDARY"
                });

                selectedView.view.graphics.add(polygonGraphic);
            } else {
                // no features
            }
            return await response;
        }

        function monthlyDroughtOutlookResponseHandler(response) {
            if (response.features.length > 0) {
                const features = response.features;
                if (features.length > 0) {
                    let feature = features[0];
                    document.getElementById("monthlyOutlookDate").innerHTML = feature.attributes["target"];
                    if (feature.attributes["fid_improv"] === 1) {
                        document.getElementById("monthlyOutlookLabel").innerHTML = "Drought Improves";
                        document.getElementById("monthlyOutlookLabel").style.color = "#87b178";
                    } else if (feature.attributes["fid_persis"] === 1) {
                        document.getElementById("monthlyOutlookLabel").innerHTML = "Drought Persists";
                        document.getElementById("monthlyOutlookLabel").style.color = "#6b4628";
                    } else if (feature.attributes["fid_remove"] === 1) {
                        document.getElementById("monthlyOutlookLabel").innerHTML = "Drought Removal Likely";
                        document.getElementById("monthlyOutlookLabel").style.color = "#78a0b1";
                    } else if (feature.attributes["fid_dev"] === 1) {
                        document.getElementById("monthlyOutlookLabel").innerHTML = "Drought Develops";
                        document.getElementById("monthlyOutlookLabel").style.color = "#6b4628";
                    }
                }
            } else {
                document.getElementById("monthlyOutlookDate").innerHTML = "";
                document.getElementById("monthlyOutlookLabel").innerHTML = "";
            }
        }

        function seasonalDroughtOutlookResponseHandler(response) {
            if (response.features.length > 0) {
                let features = response.features;
                if (features.length > 0) {
                    let feature = features[0];
                    document.getElementById("seasonalOutlookDate").innerHTML = feature.attributes["target"];
                    if (feature.attributes["fid_improv"] === 1) {
                        document.getElementById("seasonalOutlookLabel").innerHTML = "Drought Improves";
                        document.getElementById("seasonalOutlookLabel").style.color = "#87b178";
                    } else if (feature.attributes["fid_persis"] === 1) {
                        document.getElementById("seasonalOutlookLabel").innerHTML = "Drought Persists";
                        document.getElementById("seasonalOutlookLabel").style.color = "#6b4628";
                    } else if (feature.attributes["fid_remove"] === 1) {
                        document.getElementById("seasonalOutlookLabel").innerHTML = "Drought Removal Likely";
                        document.getElementById("seasonalOutlookLabel").style.color = "#78a0b1";
                    } else if (feature.attributes["fid_dev"] === 1) {
                        document.getElementById("seasonalOutlookLabel").innerHTML = "Drought Develops";
                        document.getElementById("seasonalOutlookLabel").style.color = "#6b4628";
                    }
                }
            } else {
                document.getElementById("seasonalOutlookDate").innerHTML = "";
                document.getElementById("seasonalOutlookLabel").innerHTML = "";
            }
        }

        function updateSelectedLocationComponent(response) {
            if (response.features.length > 0) {
                const selectedFeature = response.features[0];
                console.debug("selectedFeature", selectedFeature);
                document.getElementById("selectedLocation").innerHTML = `${selectedFeature.attributes["name"]}, ${selectedFeature.attributes["state_abbr"]}`;
            } else {

            }
        }

        function updateSelectedLocationPopulation(response) {
            if (response.features.length > 0) {
                const selectedFeature = response.features[0];
                document.getElementById("population").innerHTML = `Population: ${Number(selectedFeature.attributes["CountyPop2020"]).toLocaleString()}`;
            } else {

            }
        }

        function updateAgriculturalImpactComponent(response) {
            if (response.features.length > 0) {
                const selectedFeature = response.features[0];
                document.getElementById("jobs").innerHTML = Number(selectedFeature.attributes["CountyLabor"]).toLocaleString();
                document.getElementById("totalSales").innerHTML = Number(selectedFeature.attributes["County_Total_Sales"]).toLocaleString();
                document.getElementById("cornSales").innerHTML = Number(selectedFeature.attributes["County_Corn_Value"]).toLocaleString();
                document.getElementById("soySales").innerHTML = Number(selectedFeature.attributes["County_Soy_Value"]).toLocaleString();
                document.getElementById("haySales").innerHTML = Number(selectedFeature.attributes["County_Hay_Value"]).toLocaleString();
                document.getElementById("wheatSales").innerHTML = Number(selectedFeature.attributes["County_WinterWheat_Value"]).toLocaleString();
                document.getElementById("livestockSales").innerHTML = Number(selectedFeature.attributes["County_Livestock_Value"]).toLocaleString();
            } else {

            }
        }

        function updateCurrentDroughtStatus(response) {
            let mostRecentFeature = response.features[response.features.length - 1].attributes;
            let drought = {
                nothing : mostRecentFeature["nothing"],
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
            if (key === "nothing") {
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
            document.getElementById("currentDroughtStatus").innerHTML = label;
            document.getElementById("currentDroughtStatus").style.color = color;
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
                .attr("width", x.bandwidth());
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
    });
}