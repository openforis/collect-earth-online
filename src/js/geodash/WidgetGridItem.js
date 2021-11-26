import React from "react";

import {UnicodeIcon} from "../utils/generalUtils";

import StatsWidget from "./StatsWidget";
import {graphWidgetList, mapWidgetList} from "./constants";
import GraphWidget from "./GraphWidget";
import MapWidget from "./MapWidget";
import DegradationWidget from "./DegradationWidget";
import WidgetContainer from "./WidgetContainer";

export default class WidgetGridItem extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isFullScreen: false
        };
    }

    /// Render functions

    generateGridColumn = (x, w) => (x + 1) + " / span " + w;

    generateGridRow = (y, h) => (y + 1) + " / span " + h;

    getTitleButtons = () => {
        const {isFullScreen} = this.state;
        const {widget} = this.props;
        return (
            <>
                {mapWidgetList.includes(widget.type) && (
                    <button
                        className="btn ml-2 p-0"
                        onClick={() => this.props.resetCenterAndZoom()}
                        style={{left: "1rem"}}
                        title="Recenter"
                        type="button"
                    >
                        <img
                            alt="Collect Earth Online"
                            src="img/geodash/ceoicon.png"
                            style={{height: "1.5rem"}}
                        />
                    </button>
                )}
                <button
                    className="btn ml-2 p-0"
                    onClick={() => this.setState({isFullScreen: !this.state.isFullScreen})}
                    style={{color: "inherit"}}
                    title="Toggle Fullscreen"
                    type="button"
                >
                    {isFullScreen ? <UnicodeIcon icon="collapse"/> : <UnicodeIcon icon="expand"/>}
                </button>
            </>
        );
    };

    getWidgetComponent = () => {
        const {widget} = this.props;
        if (mapWidgetList.includes(widget.type)) {
            return (
                <MapWidget
                    idx={this.props.idx}
                    imageryList={this.props.imageryList}
                    isFullScreen={this.state.isFullScreen}
                    mapCenter={this.props.mapCenter}
                    mapZoom={this.props.mapZoom}
                    plotExtentPolygon={this.props.plotExtentPolygon}
                    resetCenterAndZoom={this.props.resetCenterAndZoom}
                    setCenterAndZoom={this.props.setCenterAndZoom}
                    syncMapWidgets={this.syncMapWidgets}
                    vectorSource={this.props.vectorSource}
                    visiblePlotId={this.props.visiblePlotId}
                    widget={widget}
                />
            );
        } else if (graphWidgetList.includes(widget.type)) {
            return (
                <GraphWidget
                    initCenter={this.props.initCenter}
                    isFullScreen={this.state.isFullScreen}
                    plotExtentPolygon={this.props.plotExtentPolygon}
                    vectorSource={this.props.vectorSource}
                    widget={widget}
                />
            );
        } else if (widget.type === "statistics") {
            return (
                <StatsWidget
                    plotExtentPolygon={this.props.plotExtentPolygon}
                    widgetId={widget.id}
                />
            );
        } else if (widget.type === "degradationTool") {
            return (
                <DegradationWidget
                    idx={this.props.idx}
                    imageryList={this.props.imageryList}
                    initCenter={this.props.initCenter}
                    isFullScreen={this.state.isFullScreen}
                    mapCenter={this.props.mapCenter}
                    mapZoom={this.props.mapZoom}
                    plotExtentPolygon={this.props.plotExtentPolygon}
                    resetCenterAndZoom={this.props.resetCenterAndZoom}
                    setCenterAndZoom={this.props.setCenterAndZoom}
                    vectorSource={this.props.vectorSource}
                    visiblePlotId={this.props.visiblePlotId}
                    widget={widget}
                />
            );
        } else {
            return (
                <img
                    alt="Blank Widget"
                    className="img-responsive"
                    height="200"
                    src="data:image/gif;base64,R0lGODlhAQABAIAAAHd3dwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=="
                    width="200"
                />
            );
        }
    };

    render() {
        const {isFullScreen} = this.state;
        const {widget} = this.props;
        // TODO this probably can be return this.getWidgetHtml()
        return (
            <>
                {isFullScreen && (
                    <div className="full-screen"/>
                )}
                <div
                    className={`grid-item ${widget.layout.h} ${isFullScreen && "full-widget"}`}
                    id={"widget_" + widget.id}
                    style={{
                        gridColumn: this.generateGridColumn(widget.layout.x, widget.layout.w),
                        gridRow: this.generateGridRow(widget.layout.y, widget.layout.h)
                    }}
                >
                    <WidgetContainer
                        title={widget.name}
                        titleButtons={this.getTitleButtons()}
                    >
                        {this.getWidgetComponent()}
                    </WidgetContainer>
                </div>
            </>
        );
    }
}
