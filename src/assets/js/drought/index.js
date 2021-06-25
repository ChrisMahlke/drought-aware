import "../../style/drought.scss";
import jsonResponse from ".//data.json";
import config from './config.json';

import { loadCss, loadModules } from 'esri-loader';

import * as calcite from "calcite-web";
import * as d3 from "d3";

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

        //if (portal === undefined) {
        let webmap = new WebMap({
            portalItem: {
                id: config.webMapId
            }
        });

        let views = [];
        config.views.forEach(view => {
            view.map = webmap;
            const mapView = new MapView(view);
            mapView.popup = null;
            mapView.ui.components = [];
            const mainViewGeometry = Polygon.fromExtent(mapView.extent);
            const graphic = new Graphic({
                geometry: mainViewGeometry,
                symbol: {
                    type: "simple-fill",
                    color: [128, 128, 128, 0.0],
                    outline: {
                        color: [128, 128, 128, 0.0],
                        width: "0px"
                    }
                }
            });
            mapView.graphics.add(graphic);
            mapView.on("click", function(event) {
                let mapPoint = event.mapPoint;
                console.debug(mapPoint);
                fetchData({
                    url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_PR_Counties_DroughtApp/FeatureServer/0",
                    returnGeometry: true,
                    outFields: ["*"],
                    geometry: event.mapPoint,
                    q: ""
                }).then(response => {
                    if (response.features.length > 0) {
                        console.debug("response", response);
                        let selectedFeature = response.features[0];
                        document.getElementsByClassName("selected-location-label")[0].innerHTML = `${selectedFeature.attributes["CountyName"]}, ${selectedFeature.attributes["STATE_NAME"]}`;
                        document.getElementsByClassName("selected-location-population")[0].innerHTML = `Population: ${selectedFeature.attributes["CountyPop2020"]}`;

                        fetchData({
                            url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_PR_Counties_DroughtApp/FeatureServer/0",
                            returnGeometry: false,
                            outFields: ["*"],
                            q: `CountyFIPS = '${selectedFeature.attributes["CountyFIPS"]}'`
                        }).then(response2 => {
                            if (response2.features.length > 0) {
                                console.debug("response2", response2);
                                let result = response2.features[0];
                                document.getElementById("jobs").innerHTML = result.attributes["CountyLabor"];
                                document.getElementById("totalSales").innerHTML = result.attributes["County_Total_Sales"];
                                document.getElementById("cornSales").innerHTML = result.attributes["County_Corn_Value"];
                                document.getElementById("soySales").innerHTML = result.attributes["County_Soy_Value"];
                                document.getElementById("haySales").innerHTML = result.attributes["County_Hay_Value"];
                                document.getElementById("wheatSales").innerHTML = result.attributes["County_WinterWheat_Value"];
                                document.getElementById("livestockSales").innerHTML = result.attributes["County_Livestock_Value"];
                            }
                        });

                        //https://idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Climate_Outlooks/cpc_drought_outlk/MapServer/0
                        fetchData({
                            url: "https://idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Climate_Outlooks/cpc_drought_outlk/MapServer/0",
                            returnGeometry: false,
                            outFields: ["*"],
                            spatialRel: "esriSpatialRelIntersects",
                            orderByFields: "fid_persis desc, fid_improv desc, fid_dev desc, fid_remove desc",
                            geometryType: "esriGeometryPolygon",
                            geometry: selectedFeature.geometry,
                            q: ""
                        }).then(response3 => {
                            if (response3.features.length > 0) {
                                console.debug("response3", response3);
                                let features = response3.features;
                                if (features.length > 0) {
                                    let feature = features[0];
                                    document.getElementById("monthly-outlook-date").innerHTML = feature.attributes["fcst_date"];
                                    if (feature.attributes["fid_improv"] === 1) {
                                        document.getElementById("monthly-outlook-label").innerHTML = "Drought Improves";
                                    } else if (feature.attributes["fid_persis"] === 1) {
                                        document.getElementById("monthly-outlook-label").innerHTML = "Drought Persists";
                                    } else if (feature.attributes["fid_remove"] === 1) {
                                        document.getElementById("monthly-outlook-label").innerHTML = "Drought Removal Likely";
                                    } else if (feature.attributes["fid_dev"] === 1) {
                                        document.getElementById("monthly-outlook-label").innerHTML = "Drought Develops";
                                    }
                                }
                            }
                        });

                        fetchData({
                            url: "https://idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Climate_Outlooks/cpc_drought_outlk/MapServer/1",
                            returnGeometry: false,
                            outFields: ["*"],
                            spatialRel: "esriSpatialRelIntersects",
                            orderByFields: "fid_persis desc, fid_improv desc, fid_dev desc, fid_remove desc",
                            geometryType: "esriGeometryPolygon",
                            geometry: selectedFeature.geometry,
                            q: ""
                        }).then(response4 => {
                            if (response4.features.length > 0) {
                                console.debug("response4", response4);
                                let features = response4.features;
                                if (features.length > 0) {
                                    let feature = features[0];
                                    document.getElementById("seasonal-outlook-date").innerHTML = feature.attributes["fcst_date"];
                                    if (feature.attributes["fid_improv"] === 1) {
                                        document.getElementById("seasonal-outlook-label").innerHTML = "Drought Improves";
                                    } else if (feature.attributes["fid_persis"] === 1) {
                                        document.getElementById("seasonal-outlook-label").innerHTML = "Drought Persists";
                                    } else if (feature.attributes["fid_remove"] === 1) {
                                        document.getElementById("seasonal-outlook-label").innerHTML = "Drought Removal Likely";
                                    } else if (feature.attributes["fid_dev"] === 1) {
                                        document.getElementById("seasonal-outlook-label").innerHTML = "Drought Develops";
                                    }
                                }
                            }
                        });
                    }
                });
            });
            views.push({
                "id": view.container,
                "view": mapView
            });
        });

        /*const mainView = new MapView(config.mainView);
        mainView.popup = null;
        mainView.ui.components = [];
        const viewMask = {
            type: "simple-fill",
            color: [128, 128, 128, 0.0],
            outline: {
                color: [128, 128, 128, 0.0],
                width: "0px"
            }
        };
        const mainViewGeometry = Polygon.fromExtent(mainView.extent);
        const graphic = new Graphic({
            geometry: mainViewGeometry,
            symbol: viewMask
        });
        mainView.graphics.add(graphic);

         */
        // Watch view's stationary property for becoming true.
        /*watchUtils.whenTrue(mainView, "navigating", function() {
            console.debug("NAVIGATING");
            mainView.navigation.mouseWheelZoomEnabled = true;
        });*/
        watchUtils.whenTrue(views[0].view, "stationary", function() {
            console.debug("STATIONARY");
            // Get the new center of the view only when view is stationary.
            //if (views[1].view.center) {
            //    console.debug(views[1].view.center);
           // }

            // Get the new extent of the view only when view is stationary.
            if (views[0].view.extent) {
                console.debug(views[0].view.extent);
            }
        });

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
                } else if (akViewGeomEngResult) {
                    views[1].view.graphics.add(new Graphic(resultExtent, config.searchResultSymbol));
                } else if (hiViewGeomEngResult) {
                    views[2].view.graphics.add(new Graphic(resultExtent, config.searchResultSymbol));
                } else if(prViewGeomEngResult) {
                    views[3].view.graphics.add(new Graphic(resultExtent, config.searchResultSymbol));
                } else {
                    alert("There are no results within the map's extent!");
                }

            });
        });

        // Add the search widget to the top right corner of the view
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
                    setTimeout(function() {
                        views[0].view.ui.add(searchWidget, {
                            position: "top-right"
                        });
                        let ext = new Extent({
                            xmin: -2991495.024884269,
                            ymin: 252581.70093458006,
                            xmax: 2841527.165071185,
                            ymax: 3191062.7476635515,
                            spatialReference: new SpatialReference({wkid:5070})
                        });
                        views[0].view.goTo(ext, {
                            "duration": 500
                        });
                    }, 500);
                } else if (selectedID === "akView") {
                    setTimeout(function() {
                        views[1].view.ui.add(searchWidget, {
                            position: "top-right"
                        });
                        let ext = new Extent({
                            xmax: 3475410.6485892846,
                            xmin: -131660.68640217,
                            ymax: 180833.21465040476,
                            ymin: -2253261.915541197,
                            spatialReference: new SpatialReference({wkid:5936})
                        });
                        views[1].view.goTo(ext, {
                            "duration": 500
                        });
                    }, 500);
                } else if (selectedID === "hiView") {
                    setTimeout(function() {
                        views[2].view.ui.add(searchWidget, {
                            position: "top-right"
                        });
                        let ext = new Extent({
                            xmax: 438254.12528946745,
                            xmin: -530539.8459393329,
                            ymax: 1094985.328358173,
                            ymin: 608767.3014444704,
                            spatialReference: new SpatialReference({wkid:102007})
                        });
                        views[2].view.goTo(ext, {
                            "duration": 500
                        });
                    }, 500);
                } else if (selectedID === "prView") {
                    setTimeout(function() {
                        views[3].view.ui.add(searchWidget, {
                            position: "top-right"
                        });
                        let ext = new Extent({
                            xmax: 3401648.6556114405,
                            xmin: 2993043.359452082,
                            ymax: 87926.33967047348,
                            ymin: -117144.36347717477,
                            spatialReference: new SpatialReference({wkid:5070})
                        });
                        views[3].view.goTo(ext, {
                            "duration": 500
                        });
                    }, 500);
                }

            });
        })

        async function fetchData(params) {
            return await queryService(params);
        }

        (async function() {
            try {
                //const jsonResponse = await d3.json("data.json");
                let features = jsonResponse.features;
                let inputDataset = [];
                inputDataset = features.map(feature => {
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
                //console.debug(inputDataset)
                let margin = {
                    top: 5,
                    right: 0,
                    bottom: 10,
                    left: 25
                };
                let width = 700;
                let height = 125;

                const chartElement = d3.select("#chart");
                // create the svg
                let svg = chartElement.append("svg").attr("width", width).attr("height", height + 25);
                let g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                // set x scale
                let x = d3.scaleBand().range([0, width]);
                // set y scale
                let y = d3.scaleLinear().range([height, 0]);
                // set the colors
                let z = d3.scaleOrdinal().range(["#b2a077", "#ccaa5b", "#e4985a", "#e28060", "#b24543", "rgba(57,57,57,0.11)"]);

                let keys = ["d0", "d1", "d2", "d3", "d4", "nothing"];
                x.domain(inputDataset.map(d => {
                    return d.date;
                }));
                y.domain([0, d3.max(inputDataset, d => {
                    return d.total;
                })]);
                z.domain(keys);

                g.append("g")
                    .attr("class", "bars")
                    .selectAll("g")
                    .data(d3.stack().keys(keys)(inputDataset))
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

                let xScale = d3.scaleTime().domain([new Date(inputDataset[0].date), new Date(inputDataset[inputDataset.length - 1].date)]).range([0, width]);

                g.append("g")
                    .attr("class", "x-axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(d3.axisBottom(xScale));

                g.append("g")
                    .attr("class", "y-axis")
                    .call(d3.axisLeft(y).ticks(null, "s"))
                    .append("text")
                    .attr("x", 2)
                    .attr("y", y(y.ticks().pop()) + 0.5)
                    .attr("dy", "0.32em")
                    .attr("fill", "#000")
                    .attr("font-weight", "bold")
                    .attr("text-anchor", "start");

                function zoom(svg) {
                    const extent = [[margin.left, margin.top], [width - margin.right, height - margin.top]];
                    svg.call(d3.zoom()
                        .scaleExtent([1, 15])
                        .translateExtent(extent)
                        .extent(extent)
                        .on("zoom", zoomed));

                    function zoomed(event) {
                        x.range([0, width].map(d => event.transform.applyX(d)));
                        svg.selectAll(".bars rect").attr("x", d => x(d.data.date)).attr("width", x.bandwidth());
                        //let xScale = d3.scaleTime().domain([new Date(inputDataset[0].date), new Date(inputDataset[inputDataset.length - 1].date)]).range([x.range()[0], x.range()[1]]);
                        console.debug(x.doamin())
                        let xScale = d3.scaleTime().domain([inputDataset[0].date, inputDataset[inputDataset.length - 1].date]).range([0, width]);
                        g.append("g")
                            .attr("class", "x-axis")
                            .attr("transform", "translate(0," + height + ")")
                            .call(d3.axisBottom(xScale));
                        svg.selectAll(".x-axis").call(xScale);
                    }
                }

                svg.call(zoom)
            } catch(error) {
                console.log(error);
            }
        })();
        //} else {
        //    console.debug("SIGNED IN");
        //}

        // stops propagation of default behavior when an event fires
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
            query.geometry = params.geometry;
            query.inSR = 102003;
            query.where = params.q;
            return queryTask.execute(query);
        }
    });
}