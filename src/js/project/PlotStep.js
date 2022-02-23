import React, {useContext} from "react";
import {ProjectContext} from "./constants";

import AssignPlots from "./AssignPlots";
import QualityControl from "./QualityControl";
import {PlotDesign, PlotDesignReview} from "./PlotDesign";

export default function PlotStep({getTotalPlots, setIsHelpInactive}) {
    const {institutionUserList, aoiFeatures, useTemplatePlots} = useContext(ProjectContext);
    const totalPlots = getTotalPlots();
    return (
        <>
            {useTemplatePlots
                ? <PlotDesignReview/>
                : (
                    <PlotDesign
                        aoiFeatures={aoiFeatures}
                        institutionUserList={institutionUserList}
                        setIsHelpInactive={setIsHelpInactive}
                        totalPlots={totalPlots}
                    />
                )}
            <div className="row mr-1">
                <AssignPlots
                    institutionUserList={institutionUserList}
                    totalPlots={totalPlots}
                />
                <QualityControl
                    institutionUserList={institutionUserList}
                    totalPlots={totalPlots}
                />
            </div>
        </>
    );
}
