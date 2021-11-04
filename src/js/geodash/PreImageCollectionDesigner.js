import React, {useContext} from "react";

import BaseMapSelector from "./form/BaseMapSelector";
import GDInput from "./form/GDInput";
import GDDateRange from "./form/GDDateRange";
import GDSelect from "./form/GDSelect";

import {EditorContext} from "./constants";

export default function PreImageCollectionDesigner() {
    const {widgetDesign} = useContext(EditorContext);
    return (
        <>
            <BaseMapSelector/>
            <GDSelect
                dataKey="indexName"
                items={[
                    "NDVI",
                    "EVI",
                    "EVI 2",
                    "NDMI",
                    "NDWI",
                    "LANDSAT 5",
                    "LANDSAT 7",
                    "LANDSAT 8",
                    "Sentinel-2"]}
                title="Data Type"
            />
            <GDDateRange/>
            {["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel-2"].includes(widgetDesign.indexName) && (
                <>
                    <GDInput dataKey="bands" placeholder="XX,XX,XX" title="Bands"/>
                    {/* TODO set these to number inputs */}
                    <GDInput dataKey="min" placeholder="-1" title="Min"/>
                    <GDInput dataKey="max" placeholder="100" title="Max"/>
                    <GDInput dataKey="cloudLessThan" placeholder="90" title="Cloud Score"/>
                </>
            )}
        </>
    );
}
