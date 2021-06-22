import "../../style/curate.scss";
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

    if (portal === undefined) {
        console.debug("NOT SIGNED IN");
    } else {
        console.debug("SIGNED IN");
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
            "esri/geometry/support/GeographicTransformation"
        ]).then(([webMercatorUtils, GraphicsLayer, Graphic, Extent, geometryEngine, projection,
                             SpatialReference, MapView, WebMap, QueryTask, Query,
                             Point, Polygon, Search, GeographicTransformationStep, GeographicTransformation]) => {

            let webmap = new WebMap({
                portalItem: {
                    id: "ab5bf0057f11443ca86d78e7d1998da5"
                }
            });

            let mainView = new MapView({
                container: "mapDiv",
                map: webmap,
                zoom: 2,
                extent: {
                    xmin: -3094834,
                    ymin: -44986,
                    xmax: 2752687,
                    ymax: 3271654,
                    spatialReference: {
                        wkid: 5070
                    }
                },
                spatialReference: {
                    // NAD_1983_Contiguous_USA_Albers
                    wkid: 5070
                },
                constraints: {
                    rotationEnabled: false
                }
            });
            mainView.popup = null;

            let viewMask = {
                type: "simple-fill",  // autocasts as new SimpleFillSymbol()
                color: [128, 128, 128, 0.0],
                outline: {  // autocasts as new SimpleLineSymbol()
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

            let akView = new MapView({
                container: "akViewDiv",
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

            let hiView = new MapView({
                container: "hiViewDiv",
                map: webmap,
                zoom: 2,
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

            /*
            let prView = new MapView({
                container: "prView",
                map: webmap,
                zoom: 2,
                extent: {
                    xmin:-7605722.95,
                    ymin:1875651.07,
                    xmax: -7157496.21,
                    ymax: 2242548.81,
                    spatialReference: {
                        wkid: 102007
                    }
                },
                spatialReference: {
                    wkid: 102007
                },
                ui: {
                    components: []
                }
            });
            prView.popup = null;
            */

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

            mainView.on("click", function(event) {
                let centerPt = event.mapPoint;

                projection.load().then(function (evt) {
                    const pGeom = projection.project(centerPt, cs2);
                    console.debug("pGeom", pGeom);
                    mainView.graphics.add(new Graphic(pGeom, symbol));



                    console.debug("mainView.graphics.items[0].geometry", mainView.graphics.items[0].geometry)
                    //mainView.graphics.add(new Graphic(centerPt, symbol));
                    //console.debug(mainView.graphics);
                    console.debug("centerPt", centerPt)
                    let intersects1 = geometryEngine.intersects(centerPt, mainView.graphics.items[0].geometry);
                    console.debug("intersects1", intersects1);

                    //console.debug("----------------------------");
                    //let intersects2 = geometryEngine.intersects(pGeom, mainView.graphics.items[0].geometry);
                    //console.debug("intersects2", intersects2);
                    //console.debug(pGeom)
                    //let intersects2 = geometryEngine.intersects(pGeom, mainView.graphics.items[0].geometry);
                    //console.debug("intersects2", intersects2);
                });
            });

            let searchWidget = new Search();
            searchWidget.on("search-complete", function(event) {
                console.debug("search-complete");
                console.debug(event.results[0].results[0]);

                projection.load().then(function (evt) {
                    const pGeom = projection.project(event.results[0].results[0].feature.geometry, cs2);
                    //mainView.graphics.add(new Graphic(pGeom, symbol));

                    let contains = geometryEngine.intersects(pGeom, mainView.graphics.items[0].geometry);
                    console.debug("contains", contains);
                    if (contains) {
                        // lower 48
                        mainView.graphics.add(new Graphic(event.results[0].results[0].extent, symbol));
                    } else {
                        akView.graphics.add(new Graphic(event.results[0].results[0].extent, symbol));
                    }
                });
            });

            // Add the search widget to the top right corner of the view
            mainView.ui.add(searchWidget, {
                position: "top-right"
            });

            //mainView.when(disableZooming);

            // main map (Webmap)
            // https://arcgis-content.maps.arcgis.com/home/item.html?id=ab5bf0057f11443ca86d78e7d1998da5
            //
            // Query Layer (Feature Layer)
            // https://arcgis-content.maps.arcgis.com/home/item.html?id=2b64a8bfbe0c4e1292393c91c0d72a21
            // County: {CountyName}, State: {STATE_NAME}  [393939]
            // Population: {CountyPop2020}; {StatePop2020} [393939]
            //
            // Monthly Drought Outlook (Map Image Layer)
            // https://arcgis-content.maps.arcgis.com/home/item.html?id=fa875c5c407c493b8935d4cfbf110d23
            //
            // Consecutive Weeks in Drought (Feature Layer sublayer=1)
            // https://arcgis-content.maps.arcgis.com/home/item.html?id=9731f9062afd45f2be7b3bf2e050fbfa
            //
            // Agriculture Impact (Feature Layer)
            // https://arcgis-content.maps.arcgis.com/home/item.html?id=2b64a8bfbe0c4e1292393c91c0d72a21
            //
            // County Timeseries (Feature Layer | subLayer 1)
            // State Timeseries (Feature Layer | subLayer 0)
            // https://arcgis-content.maps.arcgis.com/home/item.html?id=9731f9062afd45f2be7b3bf2e050fbfa
            /*mainView.on("click", function(event) {
                getAgriculturalImpact({
                    url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_PR_Counties_DroughtApp/FeatureServer/0",
                    returnGeometry: false,
                    outFields: ["*"],
                    geometry: event.mapPoint,
                    q: ""
                }).then(response => {
                    if (response.features.length > 0) {
                        let attrs = response.features[0].attributes;
                        console.debug(attrs);
                        document.getElementById("selected-location-county").innerHTML = attrs["CountyName"];
                        document.getElementById("selected-location-state").innerHTML = attrs["STATE_NAME"];
                        document.getElementById("agrJobs").innerHTML = attrs["CountyLabor"];
                        document.getElementById("agrTotalSales").innerHTML = attrs["County_Total_Sales"];
                        document.getElementById("agrCorn").innerHTML = attrs["County_Corn_Value"];
                        document.getElementById("agrSoy").innerHTML = attrs["County_Soy_Value"];
                        document.getElementById("agrHay").innerHTML = attrs["County_Hay_Value"];
                        document.getElementById("agrWheat").innerHTML = attrs["County_WinterWheat_Value"];
                        document.getElementById("liveStock").innerHTML = attrs["County_Livestock_Value"];
                    }
                });
            });*/

            function getAgriculturalImpact(params) {
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
                    console.debug(inputDataset)
                    let margin = {
                        top: 5,
                        right: 0,
                        bottom: 0,
                        left: 25
                    };
                    let width = 800;
                    let height = 100;

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
        });
    }
}