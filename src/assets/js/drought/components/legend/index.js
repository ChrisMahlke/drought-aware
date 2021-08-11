import "./index.scss";
import { loadModules } from 'esri-loader';

export async function init(params) {
    return await new Promise((resolve, reject) => {
        loadModules([
            "esri/widgets/Legend"
        ]).then(([Legend]) => {
            const {
                map: {
                    allLayers: {
                        items = {items: []}
                    }
                },
            } = params.view;

            let agrLayer = items.find(layer => {
                return layer.title === "TotalAgSales Centroids";
            });

            if (agrLayer) {
                let widget = new Legend({
                    view: params.view,
                    layerInfos: [{
                        layer: agrLayer
                    }]
                });
                params.view.ui.add(widget);
                widget.when(() => {
                    resolve(agrLayer)
                }, error => {
                    reject(error);
                });
            }
        });
    });
}
