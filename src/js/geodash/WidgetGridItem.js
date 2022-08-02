import React from "react";

import DegradationWidget from "./DegradationWidget";
import GraphWidget from "./GraphWidget";
import MapWidget from "./MapWidget";
import StatsWidget from "./StatsWidget";
import SvgIcon from "../components/svg/SvgIcon";
import WidgetContainer from "./WidgetContainer";

import { graphWidgetList, mapWidgetList } from "./constants";

export default class WidgetGridItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isFullScreen: false,
    };
  }

  /// Render functions

  generateGridColumn = (x, w) => x + 1 + " / span " + w;

  generateGridRow = (y, h) => y + 1 + " / span " + h;

  getTitleButtons = () => {
    const { isFullScreen } = this.state;
    const { widget } = this.props;
    return (
      <div className="d-flex" style={{ gap: ".5rem" }}>
        {mapWidgetList.includes(widget.type) && (
          <button
            className="btn p-0"
            onClick={() => this.props.resetCenterAndZoom()}
            style={{ color: "inherit" }}
            title="Recenter"
            type="button"
          >
            <SvgIcon color="currentColor" icon="center" size="1.5rem" />
          </button>
        )}
        <button
          className="btn p-0"
          onClick={() => this.setState({ isFullScreen: !this.state.isFullScreen })}
          style={{ color: "inherit" }}
          title="Toggle Fullscreen"
          type="button"
        >
          {isFullScreen ? (
            <SvgIcon color="currentColor" icon="collapse" size="1.5rem" />
          ) : (
            <SvgIcon color="currentColor" icon="expand" size="1.5rem" />
          )}
        </button>
      </div>
    );
  };

  getWidgetComponent = () => {
    const { widget } = this.props;
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
      return <StatsWidget plotExtentPolygon={this.props.plotExtentPolygon} widgetId={widget.id} />;
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
    const { isFullScreen } = this.state;
    const { widget } = this.props;
    return (
      <>
        {isFullScreen && <div className="full-screen-background" />}
        <div
          className={`grid-item ${widget.layout.h} ${isFullScreen && "full-widget"}`}
          id={"widget_" + widget.id}
          style={{
            gridColumn: this.generateGridColumn(widget.layout.x, widget.layout.w),
            gridRow: this.generateGridRow(widget.layout.y, widget.layout.h),
          }}
        >
          <WidgetContainer title={widget.name} titleButtons={this.getTitleButtons()}>
            {this.getWidgetComponent()}
          </WidgetContainer>
        </div>
      </>
    );
  }
}
