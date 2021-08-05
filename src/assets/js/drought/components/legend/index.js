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

            let agrLayer = items.filter(layer => {
                return layer.title === "TotalAgSales Centroids - copy";
            });

            if (agrLayer.length > 0) {
                let widget = new Legend({
                    view: params.view,
                    layerInfos: [{
                        layer: agrLayer[0]
                    }]
                });
                params.view.ui.add(widget, {
                    position: params.position
                });
                widget.when(() => {
                    resolve(widget)
                }, error => {
                    resolve(error);
                });
            }
        });
    });
}
