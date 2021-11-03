import React, {useState} from "react";
import BaseMapSelector from "./form/BaseMapSelector";
import GDCheck from "./form/GDCheck";

export default function DualImageryDesigner(props) {
    const [step1, setStep1] = useState(true);
    return (
        <>
            <BaseMapSelector/>
            <GDCheck dataKey="swipeAsDefault" title="Swipe as default"/>
            {step1
                ? (
                    <>
                        <h3 className="mt-4 text-center text-info">Dual imageCollection Step 1</h3>
                        <label htmlFor="data-type-1-select">Data Type</label>
                        <select
                            className="form-control"
                            id="data-type-1-select"
                            onChange={e => props.setWidgetDesign("dataType1", parseInt(e.target.value))}
                            value={props.widgetDesign.dataType1}
                        >
                            <option className="" value="-1">Please select type</option>
                            <option label="NDVI" value="NDVI">NDVI</option>
                            <option label="EVI" value="EVI">EVI</option>
                            <option label="EVI 2" value="EVI2">EVI 2</option>
                            <option label="NDMI" value="NDMI">NDMI</option>
                            <option label="NDWI" value="NDWI">NDWI</option>
                            <option label="LANDSAT 5" value="LANDSAT5">LANDSAT 5</option>
                            <option label="LANDSAT 7" value="LANDSAT7">LANDSAT 7</option>
                            <option label="LANDSAT 8" value="LANDSAT8">LANDSAT 8</option>
                            <option label="Sentinel-2" value="Sentinel2">Sentinel-2</option>
                            <option label="Image Asset" value="imageAsset">Image Asset</option>
                            <option label="Image Collection Asset" value="imageCollectionAsset">Image Collection Asset</option>
                            <option label="Custom widget" value="Custom">Custom widget</option>
                        </select>
                    </>
                ) : (
                    <>

                        <h3 className="mt-4 text-center text-info">Dual imageCollection Step 2</h3>
                        <label htmlFor="data-type-2-select">Data Type</label>
                        <select
                            className="form-control"
                            id="data-type-2-select"
                            onChange={e => props.setWidgetDesign("dataType1", parseInt(e.target.value))}
                            value={props.widgetDesign.dataType1}
                        >
                            <option className="" value="-1">Please select type</option>
                            <option label="NDVI" value="NDVI">NDVI 2</option>
                            <option label="EVI" value="EVI">EVI</option>
                            <option label="EVI 2" value="EVI2">EVI 2</option>
                            <option label="NDMI" value="NDMI">NDMI</option>
                            <option label="NDWI" value="NDWI">NDWI</option>
                            <option label="LANDSAT 5" value="LANDSAT5">LANDSAT 5</option>
                            <option label="LANDSAT 7" value="LANDSAT7">LANDSAT 7</option>
                            <option label="LANDSAT 8" value="LANDSAT8">LANDSAT 8</option>
                            <option label="Sentinel-2" value="Sentinel2">Sentinel-2</option>
                            <option label="Image Asset" value="imageAsset">Image Asset</option>
                            <option label="Image Collection Asset" value="imageCollectionAsset">Image Collection Asset</option>
                            <option label="Custom widget" value="Custom">Custom widget</option>
                        </select>

                    </>
                )}

            <button
                className="btn btn-secondary"
                onClick={() => setStep1(!step1)}
                type="button"
            >
                {step1 ? "&lArr; Step 1" : "Step 2 &rArr;"}
            </button>
        </>
    );
}
