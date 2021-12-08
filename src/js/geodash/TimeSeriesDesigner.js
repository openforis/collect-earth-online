import React, {useContext, useState} from "react";

import GDDateRange from "./form/GDDateRange";
import GDSelect from "./form/GDSelect";
import GetBands from "./form/GetBands";

import {EditorContext} from "./constants";
import GDInput from "./form/GDInput";

export default function TimeSeriesDesigner() {
    const [bands, setBands] = useState(null);
    const {getWidgetDesign} = useContext(EditorContext);
    return (
        <>
            <GDSelect
                dataKey="indexName"
                items={["NDVI", "EVI", "EVI 2", "NDMI", "NDWI", "Custom"]}
                title="Data Type"
            />
            {getWidgetDesign("indexName") === "Custom" && (
                <>
                    <GDInput
                        dataKey="assetId"
                        placeholder="LANDSAT/LC8_L1T_TOA"
                        title="GEE Image Collection Asset ID"
                    />
                    <GetBands
                        assetId={getWidgetDesign("assetId")}
                        assetType="imageCollection"
                        bands={bands}
                        hideLabel
                        setBands={setBands}
                    />
                    <GDSelect dataKey="band" disabled items={bands} title="Band to graph"/>
                    <GDSelect
                        dataKey="reducer"
                        items={["Min", "Max", "Mean", "Median", "Mode"]}
                        title="Reducer"
                    />
                </>
            )}
            <GDDateRange/>
        </>
    );
}
