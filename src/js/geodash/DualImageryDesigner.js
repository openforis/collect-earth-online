import React, { useContext, useState } from "react";
import _ from "lodash";

import BasemapSelector from "./form/BasemapSelector";
import GDSelect from "./form/GDSelect";
import ImageAssetDesigner from "./ImageAssetDesigner";
import ImageCollectionAssetDesigner from "./ImageCollectionAssetDesigner";
import PreImageCollectionDesigner from "./PreImageCollectionDesigner";

import { EditorContext } from "./constants";

export default function DualImageryDesigner() {
  const [step1, setStep1] = useState(true);
  const { getWidgetDesign } = useContext(EditorContext);

  const widgetTypes = {
    imageAsset: {
      title: "Image Asset",
      WidgetDesigner: ImageAssetDesigner,
    },
    imageCollectionAsset: {
      title: "Image Collection Asset",
      WidgetDesigner: ImageCollectionAssetDesigner,
    },
    preImageCollection: {
      title: "Preloaded Image Collections",
      WidgetDesigner: PreImageCollectionDesigner,
    },
  };
  const widgetSelectList = _.map(widgetTypes, ({ title }, key) => ({ id: key, display: title }));
  const selectedWidget = getWidgetDesign("type", step1 ? "image1" : "image2");
  const { WidgetDesigner } = widgetTypes[selectedWidget] || {};
  return (
    <>
      <BasemapSelector />
      <div className="d-flex justify-content-between align-items-center mb-2">
        <label style={{ fontWeight: "bold" }}>Imagery Selection</label>
        <button className="btn btn-sm btn-secondary" onClick={() => setStep1(!step1)} type="button">
          {step1 ? "Next Image" : "Previous Image"}
        </button>
      </div>
      {step1 ? (
        <GDSelect
          key="image1"
          dataKey="type"
          items={widgetSelectList}
          prefixPath="image1"
          title="Top Imagery Type"
        />
      ) : (
        <GDSelect
          key="image2"
          dataKey="type"
          items={widgetSelectList}
          prefixPath="image2"
          title="Bottom Imagery Type"
        />
      )}
      {WidgetDesigner && <WidgetDesigner isDual prefixPath={step1 ? "image1" : "image2"} />}
    </>
  );
}
