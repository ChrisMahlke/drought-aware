import { loadModules } from 'esri-loader';

export function init(params) {
    addLegendWidget(params.view, params.position);
}


function addLegendWidget(view, position) {
    loadModules([
        "esri/widgets/Legend"
    ]).then(([Legend]) => {
        const {
            map : {
                allLayers: {
                    items = { items: [] }
                }
            },
        } = view;

        let agrLayer = items.filter(layer => {
            return layer.title === "TotalAgSales Centroids - copy";
        });

        if (agrLayer.length > 0) {
            let legendWidget = new Legend({
                view: view,
                layerInfos: [{
                    layer: agrLayer[0]
                }]
            });
            view.ui.add(legendWidget, {
                position: position
            });
        }
    });
}