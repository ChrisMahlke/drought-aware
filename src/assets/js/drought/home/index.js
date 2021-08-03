import { loadModules } from 'esri-loader';

export function init(params) {
    addHomeWidget(params.view, params.position);
}


function addHomeWidget(view, position) {
    loadModules([
        "esri/widgets/Home"
    ]).then(([Home]) => {
        const widget = new Home({
            view: view
        });
        view.ui.add(widget, {
            position: position
        });
    });
}