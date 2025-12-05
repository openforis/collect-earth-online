import React, { useContext } from "react";
import { ProjectContext } from "./constants";

import AssignPlots from "./AssignPlots";
import QualityControl from "./QualityControl";
import { PlotDesign, PlotDesignReview, NewPlotDesign} from "./PlotDesign";

export default function PlotStep({ getTotalPlots, projectType, templatePlots = [] }) {
  const { institutionUserList, aoiFeatures, useTemplatePlots, availability } = useContext(ProjectContext);  
  const totalPlots = getTotalPlots();
  return (
    <>
      {useTemplatePlots ? (
        <PlotDesignReview templatePlots={templatePlots}/>
      ) : (
        <PlotDesign
          aoiFeatures={aoiFeatures}
          institutionUserList={institutionUserList}
          totalPlots={totalPlots}
          projectType={projectType}
        />                    
      )}
      {availability === "published" &&
       <NewPlotDesign
         aoiFeatures={aoiFeatures}
         institutionUserList={institutionUserList}
         totalPlots={totalPlots}
         projectType={projectType}
       />}
      {(projectType !== "simplified") ? (
       <div className="row mr-1">
         <AssignPlots institutionUserList={institutionUserList} totalPlots={totalPlots} />
         <QualityControl institutionUserList={institutionUserList} totalPlots={totalPlots} />
       </div>) : null }
    </>
  );
}
