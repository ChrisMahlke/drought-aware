import config from '../config.json';
import * as RequestUtils from './RequestUtils';
import { loadModules } from 'esri-loader';
import axios from 'axios';

export async function getData(url, options) {
    try {
        return await axios.get(url, {
            params: options
        });
    } catch(error) {
        alert(error);
    }
}

export function getContent(params) {
    let q = params.q;
    let categoryQueryParams = params.categoryQueryParams;
    if (q !== '') {
        q = "(" + params.q + ")";
    } else {
        q = '';
    }
    
    return RequestUtils.requestJSON({
        "url": config.SHARING_CONTENT_URL + "/groups/" + config.CURATION_GROUP_ID +
        "/search?f=json" +
        "&num=" + params.num +
        "&start=" + params.start +
        "&sortField=" + params.sortField +
        "&sortOrder=" + params.sortOrder +
        categoryQueryParams +
        "&q=" + q +
        "=&token=" + params.portal.credential.token
    });
}

export function getItemFromGroup(itemID) {
    return new Promise((resolve, reject) => {
        loadModules([
            "esri/request"
        ]).then(([esriRequest]) => {
            esriRequest(config.SHARING_CONTENT_URL + "/groups/" + config.CURATION_GROUP_ID + "/search", {
                responseType: 'json',
                query: {
                    f: 'json',
                    q: 'id:' + itemID
                },
                callbackParamName: "callback",
                token: config.PORTAL.credential.token
            }).then(response => {
                resolve(response.data);
            }, error => {
                resolve(error);
            });
        });
    });
}

export function retrieveItemOwners(params) {
    let promises = [];
    let items = params.items;
    items.forEach(result => {
        let owner = result.owner;
        // No need to retrieve information about an item owner if we already retrieved it
        if (owner in config.ITEM_OWNERS) {

        } else {
            // store empty value/placeholder with item owner as key in the Item Owners data model
            config.ITEM_OWNERS[owner] = {};
            // request URL
            let requestUrl = `${config.SHARING_COMMUNITY_URL}/users/${owner}?f=json&token=${config.PORTAL.credential.token}`;
            promises.push(axios.get(requestUrl));
        }
    });
    return Promise.all(promises);
}

export function retrieveAllCuratorContent(curators, qParams) {
    let promises = [];
    for (const [key, value] of Object.entries(curators)) {
        //console.log(key, value);
        promises.push(getContent({
            "q": "",
            "start": 1,
            "num": 100,
            "sortField": "modified",
            "sortOrder": "desc",
            "portal": config.PORTAL,
            "categoryQueryParams": `${qParams}${key}`
        }));
    }
    return Promise.all(promises);
}

export function cleanItems(response) {
    return response.data.results.map(result => {
        return result;
    });
}

export function mergeContent(cleanedItems, userProfiles) {
    return cleanedItems.map(cleanedItem => {
        cleanedItem.user = userProfiles[cleanedItem.owner];
        cleanedItem.user.type = cleanedItem.type;
        return cleanedItem;
    });
}

export function queryService(q, serviceUrl, returnGeometry, orderByField) {
    return new Promise((resolve, reject) => {
        loadModules([
            "esri/tasks/QueryTask",
            "esri/tasks/support/Query"
        ]).then(([QueryTask, Query]) => {
            let query = new Query();
            let queryTask = new QueryTask("https://" + serviceUrl + "?token=" + config.PORTAL.credential.token);
            query.where = q;
            query.returnGeometry = returnGeometry;
            query.outFields = ["*"];
            query.orderByFields = [orderByField];
            query.returnHiddenFields = true;
            queryTask.execute(query).then(response => {
                resolve(response);
            }, error => {
                resolve(error);
            });
        });
    });
}

export function getItemHistory(params) {
    let itemID = params.id;
    let token = params.token;
    let url = `https://${config.AUDIT_TRAIL}/query`;
    return axios.get(url, {
        params: {
            "f": "json",
            "token": token,
            "orderByFields": "EditDate",
            "outFields": "*",
            "returnGeometry": "false",
            "spatialRel": "esriSpatialRelIntersects",
            "where": params.q
        }
    });
}

export function addFeatureServiceRecord(attrs, serviceUrl) {
    return new Promise((resolve, reject) => {
        loadModules([
            "esri/request"
        ]).then(([esriRequest]) => {
            esriRequest(window.location.protocol + "//" + serviceUrl + "/applyEdits", {
                responseType: 'json',
                query: {
                    f: 'json',
                    adds: JSON.stringify({
                        "attributes": attrs
                    })
                },
                method: 'post',
                token: config.PORTAL.credential.token
            }).then(response => {
                resolve(response.data);
            }, error => {
                resolve(error);
            });
        });
    });
}

export function fetchRecordFromCommentsTable(itemID) {
    return new Promise((resolve, reject) => {
        queryService("itemID = '" + itemID + "'", config.CURATOR_COMMENTS, false, '').then(function (response) {
            resolve(response.features.map(function (feature) {
                return {
                    "OBJECTID": feature.attributes.OBJECTID,
                    "itemID": feature.attributes.itemID,
                    "itemProperty": feature.attributes.itemProperty,
                    "comment": feature.attributes.comment,
                    "CreationDate": feature.attributes.CreationDate,
                    "Creator": feature.attributes.Creator,
                    "EditDate": feature.attributes.EditDate,
                    "Editor": feature.attributes.Editor
                }
            }));
        }, function (error) {
            resolve(error);
        });
    });
}

export function getItemOwnerEmail(itemOwner) {
    return new Promise((resolve, reject) => {
        queryService("userID = '" + itemOwner + "'", config.CONTRIBUTOR_CONTACT_TABLE, false, 'lastUpdate desc').then(response => {
            let features = response.features[0];
            resolve({
                "email": features.attributes.email
            });
        }, error => {
            resolve(error);
        });
    });
}