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
                dataKey="dataType"
                items={["NDVI", "EVI", "EVI 2", "NDMI", "NDWI", "Custom"]}
                title="Data Type"
            />
            {widgetDesign.dataType === "Custom" && (
                <>
                    <GetBands
                        asset={widgetDesign.imageCollection}
                        bands={bands}
                        hideLabel
                        setBands={setBands}
                        type="imageCollection"
                    />
                    <GDSelect dataKey="graphBand" items={bands} title="Band to graph"/>
                    {/* FIXME, this key is not graphBand */}
                    <GDSelect dataKey="graphBand" items={["Min", "Max", "Mean"]} title="Reducer"/>
                </>
            )}
            <GDDateRange/>
        </>
    );
}
