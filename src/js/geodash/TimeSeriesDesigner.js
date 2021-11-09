import React, {useContext, useState} from "react";

import GDDateRange from "./form/GDDateRange";
import GDSelect from "./form/GDSelect";
import GetBands from "./form/GetBands";

import {EditorContext} from "./constants";
import GDInput from "./form/GDInput";

export default function TimeSeriesDesigner() {
    const [bands, setBands] = useState(null);
    const {widgetDesign} = useContext(EditorContext);
    return (
        <>
            <GDSelect
                dataKey="indexName"
                defaultSelection="NDVI"
                items={["NDVI", "EVI", "EVI 2", "NDMI", "NDWI", "Custom"]}
                title="Data Type"
            />
            {widgetDesign.indexName === "Custom" && (
                <>
                    <GDInput
                        dataKey="assetName"
                        placeholder="LANDSAT/LC8_L1T_TOA"
                        title="GEE Image Collection Asset Name"
                    />
                    <GetBands
                        asset={widgetDesign.imageCollection}
                        bands={bands}
                        hideLabel
                        setBands={setBands}
                        type="imageCollection"
                    />
                    <GDSelect dataKey="band" disabled items={bands} title="Band to graph"/>
                    <GDSelect
                        dataKey="reducer"
                        defaultSelection="min"
                        items={["Min", "Max", "Mean"]}
                        lowerCase
                        title="Reducer"
                    />
                </>
            )}
            <GDDateRange/>
        </>
    );
}
