class Collection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentProject : null,
            stats : null,
            plotList : null,
            imageryList : null,
            currentImagery : {attribution: ""},
            imageryYearDG : 2009,
            stackingProfileDG : "Accuracy_Profile",
            imageryYearPlanet : 2018,
            imageryMonthPlanet : "03",
            mapConfig : null,
            currentPlot : null,
            userSamples : {},
            statClass : "projNoStats",
            arrowState : "arrow-down",
            showSideBar : false,
            mapClass : "fullmap",
            quitClass : "quit-full",
        };
    };

    render() {
        return (
            <React.Fragment>
                <ImageAnalysisPane />
                <SideBar/>
                <div className="modal fade" id="confirmation-quit" tabIndex="-1" role="dialog"
                     aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                    <div className="modal-dialog modal-dialog-centered" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title" id="exampleModalLongTitle">Confirmation</h5>
                                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                Are you sure you want to stop collecting data?
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary btn-sm" data-dismiss="modal">Close
                                </button>
                                <button type="button" className="btn bg-lightgreen btn-sm" id="quit-button"
                                        onClick=${"window.location='" + this.state.documentRoot + "/home'"}>OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

class ImageAnalysisPane extends React.Component {
    constructor(props) {
        super(props);
    };
    render() {
        var showSidebar;
        if(this.props.showSideBar){
            showSidebar=<div>
                <span id="action-button" name="collection-actioncall" title="Click a plot to analyze:"
                      alt="Click a plot to analyze">Click a plot to analyze, or:<p></p><br/>
                    <span className="button" onClick="collection.nextPlot()">Analyze random plot</span>
                    <br style="clear:both;"/>
                    <br style="clear:both;"/>
                </span>
            </div>
        }
        else{
            showSidebar=<div style="position:relative;">
                <span id="action-button" name="collection-actioncall" title="Select each plot to choose value"
                      alt="Select each plot to choose value">Select each dot to choose value
                </span>
            </div>
        }
        return (
            <div id="image-analysis-pane" className="collection.map"
                 className="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
                <div className="buttonHolder d-none">
                    {showSidebar}
                </div>
                <div id="imagery-info" className="row d-none">
                    <p className="col small">{this.props.currentImagery.attribution}</p>
                </div>
            </div>
        );
    }
}

class SideBar extends React.Component {

    render() {
        const collection=this.props.collection;
        return (
            <React.Fragment>
                <h2 className="header">{collection.currentProject.name}</h2>
                <SideBarFieldSet/>
                <div className="row">
                    <div className="col-sm-12 btn-block">
                        <button id="save-values-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                                type="button"
                                name="save-values" onClick="collection.saveValues()" style="opacity:0.5" disabled>
                            Save
                        </button>
                        <button className="btn btn-outline-lightgreen btn-sm btn-block mb-1" data-toggle="collapse"
                                href="#project-stats-collapse" role="button" aria-expanded="false"
                                aria-controls="project-stats-collapse">
                            Project Stats
                        </button>
                        <div className="row justify-content-center mb-1 text-center">
                            <div className="col-lg-12">
                                <fieldset id="projStats" className="collection.statClass" className="text-center">
                                    <div className="collapse" id="project-stats-collapse">
                                        <table className="table table-sm">
                                            <tbody>
                                            <tr>
                                                <td className="small">Project</td>
                                                <td className="small">{collection.currentProject.name}</td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Assigned</td>
                                                <td className="small">
                                                    {collection.stats.analyzedPlots}
                                                    ({collection.assignedPercentage()}%)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Flagged</td>
                                                <td className="small">
                                                    {collection.stats.flaggedPlots}
                                                    ({collection.flaggedPercentage()}%)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Completed</td>
                                                <td className="small">
                                                    {collection.stats.analyzedPlots + collection.stats.flaggedPlots}
                                                    ({collection.completedPercentage()}%)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Total</td>
                                                <td className="small">{collection.currentProject.numPlots}</td>
                                            </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </fieldset>
                            </div>
                        </div>
                        <button id="collection-quit-button" className="btn btn-outline-danger btn-block btn-sm"
                                type="button"
                                name="collection-quit" className="collection.quitClass" data-toggle="modal"
                                data-target="#confirmation-quit">
                            Quit
                        </button>
                    </div>
                </div>

            </React.Fragment>

        );
    }

}

class SideBarFieldSet extends React.Component {
    render() {
        return (
            <React.Fragment>
                <fieldset className="mb-3 text-center">
                    <h3>Plot Navigation</h3>
                    <div className="row">
                        <div className="col" id="go-to-first-plot">
                            <input id="go-to-first-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                                   type="button"
                                   name="new-plot" value="Go to first plot" onClick="collection.nextPlot()"/>
                        </div>
                    </div>
                    <div className="row d-none" id="plot-nav">
                        <div className="col-sm-6 pr-2">
                            <input id="new-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                                   type="button"
                                   name="new-plot" value="Skip" onClick="collection.nextPlot()"/>
                        </div>
                        <div className="col-sm-6 pl-2">
                            <input id="flag-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                                   type="button"
                                   name="flag-plot" value="Flag Plot as Bad" onClick="collection.flagPlot()"
                                   style="opacity:0.5" disabled/>
                        </div>
                    </div>
                </fieldset>
                <fieldset className="mb-3 justify-content-center text-center">
                    <h3>Imagery Options</h3>
                    <select className="form-control form-control-sm" id="base-map-source" name="base-map-source"
                            size="1"
                            value="collection.currentProject.baseMapSource" onChange="collection.setBaseMapSource()">
                        <option ng-repeat="imagery in collection.imageryList"
                                value="{ imagery.title }">{imagery.title}</option>
                    </select>
                    <select className="form-control form-control-sm" id="dg-imagery-year" name="dg-imagery-year"
                            size="1"
                            value="collection.imageryYearDG" convert-to-number
                            onChange="collection.updateDGWMSLayer()"
                            ng-show="collection.currentProject.baseMapSource == 'DigitalGlobeWMSImagery'">
                        <option value="2018">2018</option>
                        <option value="2017">2017</option>
                        <option value="2016">2016</option>
                        <option value="2015">2015</option>
                        <option value="2014">2014</option>
                        <option value="2013">2013</option>
                        <option value="2012">2012</option>
                        <option value="2011">2011</option>
                        <option value="2010">2010</option>
                        <option value="2009">2009</option>
                        <option value="2008">2008</option>
                        <option value="2007">2007</option>
                        <option value="2006">2006</option>
                        <option value="2005">2005</option>
                        <option value="2004">2004</option>
                        <option value="2003">2003</option>
                        <option value="2002">2002</option>
                        <option value="2001">2001</option>
                        <option value="2000">2000</option>
                    </select>
                    <select className="form-control form-control-sm" id="dg-stacking-profile" name="dg-stacking-profile"
                            size="1"
                            ng-model="collection.stackingProfileDG" onChange="collection.updateDGWMSLayer()"
                            ng-show="collection.currentProject.baseMapSource == 'DigitalGlobeWMSImagery'">
                        <option value="Accuracy_Profile">Accuracy Profile</option>
                        <option value="Cloud_Cover_Profile">Cloud Cover Profile</option>
                        <option value="Global_Currency_Profile">Global Currency Profile</option>
                        <option value="MyDG_Color_Consumer_Profile">MyDG Color Consumer Profile</option>
                        <option value="MyDG_Consumer_Profile">MyDG Consumer Profile</option>
                    </select>
                    <select className="form-control form-control-sm" id="planet-imagery-year" name="planet-imagery-year"
                            size="1"
                            value="collection.imageryYearPlanet" convert-to-number
                            onChange="collection.updatePlanetLayer()"
                            ng-show="collection.currentProject.baseMapSource == 'PlanetGlobalMosaic'">
                        <option value="2018">2018</option>
                        <option value="2017">2017</option>
                        <option value="2016">2016</option>
                    </select>
                    <select className="form-control form-control-sm" id="planet-imagery-month"
                            name="planet-imagery-month" size="1"
                            value="collection.imageryMonthPlanet" onChange="collection.updatePlanetLayer()"
                            ng-show="collection.currentProject.baseMapSource == 'PlanetGlobalMosaic'">
                        <option value="01">January</option>
                        <option value="02">February</option>
                        <option value="03">March</option>
                        <option value="04">April</option>
                        <option value="05">May</option>
                        <option value="06">June</option>
                        <option value="07">July</option>
                        <option value="08">August</option>
                        <option value="09">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                    </select>
                </fieldset>
                <fieldset ng-repeat="sampleValueGroup in collection.currentProject.sampleValues"
                          className="mb-1 justify-content-center text-center">
                    <h3 className="text-center">Sample Value: {sampleValueGroup.name}</h3>
                    <ul id="samplevalue" className="justify-content-center">
                        <li className="mb-1" ng-repeat="sampleValue in sampleValueGroup.values">
                            <button type="button" className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                                    id="{{ sampleValue.name + '_' + sampleValue.id }}"
                                    name="{{ sampleValue.name + '_' + sampleValue.id }}"
                                    onClick="collection.setCurrentValue(sampleValueGroup, sampleValue)">
                                <div className="circle" style="background-color:{{ sampleValue.color }}; border:solid 1px; float: left;
                                    margin-top: 4px;"></div>
                                <span className="small">{sampleValue.name}</span>
                            </button>
                        </li>
                    </ul>
                </fieldset>
            </React.Fragment>

        );
    }
}

function renderCollection(documentRoot, username, projectId,of_users_api_url,role,storage,nonPendingUsers,pageMode) {
    ReactDOM.render(
        <Institution documentRoot={documentRoot} userName={username} projectId={projectId}/>,
        document.getElementById("collection")
    );
}
