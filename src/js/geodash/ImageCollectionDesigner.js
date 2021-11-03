import React, {useContext} from "react";

import BaseMapSelector from "./form/BaseMapSelector";
import GDInput from "./form/GDInput";
import GDDateRange from "./form/GDDateRange";
import GDSelect from "./form/GDSelect";

import {EditorContext} from "./constants";

export default function ImageCollectionDesigner() {
    const {widgetDesign} = useContext(EditorContext);
    return (
        <>
            <BaseMapSelector/>
            <GDSelect
                dataKey="dataType"
                items={[
                    "NDVI",
                    "EVI",
                    "EVI 2",
                    "NDMI",
                    "NDWI",
                    "LANDSAT 5",
                    "LANDSAT 7",
                    "LANDSAT 8",
                    "Sentinel-2",
                    "Custom"]}
                title="Data Type"
            />
            <GDDateRange/>
            {/* FIXME These need to be a path visParams.bands */}
            {["LANDSAT5", "LANDSAT7", "LANDSAT8", "Sentinel-2"].includes(widgetDesign.dataType) && (
                <>
                    <GDInput dataKey="bands" placeholder="XX,XX,XX" title="Bands"/>
                    <GDInput dataKey="min" placeholder="-1" title="Min"/>
                    <GDInput dataKey="max" placeholder="100" title="Max"/>
                    <GDInput dataKey="cloudLessThan" placeholder="90" title="Cloud Score"/>
                </>
            )}
        </>
    );
}
