import React, {useContext} from "react";

import BasemapSelector from "./form/BasemapSelector";
import GDInput from "./form/GDInput";
import GDDateRange from "./form/GDDateRange";
import GDSelect from "./form/GDSelect";

import {EditorContext} from "./constants";

export default function PreImageCollectionDesigner({isDual = false, prefixPath = ""}) {
    const {getWidgetDesign} = useContext(EditorContext);
    const currentIndex = getWidgetDesign("indexName", prefixPath);
    const currentSourceType = getWidgetDesign("sourceType", prefixPath);
    const currentSourceName = getWidgetDesign("sourceName", prefixPath);
    const availableBands = {
        "Landsat": "BLUE, GREEN,RED, NIR, SWIR1, TEMP, SWIR2",
        "Sentinel2": "Aerosols, BLUE, GREEN, RED, RED_EDGE_1, RED_EDGE_2, RED_EDGE_3, NIR, RED_EDGE_4, WATER_VAPOR, CIRRUS, SWIR1, SWIR2",
        "NICFI": " R, G, B, N"
    };

    return (
        <>
            {!isDual && <BasemapSelector/>}
            <GDSelect
                dataKey="sourceName"
                items={["Landsat", "Sentinel-2", "NICFI"]}
                prefixPath={prefixPath}
                title="Imagery Source"
            />
            <GDSelect
                dataKey="sourceType"
                items={["Index", "Composite"]}
                prefixPath={prefixPath}
                title="Imagery Source Type"
            />
            <GDDateRange prefixPath={prefixPath}/>
            { ["Index", undefined].includes(currentSourceType) && (
                getWidgetDesign("sourceName") === "Landsat" ? (
                    <GDSelect
                        dataKey="indexName"
                        items={["NDVI", "EVI", "EVI 2", "NDMI", "NDWI"]}
                        prefixPath={prefixPath}
                        title="Band to graph"
                    />
                ) : getWidgetDesign("sourceName") === "NICFI" ? (
                    <GDSelect
                        dataKey="indexName"
                        items={["NDVI", "R", "G", "B", "N"]}
                        prefixPath={prefixPath}
                        title="Band to graph"
                    />
                ) : getWidgetDesign("sourceName") === "Sentinel2" ? (
                    <GDSelect
                        dataKey="indexName"
                        items={["NDVI", "EVI", "EVI 2", "NDMI", "NDWI"]}
                        prefixPath={prefixPath}
                        title="Band to graph"
                    />
                ) : (
                    // default undefined is Landsat.
                    <GDSelect
                        dataKey="indexName"
                        items={["NDVI", "EVI", "EVI 2", "NDMI", "NDWI"]}
                        prefixPath={prefixPath}
                        title="Band to graph"
                    />
                )
            )}
            {["Composite"].includes(currentSourceType) && (
                <>
                    <label>Available Bands: </label>
                    <label>{availableBands[currentSourceName]}</label>
                    <GDInput
                        dataKey="bands"
                        placeholder="XX,XX,XX"
                        prefixPath={prefixPath}
                        title="Bands"
                    />
                    <GDInput
                        dataKey="min"
                        placeholder="-1,0.5,0.7"
                        prefixPath={prefixPath}
                        title="Min"
                    />
                    <GDInput
                        dataKey="max"
                        placeholder="10,11,15"
                        prefixPath={prefixPath}
                        title="Max"
                    />
                    <GDInput
                        dataKey="cloudLessThan"
                        placeholder="90"
                        prefixPath={prefixPath}
                        title="Cloud Score"
                    />
                </>
            )}
        </>
    );
}
