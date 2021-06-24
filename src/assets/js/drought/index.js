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
    ]).then(([Graphic, geometryEngine, projection,
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
                let response = fetchData({
                    url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_PR_Counties_DroughtApp/FeatureServer/0",
                    returnGeometry: false,
                    outFields: ["*"],
                    geometry: event.mapPoint,
                    q: ""
                });
                response.then(response => {
                    if (response.features.length > 0) {
                        console.debug("response1", response);
                        let selectedFeature = response.features[0];
                        document.getElementsByClassName("selected-location-label")[0].innerHTML = `${selectedFeature.attributes["CountyName"]}, ${selectedFeature.attributes["STATE_NAME"]}`;
                        document.getElementsByClassName("selected-location-population")[0].innerHTML = `Population: ${selectedFeature.attributes["CountyPop2020"]}`;

                        fetchData({
                            url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_PR_Counties_DroughtApp/FeatureServer/0",
                            returnGeometry: false,
                            outFields: ["*"],
                            q: `CountyFIPS = '${selectedFeature.attributes["CountyFIPS"]}'`
                        }).then(response => {
                            if (response.features.length > 0) {
                                console.debug("response2", response);
                                let result = response.features[0];
                                document.getElementById("jobs").innerHTML = result.attributes["CountyLabor"];
                                document.getElementById("totalSales").innerHTML = result.attributes["County_Total_Sales"];
                                document.getElementById("cornSales").innerHTML = result.attributes["County_Corn_Value"];
                                document.getElementById("soySales").innerHTML = result.attributes["County_Soy_Value"];
                                document.getElementById("haySales").innerHTML = result.attributes["County_Hay_Value"];
                                document.getElementById("wheatSales").innerHTML = result.attributes["County_WinterWheat_Value"];
                                document.getElementById("livestockSales").innerHTML = result.attributes["County_Livestock_Value"];
                            }
                        });
                    }
                });
            });
            views.push(mapView);
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
        /*watchUtils.whenTrue(mainView, "stationary", function() {
            console.debug("STATIONARY");
            // Get the new center of the view only when view is stationary.
            if (mainView.center) {
                console.debug(mainView.center);
            }

            // Get the new extent of the view only when view is stationary.
            if (mainView.extent) {
                console.debug(mainView.extent);
            }
        });*/

        let searchWidget = new Search();
        searchWidget.on("search-complete", function(event) {
            projection.load().then(function (evt) {
                let resultGeometry = event.results[0].results[0].feature.geometry;
                let resultExtent = event.results[0].results[0].extent;

                const mainViewProGeom = projection.project(resultGeometry, new SpatialReference({
                    wkid: 5070
                }));
                let mainViewGeomEngResult = geometryEngine.intersects(mainViewProGeom, views[0].graphics.items[0].geometry);

                const akViewProGeom = projection.project(resultGeometry, new SpatialReference({
                    wkid: 5936
                }));
                let akViewGeomEngResult = geometryEngine.intersects(akViewProGeom, views[1].graphics.items[0].geometry);

                const hiViewProGeom = projection.project(resultGeometry, new SpatialReference({
                    wkid: 102007
                }));
                let hiViewGeomEngResult = geometryEngine.intersects(hiViewProGeom, views[2].graphics.items[0].geometry);

                const prViewProGeom = projection.project(resultGeometry, new SpatialReference({
                    wkid: 5070
                }));
                let prViewGeomEngResult = geometryEngine.intersects(prViewProGeom, views[3].graphics.items[0].geometry);

                if (mainViewGeomEngResult) {
                    // lower 48
                    views[0].graphics.add(new Graphic(resultExtent, config.searchResultSymbol));
                } else if (akViewGeomEngResult) {
                    views[1].graphics.add(new Graphic(resultExtent, config.searchResultSymbol));
                } else if (hiViewGeomEngResult) {
                    views[2].graphics.add(new Graphic(resultExtent, config.searchResultSymbol));
                } else if(prViewGeomEngResult) {
                    views[3].graphics.add(new Graphic(resultExtent, config.searchResultSymbol));
                } else {
                    alert("There are no results within the map's extent!");
                }

            });
        });

        // Add the search widget to the top right corner of the view
        views[0].ui.add(searchWidget, {
            position: "top-right"
        });

        document.getElementsByClassName("mini-map-container-icon")[0].addEventListener("click", event => {
            const target = event.target;
            const targetParent = target.parentElement;
            if (calcite.hasClass(target, "icon-ui-minimize")) {
                calcite.removeClass(target, "icon-ui-minimize");
                calcite.addClass(target, "icon-ui-maximize");
                targetParent.style.height = "1.5em";
            } else {
                calcite.removeClass(target, "icon-ui-maximize");
                calcite.addClass(target, "icon-ui-minimize");
                targetParent.style.height = "10em";
            }
        });


        views[0].on("click", function(event) {
            let mapPoint = event.mapPoint;
            console.debug(mapPoint);
            let response = fetchData({
                url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_PR_Counties_DroughtApp/FeatureServer/0",
                returnGeometry: false,
                outFields: ["*"],
                geometry: event.mapPoint,
                q: ""
            });
            response.then(response => {
                if (response.features.length > 0) {
                    console.debug("response1", response);
                    let selectedFeature = response.features[0];
                    document.getElementsByClassName("selected-location-label")[0].innerHTML = `${selectedFeature.attributes["CountyName"]}, ${selectedFeature.attributes["STATE_NAME"]}`;
                    document.getElementsByClassName("selected-location-population")[0].innerHTML = `Population: ${selectedFeature.attributes["CountyPop2020"]}`;

                    fetchData({
                        url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_PR_Counties_DroughtApp/FeatureServer/0",
                        returnGeometry: false,
                        outFields: ["*"],
                        q: `CountyFIPS = '${selectedFeature.attributes["CountyFIPS"]}'`
                    }).then(response => {
                        if (response.features.length > 0) {
                            console.debug("response2", response);
                            let result = response.features[0];
                            document.getElementById("jobs").innerHTML = result.attributes["CountyLabor"];
                            document.getElementById("totalSales").innerHTML = result.attributes["County_Total_Sales"];
                            document.getElementById("cornSales").innerHTML = result.attributes["County_Corn_Value"];
                            document.getElementById("soySales").innerHTML = result.attributes["County_Soy_Value"];
                            document.getElementById("haySales").innerHTML = result.attributes["County_Hay_Value"];
                            document.getElementById("wheatSales").innerHTML = result.attributes["County_WinterWheat_Value"];
                            document.getElementById("livestockSales").innerHTML = result.attributes["County_Livestock_Value"];
                        }
                    });

                    fetchData({
                        url: "https://idpgis.ncep.noaa.gov/arcgis/rest/services/NWS_Climate_Outlooks/cpc_drought_outlk/MapServer/0",
                        returnGeometry: false,
                        outFields: ["*"],
                    });
                }
            });
        });

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