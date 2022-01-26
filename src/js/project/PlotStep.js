import React, {useContext} from "react";
import {ProjectContext} from "./constants";

import AssignPlots from "./AssignPlots";
import QualityControl from "./QualityControl";
import {PlotDesign, PlotDesignReview} from "./PlotDesign";

export default function PlotStep({getTotalPlots}) {
    const {institutionUserList, boundary, useTemplatePlots} = useContext(ProjectContext);
    const totalPlots = getTotalPlots();
    return (
        <>
            {useTemplatePlots
                ? <PlotDesignReview/>
                : (
                    <PlotDesign
                        boundary={boundary}
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
