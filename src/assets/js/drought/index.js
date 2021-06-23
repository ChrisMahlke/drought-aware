import "../../style/drought.scss";
import jsonResponse from ".//data.json";
import config from './config.json';

import { loadCss, loadModules } from 'esri-loader';

import * as calcite from "calcite-web";
import * as d3 from "d3";
import {main} from "d3/dist/package";

window.onSignInHandler = (portal) => {
    // initialize calcite
    calcite.init();
    // esri styles
    loadCss();

    loadModules([
        "esri/geometry/support/webMercatorUtils",
        "esri/layers/GraphicsLayer",
        "esri/Graphic",
        "esri/geometry/Extent",
        "esri/geometry/geometryEngine",
        "esri/geometry/projection",
        "esri/geometry/SpatialReference",
        "esri/views/MapView",
        "esri/WebMap",
        "esri/tasks/QueryTask",
        "esri/tasks/support/Query",
        "esri/geometry/Point",
        "esri/geometry/Polygon",
        "esri/widgets/Search",
        "esri/geometry/support/GeographicTransformationStep",
        "esri/geometry/support/GeographicTransformation",
        "esri/core/watchUtils",
    ]).then(([webMercatorUtils, GraphicsLayer, Graphic, Extent, geometryEngine, projection,
                 SpatialReference, MapView, WebMap, QueryTask, Query,
                 Point, Polygon, Search, GeographicTransformationStep, GeographicTransformation, watchUtils]) => {

        //if (portal === undefined) {
        let webmap = new WebMap({
            portalItem: {
                id: "ab5bf0057f11443ca86d78e7d1998da5"//"665ae29aea72474591b3f853f5ec3689"//
            }
        });

        let mainView = new MapView({
            container: "mainMapView",
            map: webmap,
            zoom: 2,
            extent: {
                xmax: 2841527.165071185,
                xmin: -2991495.024884269,
                ymax: 3191062.7476635515,
                ymin: 252581.70093458006,
                spatialReference: {
                    wkid: 5070
                }
            },
            spatialReference: {
                // NAD_1983_Contiguous_USA_Albers
                wkid: 5070
            },
            constraints: {
                rotationEnabled: false,
                minScale: 40000000,
                maxScale: 0
            }
        });
        mainView.popup = null;
        mainView.ui.components = [];
        let viewMask = {
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

        let akView = new MapView({
            container: "akView",
            map: webmap,
            zoom: 3,
            extent: {
                xmin: 396381,
                ymin: -2099670,
                xmax: 3393803,
                ymax: 148395,
                spatialReference: {
                    wkid: 5936
                }
            },
            spatialReference: {
                // WGS_1984_EPSG_Alaska_Polar_Stereographic
                wkid: 5936
            },
            ui: {
                components: []
            }
        });
        akView.popup = null;
        const akViewViewGeometry = Polygon.fromExtent(akView.extent);
        const akViewGraphic = new Graphic({
            geometry: akViewViewGeometry,
            symbol: viewMask
        });
        akView.graphics.add(akViewGraphic);

        let hiView = new MapView({
            container: "hiView",
            map: webmap,
            extent: {
                xmin: -342537,
                ymin: 655453,
                xmax: 231447,
                ymax: 1023383,
                spatialReference: {
                    wkid: 102007
                }
            },
            spatialReference: {
                // Hawaii_Albers_Equal_Area_Conic
                wkid: 102007
            },
            ui: {
                components: []
            }
        });
        hiView.popup = null;
        const hiViewViewGeometry = Polygon.fromExtent(hiView.extent);
        const hiViewGraphic = new Graphic({
            geometry: hiViewViewGeometry,
            symbol: viewMask
        });
        hiView.graphics.add(hiViewGraphic);

        let prView = new MapView({
            container: "prView",
            map: webmap,
            extent: {
                xmin: 2979131.20455834,
                ymin: -149630.81150056463,
                xmax: 3433834.4375183396,
                ymax: 110260.77268655399,
                spatialReference: {
                    wkid: 5070
                }
            },
            spatialReference: {
                // Hawaii_Albers_Equal_Area_Conic
                wkid: 5070
            },
            ui: {
                components: []
            }
        });
        prView.popup = null;
        const prViewViewGeometry = Polygon.fromExtent(prView.extent);
        const prViewGraphic = new Graphic({
            geometry: prViewViewGeometry,
            symbol: viewMask
        });
        prView.graphics.add(prViewGraphic);

        const cs2 = new SpatialReference({
            wkid: 5070
        });

        let symbol = {
            type: "simple-marker",  // autocasts as new SimpleMarkerSymbol()
            style: "circle",
            color: "blue",
            size: "10px",  // pixels
            outline: {  // autocasts as new SimpleLineSymbol()
                color: [ 255, 255, 0 ],
                width: 1  // points
            }
        };

        let searchWidget = new Search();
        searchWidget.on("search-complete", function(event) {
            console.debug("search-complete");
            console.debug(event.results[0].results[0]);

            projection.load().then(function (evt) {
                const mainViewSR = new SpatialReference({
                    wkid: 5070
                });
                const mainViewProGeom = projection.project(event.results[0].results[0].feature.geometry, mainViewSR);
                console.debug("mainViewProGeom", mainViewProGeom);
                let mainViewGeomEngResult = geometryEngine.intersects(mainViewProGeom, mainView.graphics.items[0].geometry);
                console.debug("mainViewGeomEngResult", mainViewGeomEngResult);

                const akViewSR = new SpatialReference({
                    wkid: 5936
                });
                const akViewProGeom = projection.project(event.results[0].results[0].feature.geometry, akViewSR);
                let akViewGeomEngResult = geometryEngine.intersects(akViewProGeom, akView.graphics.items[0].geometry);
                console.debug("akViewGeomEngResult", akViewGeomEngResult);

                const hiViewSR = new SpatialReference({
                    wkid: 102007
                });
                const hiViewProGeom = projection.project(event.results[0].results[0].feature.geometry, hiViewSR);
                let hiViewGeomEngResult = geometryEngine.intersects(hiViewProGeom, hiView.graphics.items[0].geometry);
                console.debug("hiViewGeomEngResult", hiViewGeomEngResult);

                if (mainViewGeomEngResult) {
                    // lower 48
                    mainView.graphics.add(new Graphic(event.results[0].results[0].extent, symbol));
                } else if (akViewGeomEngResult) {
                    console.debug(event.results[0].results[0].feature)
                    akView.graphics.add(new Graphic(event.results[0].results[0].extent, symbol));
                    akView.goTo({
                        target: event.results[0].results[0].feature.geometry,
                        zoom: 5
                    }).catch(function(error) {
                        if (error.name !== "AbortError") {
                            console.error(error);
                        }
                    });
                } else if (hiViewGeomEngResult) {
                    hiView.graphics.add(new Graphic(event.results[0].results[0].extent, symbol));
                } else {
                    alert("Nothing");
                }
            });
        });

        // Add the search widget to the top right corner of the view
        mainView.ui.add(searchWidget, {
            position: "top-right"
        });

        mainView.on("click", function(event) {
            let mapPoint = event.mapPoint;
            console.debug(mapPoint);

            queryService({
                url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_PR_Counties_DroughtApp/FeatureServer/0",
                returnGeometry: false,
                outFields: ["*"],
                geometry: event.mapPoint,
                q: ""
            }).then(response => {
                if (response.features.length > 0) {
                    console.debug(response);
                    let selectedFeature = response.features[0];
                    document.getElementsByClassName("selected-location-label")[0].innerHTML = `${selectedFeature.attributes["CountyName"]}, ${selectedFeature.attributes["STATE_NAME"]}`;
                    document.getElementsByClassName("selected-location-population")[0].innerHTML = `Population: ${selectedFeature.attributes["CountyPop2020"]}`;
                    //selectedFeature.attributes["STATE_NAME"];
                }
            });

            /*queryService({
                url: "https://services9.arcgis.com/RHVPKKiFTONKtxq3/ArcGIS/rest/services/US_Drought_Intensity_v1/FeatureServer/1",
                returnGeometry: false,
                outFields: ["*"],
                geometry: event.mapPoint,
                q: ""
            }).then(response => {
                if (response.features.length > 0) {
                    console.debug(response);
                }
            });*/
        });
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
                let width = 715;
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