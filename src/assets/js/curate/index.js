import "../../style/curate.scss";
import config from './config.json';

import { loadCss, loadModules } from 'esri-loader';

import * as calcite from "calcite-web";

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
            "esri/geometry/Point"
        ]).then(([MapView, WebMap, QueryTask, Query, Point]) => {

            let webmap = new WebMap({
                portalItem: {
                    id: "ab5bf0057f11443ca86d78e7d1998da5"
                }
            });

            let mainView = new MapView({
                container: "mapDiv",
                map: webmap,
                zoom: 2,
                ui: {
                    components: ["attribution"]
                }
            });
            mainView.popup = null;

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
            mainView.on("click", function(event) {
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
        });
    }
}