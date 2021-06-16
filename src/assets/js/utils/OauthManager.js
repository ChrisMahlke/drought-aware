import { loadModules } from 'esri-loader';

export default function OauthManager() {

    // js api modules
    let info = null;
    let esriId = null;
    let Portal = null;

    // oauth manager properties
    let appID = null;
    let userCredential = null;
    let isAnonymous = true;
    let signInSuccessHandler = null;

    const init = (options = {}) => {
        appID = options.appID || null;
        signInSuccessHandler = options.signInSuccessHandler || null;
        if (!appID) {
            console.error('oauth appid is required to init oauth manager');
            return;
        }

        loadModules([
            "esri/identity/OAuthInfo",
            "esri/identity/IdentityManager",
            "esri/portal/Portal"
        ]).then(([
            OAuthInfo, esriIdentityManager, Portal
        ]) => {
            _setOauthInfo(OAuthInfo);
            _setEsriId(esriIdentityManager);
            _setPortalModule(Portal);
            _startUp();
        });
    };

    const _setOauthInfo = (OAuthInfo) => {
        info = new OAuthInfo({
            appId: "qFLDoXBECP10OhW0",
            portalUrl: "https://www.arcgis.com",
            popup: false
        });
    };

    const _setEsriId = (esriIdentityManager) => {
        esriId = esriIdentityManager;
    };

    const _setPortalModule = (PortalClass) => {
        Portal = PortalClass;
    };

    const _startUp = () => {
        esriId.useSignInPage = false;
        esriId.registerOAuthInfos([info]);
        esriId.checkSignInStatus(info.portalUrl + "/sharing").then((res) => {
            _setUserCredential(res);
            _initPortal();
        }).catch(() => {
            // Anonymous view
            _triggerSignInSuccessHandler();
        });
    };

    const _setUserCredential = (credentialObject) => {
        userCredential = credentialObject;
        isAnonymous = credentialObject ? false : true;
    };

    const _initPortal = () => {
        const portal = new Portal({
            "url": "https://www.arcgis.com"
        });
        // Setting authMode to immediate signs the user in once loaded
        portal.authMode = "immediate";
        // Once loaded, user is signed in
        portal.load().then(function () {
            // console.log("signed in user's portal >", portal);
            _triggerSignInSuccessHandler(portal);
        });
    };

    const _triggerSignInSuccessHandler = (res) => {
        if (signInSuccessHandler) {
            signInSuccessHandler(res);
        }
    };

    const signIn = () => {
        esriId.getCredential(info.portalUrl + "/sharing").then((res) => {
            _setUserCredential(res);
        });
    };

    const signOut = () => {
        esriId.destroyCredentials();
        window.location.reload();
    };

    const checkIsAnonymous = () => {
        return isAnonymous;
    };

    return {
        init,
        signIn,
        signOut,
        checkIsAnonymous
    };
};