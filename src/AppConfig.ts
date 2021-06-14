const AppConfig = {
    // 'webmap-id': '5f3b7605b3364e7bb2416c93fae00995', 
    // 'webmap-id': '571b442ff06f47cd9991fe22197276d1',
    'webmap-id': '4f2e99ba65e34bb8af49733d9778fb8e',
    'ari-quality-service': {
        'current': 'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/AirNowLatestContoursCombined/FeatureServer/0',
        'today': 'https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/AirNowAQIForecast/FeatureServer/0',
        'tomorrow': 'https://services.arcgis.com/cJ9YHowT8TU7DUyn/ArcGIS/rest/services/AirNowAQIForecast/FeatureServer/1'
    },
    'wind-speed-forecast-service': 'https://services9.arcgis.com/RHVPKKiFTONKtxq3/ArcGIS/rest/services/NDFD_WindSpeed_v1/FeatureServer/0',
    'enriched-population-service': 'https://services.arcgis.com/nGt4QxSblgDfeJn9/arcgis/rest/services/AirQuality_Enriched/FeatureServer/0',
    'race-info-service': 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/ACS_Population_by_Race_and_Hispanic_Origin_Boundaries/FeatureServer/2',
    'at-risk-population-service': 'https://services.arcgis.com/jIL9msH9OI208GCb/ArcGIS/rest/services/Enriched_Enriched_United_States_Tract_Boundaries_2018/FeatureServer/0'
};

export const UIConfig = {
    'main-title-component-text-color': '#6f3f14',
    'main-subtitle-component-text-color': '#a67a53',
    'main-source-component-text-color': '#6c6c6c',
    'bottom-panel-width': '100%',
    'sidebar-width': 415,
    'sidebar-background': '#d6d2c4',
    'sidebar-text-color': '#393939',
    'text-color': '#393939',
    'indicator-color': '#40C4ED', 
    'indicator-color-above-national-ave': '#d9a252',
    'above-national-ave': '#75C7E9',
    'below-national-ave': '#0878BD',

    'no-drought': '#393939',
    'abnormally-dry': '#b2a077',
    'moderate-drought': '#ccaa5b',
    'severe-drought' : '#e4985a',
    'extreme-drought' : '#e28060',
    'exceptional-drought' : '#b24543',
};

export default AppConfig;