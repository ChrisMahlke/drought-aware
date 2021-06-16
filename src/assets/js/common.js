import "../style/common.scss";

import GlobalNavUtils from './utils/GlobalNavUtils';
import OauthManager from './utils/OauthManager';

const globalNavUtils = new GlobalNavUtils();
const oauthManager = new OauthManager();


const initOAuthBtnClickHandler = (portal) => {
    const userData = portal ? {
        id: portal.user.username,
        name: portal.user.fullName,
        group: portal.name,
        image: portal.user.thumbnailUrl
    } : null;

    globalNavUtils.init({
        userData: userData,
        onSignIn: () => {
            oauthManager.signIn();
        },
        onSignOut: () => {
            oauthManager.signOut();
        }
    });
};

const init = () => {
    // this is a temp app ID I created to test the oauth manager, will need to replace it to the real one later
    oauthManager.init({
        appID: 'YQFWcA7Pn6zqYVCv',
        signInSuccessHandler: (portal) => {
            initOAuthBtnClickHandler(portal);
            if (window.onSignInHandler) {
                window.onSignInHandler(portal);
            }
        }
    });
};

init();