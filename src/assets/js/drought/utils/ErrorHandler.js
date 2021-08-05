export function hydrateErrorAlert(error) {
    document.getElementsByClassName("alert-title")[0].innerHTML = error.message;
    document.getElementsByClassName("alert-link")[0].innerHTML = "contact support";
    document.getElementsByClassName("custom-alert")[0].setAttribute("icon", "exclamation-mark-circle");
    document.getElementsByClassName("custom-alert")[0].setAttribute("color", "red");
    document.getElementsByClassName("custom-alert")[0].setAttribute("auto-dismiss-duration", "slow");
    document.getElementsByClassName("custom-alert")[0].setAttribute("active", "true");
    document.getElementsByClassName("custom-alert")[0].setAttribute("aria-hidden", "true");
}

export function hydrateWebMapErrorAlert(error) {
    document.getElementsByClassName("alert-title")[0].innerHTML = error.message;
    document.getElementsByClassName("alert-message")[0].innerHTML = `${error.details.error.message}<br />${error.details.error.details.url}</br />`;
    document.getElementsByClassName("alert-link")[0].innerHTML = "contact support";
    document.getElementsByClassName("custom-alert")[0].setAttribute("icon", "exclamation-mark-circle");
    document.getElementsByClassName("custom-alert")[0].setAttribute("color", "red");
    document.getElementsByClassName("custom-alert")[0].setAttribute("auto-dismiss-duration", "slow");
    document.getElementsByClassName("custom-alert")[0].setAttribute("active", "true");
    document.getElementsByClassName("custom-alert")[0].setAttribute("aria-hidden", "true");
}

export function hydrateMapViewErrorAlert(error) {
    console.log("MAPVIEW", error);
}
