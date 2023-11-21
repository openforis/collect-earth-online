import { isValidJSON } from "../utils/generalUtils";

export const nicfiLayers = [
  "2015-12_2016-05",
  "2016-06_2016-11",
  "2016-12_2017-05",
  "2017-06_2017-11",
  "2017-12_2018-05",
  "2018-06_2018-11",
  "2018-12_2019-05",
  "2019-06_2019-11",
  "2019-12_2020-05",
  "2020-06_2020-08",
  "2020-09",
  "2020-10",
  "2020-11",
  "2020-12",
  "2021-01",
  "2021-02",
  "2021-03",
  "2021-04",
  "2021-05",
  "2021-06",
  "2021-07",
  "2021-08",
  "2021-09",
  "2021-10",
  "2021-11",
  "2021-12",
  "2022-01",
  "2022-02",
  "2022-03",
];

const outOfRange = (num, low, high) => isNaN(num) || parseInt(num) < low || parseInt(num) > high;

const dateRangeValidator = ({ startDate, endDate }) =>
  startDate && endDate && new Date(startDate) > new Date(endDate)
    ? "Start date must be smaller than the end date."
    : "";

const urlValidator = (url) =>
  /^(?:http|https):\/\/[\w.-]+(?:\.[\w-]+)+[\w\-.,@?^=%&{}:;/~\\+#]+$/.test(url);

const olProjectionValidator = (value) => !/crs|srs|epsg|wgs/im.test(value);

export const imageryOptions = [
  // Note optionalProxy is for optionally proxied imagery. optionalProxy = false && defaultProxy = true are always proxied.
  // Default type is text, default parent is none, a referenced parent must be entered as a json string
  // Parameters can be defined one level deep. {paramParent: {paramChild: "", fields: "", fromJsonStr: ""}}
  {
    type: "GeoServer",
    label: "WMS Imagery",
    optionalProxy: true,
    defaultProxy: false,
    params: [
      {
        key: "geoserverUrl",
        display: "WMS URL",
        sanitizer: (value) => (value.endsWith("?") ? value.slice(0, -1) : value),
        validator: (value) =>
          !urlValidator(value)
            ? "The server address (URL) is not valid."
            : /\?.+/.test(value)
            ? 'The field "WMS Url" should not contain the query string. Please put those values in the field "Additional WMS Params (as JSON object)".'
            : "",
      },
      { key: "LAYERS", display: "WMS Layer Name", parent: "geoserverParams" },
      {
        key: "geoserverParams",
        display: "Additional WMS Params (JSON format)",
        required: false,
        type: "JSON",
        validator: (value) =>
          !isValidJSON(value)
            ? 'Invalid JSON in the "Visualization Parameters" field.'
            : !olProjectionValidator(value)
            ? "SRS/CRS is not valid. OpenLayers will automatically use EPSG:3857."
            : "",
      },
    ],
    // FIXME, add url if help document is created.
  },
  {
    type: "xyz",
    label: "XYZ Imagery",
    optionalProxy: false,
    defaultProxy: false,
    params: [
      {
        key: "url",
        display: "XYZ URL",
        validator: (value) =>
          !urlValidator(value)
            ? "The server address (URL) is not valid."
            : !/.*(?=.*{-?x})(?=.*{-?z})(?=.*{-?y}).*/gi.test(value)
            ? "The URL for an XYZ imagery type must include {x}, {y}, and {z}."
            : "",
      },
    ],
  },
  {
    type: "BingMaps",
    label: "Bing Maps",
    optionalProxy: false,
    defaultProxy: false,
    params: [
      {
        key: "imageryId",
        display: "Imagery Id",
        type: "select",
        options: [
          { label: "Aerial", value: "Aerial" },
          { label: "Aerial with Labels", value: "AerialWithLabels" },
        ],
      },
      { key: "accessToken", display: "Access Token" },
    ],
    url: "https://docs.microsoft.com/en-us/bingmaps/getting-started/bing-maps-dev-center-help/getting-a-bing-maps-key",
  },
  {
    type: "Planet",
    label: "Planet Monthly",
    optionalProxy: true,
    defaultProxy: true,
    params: [
      {
        key: "year",
        display: "Default Year",
        type: "number",
        validator: (value) =>
          isNaN(value) || value.toString().length !== 4 ? "Year should be 4 digit number" : "",
      },
      {
        key: "month",
        display: "Default Month",
        type: "number",
        validator: (value) => (outOfRange(value, 1, 12) ? "Month should be between 1 and 12!" : ""),
      },
      { key: "accessToken", display: "Access Token" },
    ],
    url: "https://developers.planet.com/docs/apis/data/",
  },
  {
    type: "PlanetDaily",
    label: "Planet Daily",
    optionalProxy: false,
    defaultProxy: false,
    params: [
      { key: "accessToken", display: "Access Token" },
      { key: "startDate", display: "Start Date", type: "date" },
      { key: "endDate", display: "End Date", type: "date" },
    ],
    validator: dateRangeValidator,
    url: "https://developers.planet.com/docs/apis/data/",
  },
  {
    type: "PlanetNICFI",
    label: "Planet NICFI",
    optionalProxy: false,
    defaultProxy: false,
    params: [
      { key: "accessToken", display: "Access Token" },
      {
        key: "time",
        display: "Default Time",
        type: "select",
        options: [{ label: "Newest Available", value: "newest" }],
      },
      {
        key: "band",
        display: "Default Band",
        type: "select",
        options: [
          { label: "Visible", value: "rgb" },
          { label: "Infrared", value: "cir" },
        ],
      },
    ],
    url: "https://assets.planet.com/docs/NICFI_UserGuidesFAQ.pdf",
  },
  {
    type: "SecureWatch",
    optionalProxy: true,
    defaultProxy: true,
    params: [
      {
        key: "baseUrl",
        display: "Base URL",
        type: "select",
        options: [
          {
            label: "https://securewatch.digitalglobe.com",
            value: "https://securewatch.digitalglobe.com",
          },
          {
            label: "https://services.digitalglobe.com",
            value: "https://services.digitalglobe.com",
          },
        ],
        validator: (value) =>
          !urlValidator(value) ? "The server address (URL) is not valid." : "",
      },
      { key: "connectid", display: "Connect ID" },
      {
        key: "startDate",
        display: "Start Date",
        type: "date",
        options: { max: new Date().toJSON().split("T")[0] },
      },
      {
        key: "endDate",
        display: "End Date",
        type: "date",
      },
    ],
    validator: dateRangeValidator,
  },
  {
    type: "Sentinel1",
    label: "Sentinel 1",
    optionalProxy: false,
    defaultProxy: false,
    params: [
      {
        key: "year",
        display: "Default Year",
        type: "number",
        options: { min: "2014", max: new Date().getFullYear().toString(), step: "1" },
        validator: (value) =>
          outOfRange(value, 2014, new Date().getFullYear()) || value.toString().length !== 4
            ? "Year should be 4 digit number and between 2014 and " + new Date().getFullYear()
            : "",
      },
      {
        key: "month",
        display: "Default Month",
        type: "number",
        options: { min: "1", max: "12", step: "1" },
        validator: (value) => (outOfRange(value, 1, 12) ? "Month should be between 1 and 12!" : ""),
      },
      {
        key: "bandCombination",
        display: "Band Combination",
        type: "select",
        options: [
          { label: "VH,VV,VH/VV", value: "VH,VV,VH/VV" },
          { label: "VH,VV,VV/VH", value: "VH,VV,VV/VH" },
          { label: "VV,VH,VV/VH", value: "VV,VH,VV/VH" },
          { label: "VV,VH,VH/VV", value: "VV,VH,VH/VV" },
        ],
      },
      {
        key: "min",
        display: "Min",
        type: "text",
        options: {
          placeholder: "[1-100] | [0.1,0.2,0.1]",
          step: "0.01",
        },
      },
      {
        key: "max",
        display: "Max",
        type: "text",
        options: {
          placeholder: "[2800-3200] | [0.3,0.5,0.3]",
          step: "0.01",
        },
      },
    ],
  },
  {
    type: "Sentinel2",
    label: "Sentinel 2",
    optionalProxy: false,
    defaultProxy: false,
    params: [
      {
        key: "year",
        display: "Default Year",
        type: "number",
        options: { min: "2015", max: new Date().getFullYear().toString(), step: "1" },
        validator: (value) =>
          outOfRange(value, 2015, new Date().getFullYear()) || value.toString().length !== 4
            ? "Year should be 4 digit number and between 2015 and " + new Date().getFullYear()
            : "",
      },
      {
        key: "month",
        display: "Default Month",
        type: "number",
        options: { min: "1", max: "12", step: "1" },
        validator: (value) => (outOfRange(value, 1, 12) ? "Month should be between 1 and 12!" : ""),
      },
      {
        key: "bandCombination",
        display: "Band Combination",
        type: "select",
        options: [
          { label: "True Color", value: "TrueColor" },
          { label: "False Color Infrared", value: "FalseColorInfrared" },
          { label: "False Color Urban", value: "FalseColorUrban" },
          { label: "Agriculture", value: "Agriculture" },
          { label: "Healthy Vegetation", value: "HealthyVegetation" },
          { label: "Short Wave Infrared", value: "ShortWaveInfrared" },
        ],
      },
      {
        key: "min",
        display: "Min",
        type: "text",
        options: {
          placeholder: "[1-100] | [0.1,0.2,0.1]",
          step: "0.01",
        },
      },
      {
        key: "max",
        display: "Max",
        type: "text",
        options: {
          placeholder: "[2800-3200] | [0.3,0.5,0.3]",
          step: "0.01",
        },
      },
      {
        key: "cloudScore",
        display: "Cloud Score",
        type: "number",
        options: {
          placeholder: "10-30",
          min: "0",
          max: "100",
          step: "1",
        },
        validator: (value) =>
          value && outOfRange(value, 0, 100) ? "Cloud Score should be between 0 and 100!" : "",
      },
    ],
  },
  {
    type: "GEEImage",
    label: "GEE Image Asset",
    optionalProxy: false,
    defaultProxy: false,
    params: [
      {
        key: "assetId",
        display: "Asset ID",
        options: { placeholder: "USDA/NAIP/DOQQ/n_4207309_se_18_1_20090525" },
      },
      {
        key: "visParams",
        display: "Visualization Parameters (JSON format)",
        type: "JSON",
        options: { placeholder: '{"bands": ["R", "G", "B"], "min": 0-100, "max": 2800-3200}' },
        validator: (value) =>
          !isValidJSON(value) ? 'Invalid JSON in the "Visualization Parameters" field.' : "",
      },
    ],
  },
  {
    type: "GEEImageCollection",
    label: "GEE Image Collection Asset",
    optionalProxy: false,
    defaultProxy: false,
    params: [
      {
        key: "assetId",
        display: "Asset ID",
        options: { placeholder: "LANDSAT/LC08/C01/T1_SR" },
      },
      {
        key: "startDate",
        display: "Start Date",
        type: "date",
        options: { max: new Date().toJSON().split("T")[0] },
      },
      {
        key: "endDate",
        display: "End Date",
        type: "date",
        options: { max: new Date().toJSON().split("T")[0] },
      },
      {
        key: "visParams",
        display: "Visualization Parameters (JSON format)",
        type: "JSON",
        options: { placeholder: '{"bands": ["B4", "B3", "B2"], "min": 0-100, "max": 2800-3200}' },
        validator: (value) =>
          !isValidJSON(value) ? 'Invalid JSON in the "Visualization Parameters" field.' : "",
      },
    ],
    validator: dateRangeValidator,
  },
  {
    type: "MapBoxRaster",
    label: "Mapbox Raster",
    optionalProxy: false,
    defaultProxy: false,
    params: [
      { key: "layerName", display: "Layer Name" },
      { key: "accessToken", display: "Access Token" },
    ],
    url: "https://docs.mapbox.com/help/glossary/raster-tiles-api/",
  },
  {
    type: "MapBoxStatic",
    label: "Mapbox Static",
    optionalProxy: false,
    defaultProxy: false,
    params: [
      { key: "userName", display: "User Name" },
      { key: "mapStyleId", display: "Map Style Id" },
      { key: "accessToken", display: "Access Token" },
    ],
    url: "https://docs.mapbox.com/help/glossary/static-tiles-api/",
  },
  {
    type: "OSM",
    label: "Open Street Map",
    optionalProxy: false,
    defaultProxy: false,
    params: [],
  },
];
