export const imageryOptions = [
    // Default type is text, default parent is none, a referenced parent must be entered as a json string
    // Parameters can be defined one level deep. {paramParent: {paramChild: "", fields: "", fromJsonStr: ""}}
    {
        type: "GeoServer",
        label: "WMS Imagery",
        params: [
            {
                key: "geoserverUrl",
                display: "WMS URL",
                sanitizers: [
                    url => url && url.length !== "" && url.slice(-1) === "?" ? url.slice(0, -1) : url,
                ],
            },
            {key: "LAYERS", display: "WMS Layer Name", parent: "geoserverParams"},
            {
                key: "geoserverParams",
                display: "Additional WMS Params (as JSON object)", // TODO, add {} around params if missing
                required: false,
                type: "JSON",
            },
        ],
        // FIXME, add url if help document is created.
    },
    {
        type: "BingMaps",
        label: "Bing Maps",
        params: [
            {
                key: "imageryId",
                display: "Imagery Id",
                type: "select",
                options: [
                    {label: "Aerial", value: "Aerial"},
                    {label: "Aerial with Labels", value: "AerialWithLabels"},
                ],
            },
            {key: "accessToken", display: "Access Token"},
        ],
        url: "https://docs.microsoft.com/en-us/bingmaps/getting-started/bing-maps-dev-center-help/getting-a-bing-maps-key",
    },
    {
        type: "Planet",
        label: "Planet Monthly",
        params: [
            {key: "year", display: "Default Year", type: "number"},
            {key: "month", display: "Default Month", type: "number"},
            {key: "accessToken", display: "Access Token"},
        ],
        url: "https://developers.planet.com/docs/quickstart/getting-started/",
    },
    {
        type: "PlanetDaily",
        label: "Planet Daily",
        params: [
            {key: "accessToken", display: "Access Token"},
            {key: "startDate", display: "Start Date", type: "date"},
            {key: "endDate", display: "End Date", type: "date"},
        ],
        url: "https://developers.planet.com/docs/quickstart/getting-started/",
    },
    {
        type: "PlanetNICFI",
        label: "Planet NICFI",
        params: [
            {key: "accessToken", display: "Access Token"},
            {key: "time", display: "Default Time"},
            {
                key: "band",
                display: "Default Band",
                type: "select",
                options: [
                    {label: "Visible", value: "rgb"},
                    {label: "Infrared", value: "cir"},
                ],
            },
        ],
        url: "https://assets.planet.com/docs/NICFI_UserGuidesFAQ.pdf",
    },
    {
        type: "SecureWatch",
        params: [
            {
                key: "baseUrl",
                display: "Base URL",
                type: "select",
                options: [
                    {label: "https://securewatch.digitalglobe.com", value: "https://securewatch.digitalglobe.com"},
                    {label: "https://services.digitalglobe.com", value: "https://services.digitalglobe.com"},
                ],
            },
            {key: "connectid", display: "Connect ID"},
            {
                key: "startDate",
                display: "Start Date",
                type: "date",
                options: {max: new Date().toJSON().split("T")[0]},
            },
            {
                key: "endDate",
                display: "End Date",
                type: "date",
            },
        ],
    },
    {
        type: "Sentinel1",
        label: "Sentinel 1",
        params: [
            {
                key: "year",
                display: "Default Year",
                type: "number",
                options: {min: "2014", max: new Date().getFullYear().toString(), step: "1"},
            },
            {key: "month", display: "Default Month", type: "number", options: {min: "1", max: "12", step: "1"}},
            {
                key: "bandCombination",
                display: "Band Combination",
                type: "select",
                options: [
                    {label: "VH,VV,VH/VV", value: "VH,VV,VH/VV"},
                    {label: "VH,VV,VV/VH", value: "VH,VV,VV/VH"},
                    {label: "VV,VH,VV/VH", value: "VV,VH,VV/VH"},
                    {label: "VV,VH,VH/VV", value: "VV,VH,VH/VV"},
                ],
            },
            {key: "min", display: "Min", type: "number", options: {step: "0.01"}},
            {key: "max", display: "Max", type: "number", options: {step: "0.01"}},
        ],
    },
    {
        type: "Sentinel2",
        label: "Sentinel 2",
        params: [
            {
                key: "year",
                display: "Default Year",
                type: "number",
                options: {min: "2015", max: new Date().getFullYear().toString(), step: "1"},
            },
            {key: "month", display: "Default Month", type: "number", options: {min: "1", max: "12", step: "1"}},
            {
                key: "bandCombination",
                display: "Band Combination",
                type: "select",
                options: [
                    {label: "True Color", value: "TrueColor"},
                    {label: "False Color Infrared", value: "FalseColorInfrared"},
                    {label: "False Color Urban", value: "FalseColorUrban"},
                    {label: "Agriculture", value: "Agriculture"},
                    {label: "Healthy Vegetation", value: "HealthyVegetation"},
                    {label: "Short Wave Infrared", value: "ShortWaveInfrared"},
                ],
            },
            {key: "min", display: "Min", type: "number", options: {step: "0.01"}},
            {key: "max", display: "Max", type: "number", options: {step: "0.01"}},
            {key: "cloudScore", display: "Cloud Score", type: "number", options: {min: "0", max: "100", step: "1"}},
        ],
    },
    {
        type: "GEEImage",
        label: "GEE Image Asset",
        params: [
            {
                key: "imageId",
                display: "Asset ID",
                options: {placeholder: "USDA/NAIP/DOQQ/n_4207309_se_18_1_20090525"},
            },
            {
                key: "imageVisParams",
                display: "Visualization Parameters (JSON format)",
                type: "JSON",
                options: {placeholder: "{\"bands\": [\"R\", \"G\", \"B\"], \"min\": 90, \"max\": 210}"},
            },
        ],
    },
    {
        type: "GEEImageCollection",
        label: "GEE ImageCollection Asset",
        params: [
            {
                key: "collectionId",
                display: "Asset ID",
                options: {placeholder: "LANDSAT/LC08/C01/T1_SR"},
            },
            {
                key: "startDate",
                display: "Start Date",
                type: "date",
                options: {max: new Date().toJSON().split("T")[0]},
            },
            {
                key: "endDate",
                display: "End Date",
                type: "date",
                options: {max: new Date().toJSON().split("T")[0]},
            },
            {
                key: "collectionVisParams",
                display: "Visualization Parameters (JSON format)",
                type: "JSON",
                options: {placeholder: "{\"bands\": [\"B4\", \"B3\", \"B2\"], \"min\": 0, \"max\": 2000}"},
            },
        ],
    },
    {
        type: "MapBoxRaster",
        label: "Mapbox Raster",
        params: [
            {key: "layerName", display: "Layer Name"},
            {key: "accessToken", display: "Access Token"},
        ],
        url: "https://docs.mapbox.com/help/glossary/raster-tiles-api/",
    },
    {
        type: "MapBoxStatic",
        label: "Mapbox Static",
        params: [
            {key: "userName", display: "User Name"},
            {key: "mapStyleId", display: "Map Style Id"},
            {key: "accessToken", display: "Access Token"},
        ],
        url: "https://docs.mapbox.com/help/glossary/static-tiles-api/",
    },
];
