import React, {useContext} from "react";
import {ProjectContext} from "./constants";

import AssignPlots from "./AssignPlots";
import QualityControl from "./QualityControl";
import {PlotDesign, PlotDesignReview} from "./PlotDesign";

export default function PlotStep({getTotalPlots, disableHelpComponent}) {
    const {institutionUserList, aoiFeatures, useTemplatePlots} = useContext(ProjectContext);
    const totalPlots = getTotalPlots();
    return (
        <>
            {useTemplatePlots
                ? <PlotDesignReview/>
                : (
                    <PlotDesign
                        aoiFeatures={aoiFeatures}
                        disableHelpComponent={disableHelpComponent}
                        institutionUserList={institutionUserList}
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
