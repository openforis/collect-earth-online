import React, {useContext} from "react";

import {EditorContext} from "../constants";
import SvgIcon from "../../components/svg/SvgIcon";

export default function BasemapSelector() {
    const {setWidgetDesign, getWidgetDesign, imagery, getInstitutionImagery, institutionId} = useContext(EditorContext);
    return (
        <div className="form-group">
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <label htmlFor="basemap-select">Basemap</label>
                <button
                    className="btn btn-sm btn-secondary mb-1"
                    onClick={getInstitutionImagery}
                    title="Refresh Basemap"
                    type="button"
                >
                    <SvgIcon icon="refresh" size="1.2rem"/>
                </button>
            </div>
            <select
                className="form-control"
                id="basemap-select"
                onChange={e => setWidgetDesign("basemapId", parseInt(e.target.value))}
                value={getWidgetDesign("basemapId")}
            >
                {(imagery || [])
                    .map(({id, title}) => <option key={id} value={id}>{title}</option>)}
            </select>
            <div style={{fontSize: ".85em", padding: "0 .5rem"}}>
                Adding imagery to basemaps is available on the&nbsp;
                <a href={`/review-institution?institutionId=${institutionId}`} rel="noreferrer noopener" target="_blank">
                    institution review page
                </a>
                &nbsp;in the imagery tab.
            </div>
        </div>
    );
}
