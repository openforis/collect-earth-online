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
                defaultSelection="NDVI"
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
            {["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel2"].includes(widgetDesign.indexName) && (
                <>
                    <GDInput dataKey="bands" placeholder="XX,XX,XX" title="Bands"/>
                    <GDInput dataKey="min" placeholder="-1,0.5,0.7" title="Min"/>
                    <GDInput dataKey="max" placeholder="10,11,15" title="Max"/>
                    <GDInput dataKey="cloudLessThan" placeholder="90" title="Cloud Score"/>
                </>
            )}
        </>
    );
}
