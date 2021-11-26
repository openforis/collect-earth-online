import React, {useContext, useState} from "react";
import _ from "lodash";

import BaseMapSelector from "./form/BaseMapSelector";
import GDCheck from "./form/GDCheck";
import GDSelect from "./form/GDSelect";
import ImageAssetDesigner from "./ImageAssetDesigner";
import ImageCollectionAssetDesigner from "./ImageCollectionAssetDesigner";
import PreImageCollectionDesigner from "./PreImageCollectionDesigner";
import {EditorContext} from "./constants";

export default function DualImageryDesigner() {
    const [step1, setStep1] = useState(true);
    const {getWidgetDesign} = useContext(EditorContext);

    const widgetTypes = {
        imageAsset: {
            title: "Image Asset",
            WidgetDesigner: ImageAssetDesigner
        },
        imageCollectionAsset: {
            title: "Image Collection Asset",
            WidgetDesigner: ImageCollectionAssetDesigner
        },
        preImageCollection: {
            title: "Preloaded Image Collections",
            WidgetDesigner: PreImageCollectionDesigner
        }
    };
    const widgetSelectList = _.map(
        widgetTypes,
        ({title}, key) => ({id: key, display: title})
    );
    const selectedWidget = getWidgetDesign("type", step1 ? "image1" : "image2");
    const {WidgetDesigner} = widgetTypes[selectedWidget] || {};
    return (
        <>
            <BaseMapSelector/>
            <label>Imagery Selection</label>
            <div className="d-flex justify-content-between align-items-center">
                <GDCheck dataKey="swipeAsDefault" title="Swipe as default"/>
                <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setStep1(!step1)}
                    type="button"
                >
                    {step1 ? "Next Image" : "Previous Image" }
                </button>
            </div>
            {/* FIXME, changing this type wont correctly reset widget design */}
            {/* I probably got too clever with the path thing.  Look at middleware or specific set dual function. */}
            {step1
                ? (
                    <GDSelect
                        key="image1"
                        dataKey="type"
                        items={widgetSelectList}
                        prefixPath="image1"
                        title="Bottom Imagery Type"
                    />
                ) : (
                    <GDSelect
                        key="image2"
                        dataKey="type"
                        items={widgetSelectList}
                        prefixPath="image2"
                        title="Top Imagery Type"
                    />
                )}
            {WidgetDesigner && (
                <WidgetDesigner
                    isDual
                    prefixPath={step1 ? "image1" : "image2"}
                />
            )}
        </>
    );
}
