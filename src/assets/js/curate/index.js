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
            "esri/Map",
            "esri/views/MapView",
            "esri/WebMap",
            "esri/layers/FeatureLayer"
        ]).then(([
            Map, MapView, WebMap, FeatureLayer
                         ]) => {

            let countyLayer = new FeatureLayer({
                portalItem: {
                    id: "8e61ed294160448e9423d3502068b1fe"
                },
                outFields: ["*"],
                title: "U.S. counties"
            });

            let droughtLayer = new FeatureLayer({
                portalItem: {
                    id: "3e743f2e49a8421d89bf2de02a6e2ee2"
                },
                outFields: ["*"],
                title: "U.S. Drought"
            });

            let map = new Map({
                layers: [countyLayer, droughtLayer]
            });

            let mainView = new MapView({
                container: "mapDiv",
                map: map,
                popup: {
                    highlightEnabled: false,
                    dockEnabled: true,
                    dockOptions: {
                        breakpoint: false,
                        position: "top-right"
                    }
                },
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

            let akView = new MapView({
                container: "akViewDiv",
                map: map,
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
            mainView.ui.add("akViewDiv", "bottom-left");

            let hiView = new MapView({
                container: "hiViewDiv",
                map: map,
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
            mainView.ui.add("hiViewDiv", "bottom-left");

            mainView
                .when(maintainFixedExtent)
                .then(disableNavigation)
                .then(disablePopupOnClick)
                .then(enableHighlightOnPointerMove);
            akView
                .when(disableNavigation)
                .then(disablePopupOnClick)
                .then(enableHighlightOnPointerMove);
            hiView
                .when(disableNavigation)
                .then(disablePopupOnClick)
                .then(enableHighlightOnPointerMove);

            function maintainFixedExtent(view) {
                let fixedExtent = view.extent.clone();
                // keep a fixed extent in the view
                // when the view size changes
                view.on("resize", function() {
                    view.extent = fixedExtent;
                });
                return view;
            }

            let highlight = null;
            let lastHighlight = null;
            function enableHighlightOnPointerMove(view) {
                view.whenLayerView(countyLayer).then(function(layerView) {
                    view.on("pointer-move", function(event) {
                        view.hitTest(event).then(function(response) {
                            lastHighlight = highlight;
                            // if a feature is returned, highlight it
                            // and display its attributes in the popup
                            // if no features are returned, then close the popup
                            let id = null;
                            if (response.results.length) {
                                let feature = response.results.filter(function(result) {
                                    return result.graphic.layer === countyLayer;
                                })[0].graphic;
                                feature.popupTemplate = countyLayer.popupTemplate;
                                id = feature.attributes.OBJECTID;
                                highlight = layerView.highlight([id]);
                                let selectionId = mainView.popup.selectedFeature ? mainView.popup.selectedFeature.attributes.OBJECTID : null;
                                if (highlight && id !== selectionId) {
                                    mainView.popup.open({
                                        features: [feature]
                                    });
                                }
                            } else {
                                if (mainView.popup.visible) {
                                    mainView.popup.close();
                                    mainView.popup.clear();
                                }
                            }

                            // remove the previous highlight
                            if (lastHighlight) {
                                lastHighlight.remove();
                                lastHighlight = null;
                            }
                        });
                    });
                });
            }

            // disables all navigation in the view
            function disableNavigation(view) {
                view.popup.dockEnabled = true;

                // Removes the zoom action on the popup
                view.popup.actions = [];

                // stops propagation of default behavior when an event fires
                function stopEvtPropagation(event) {
                    event.stopPropagation();
                }

                // disable mouse wheel scroll zooming on the view
                view.navigation.mouseWheelZoomEnabled = false;

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

            /*let webmap = new WebMap({
                portalItem: {
                    id: "ab5bf0057f11443ca86d78e7d1998da5"
                }
            });

            let view = new MapView({
                map: webmap,
                container: "mapDiv",
                zoom: 2
            });
            view.popup = null;
            view.on("click", function(event) {
                console.debug(event)
            });*/
        });
    }
}