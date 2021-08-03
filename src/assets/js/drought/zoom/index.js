import { loadModules } from 'esri-loader';

export function init(params) {
    addZoomWidget(params.view, params.position);
}


function addZoomWidget(view, position) {
    loadModules([
        "esri/widgets/Zoom"
    ]).then(([Zoom]) => {
        const zoomWidget = new Zoom({
            view: view
        });
        view.ui.add(zoomWidget, {
            position: position
        });
    });
}