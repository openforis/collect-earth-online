import React, {useContext, useState} from "react";

import GDDateRange from "./form/GDDateRange";
import GDSelect from "./form/GDSelect";
import GetBands from "./form/GetBands";

import {EditorContext} from "./constants";

export default function TimeSeriesDesigner() {
    const [bands, setBands] = useState(null);
    const {widgetDesign} = useContext(EditorContext);
    return (
        <>
            <GDSelect
                dataKey="indexName"
                items={["NDVI", "EVI", "EVI 2", "NDMI", "NDWI", "Custom"]}
                title="Data Type"
            />
            {widgetDesign.indexName === "Custom" && (
                <>
                    <GetBands
                        asset={widgetDesign.imageCollection}
                        bands={bands}
                        hideLabel
                        setBands={setBands}
                        type="imageCollection"
                    />
                    <GDSelect dataKey="graphBand" disabled items={bands} title="Band to graph"/>
                    {/* FIXME why does not custom use median, but its not a choice here*/}
                    <GDSelect dataKey="graphReducer" items={["Min", "Max", "Mean"]} title="Reducer"/>
                </>
            )}
            <GDDateRange/>
        </>
    );
}
