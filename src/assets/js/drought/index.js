import "../../style/curate.scss";
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

    if (portal === undefined) {
        console.debug("NOT SIGNED IN");
    } else {
        console.debug("SIGNED IN");
        loadModules([
            "esri/views/MapView",
            "esri/WebMap",
            "esri/tasks/QueryTask",
            "esri/tasks/support/Query",
            "esri/geometry/Point",
            "esri/widgets/Search"
        ]).then(([MapView, WebMap, QueryTask, Query, Point, Search]) => {

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
                ui: {
                    components: ["attribution"]
                }
            });
            mainView.popup = null;
/*
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
            });

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
                    //const jsonResponse = await d3.json(sampleDataset);
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
                        bottom: 0,
                        left: 25
                    };
                    let width = inputDataset.length;
                    let height = 150;
                    const chartElement = d3.select("#chart");
                    // create the svg
                    let svg = chartElement.append("svg")
                        .attr("width", width)
                        .attr("height", "200");
                    let g = svg.append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    // set x scale
                    let x = d3.scaleBand().rangeRound([0, width]);
                    // set y scale
                    let y = d3.scaleLinear().rangeRound([height, 0]);
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
                    // define the y axis
                    g.append("g")
                        .attr("class", "axis")
                        .attr("transform", "translate(0," + height + ")")
                        .call(d3.axisBottom(xScale));

                    g.append("g")
                        .attr("class", "axis")
                        .call(d3.axisLeft(y).ticks(null, "s"))
                        .append("text")
                        .attr("x", 2)
                        .attr("y", y(y.ticks().pop()) + 0.5)
                        .attr("dy", "0.32em")
                        .attr("fill", "#000")
                        .attr("font-weight", "bold")
                        .attr("text-anchor", "start");
                } catch(error) {
                    console.log(error);
                }
            })();
            */
        });
    }
}