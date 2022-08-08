import "../css/geo-dash.css";

import React from "react";
import ReactDOM from "react-dom";

import { Feature } from "ol";
import { buffer as ExtentBuffer } from "ol/extent";
import { Circle, Point } from "ol/geom";
import { transform as projTransform } from "ol/proj";
import { fromExtent } from "ol/geom/Polygon";
import { Vector } from "ol/source";

import GeoDashNavigationBar from "./geodash/GeoDashNavigationBar";
import WidgetGridItem from "./geodash/WidgetGridItem";

import { mercator } from "./utils/mercator";
import { isArray, isNumber } from "./utils/generalUtils";
import { gridRowHeight } from "./geodash/constants";

class Geodash extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      widgets: null,
      mapCenter: null,
      mapZoom: null,
      imageryList: [],
      initCenter: null,
      initZoom: null,
      vectorSource: null,
    };
  }

  /// Lifecycle

  componentDidMount() {
    Promise.all([
      this.getInstitutionImagery(),
      this.getWidgetsByProjectId(),
      this.getVectorSource(),
    ])
      .then((data) =>
        this.setState({ imageryList: data[0], widgets: data[1], vectorSource: data[2] })
      )
      .catch((response) => {
        console.log(response);
        alert("Error initializing Geo-Dash. See console for details.");
      });
  }

  /// API

  getInstitutionImagery = () =>
    fetch(`/get-institution-imagery?institutionId=${this.props.institutionId}`).then((response) =>
      response.ok ? response.json() : Promise.reject(response)
    );

  getWidgetsByProjectId = () =>
    fetch(`/geo-dash/get-project-widgets?projectId=${this.props.projectId}`).then((response) =>
      response.ok ? response.json() : Promise.reject(response)
    );

  getFeatures = async () => {
    const { plotShape, radius, center, plotId } = this.props;
    if (plotShape === "polygon") {
      const plotJsonObject = await fetch(`/get-plot-sample-geom?plotId=${plotId}`).then(
        (response) => (response.ok ? response.json() : Promise.reject(response))
      );
      return [plotJsonObject.plotGeom, ...(plotJsonObject.sampleGeoms || [])]
        .filter((e) => e)
        .map((geom) => new Feature({ geometry: mercator.parseGeoJson(geom, true) }));
    } else if (plotShape === "square") {
      const point = new Point(
        projTransform(JSON.parse(center).coordinates, "EPSG:4326", "EPSG:3857")
      );
      const pointCenter = point.getFlatCoordinates();
      const [centerX, centerY] = pointCenter;
      const numRadius = Number(radius);
      return [
        new Feature(
          fromExtent([
            centerX - numRadius,
            centerY - numRadius,
            centerX + numRadius,
            centerY + numRadius,
          ])
        ),
      ];
    } else if (plotShape === "circle") {
      return [
        new Feature(
          new Circle(
            projTransform(JSON.parse(center).coordinates, "EPSG:4326", "EPSG:3857"),
            Number(radius)
          )
        ),
      ];
    } else {
      return [];
    }
  };

  getVectorSource = async () => new Vector({ features: await this.getFeatures() });

  /// State

  setCenterAndZoom = (center, zoom) => {
    if (isArray(center) && isNumber(zoom)) {
      if (this.state.initCenter) {
        this.setState({
          mapCenter: center,
          mapZoom: zoom,
        });
      } else {
        this.setState({
          initCenter: center,
          initZoom: zoom,
          mapCenter: center,
          mapZoom: zoom,
        });
      }
    }
  };

  resetCenterAndZoom = () => {
    this.setCenterAndZoom(this.state.initCenter, this.state.initZoom);
  };

  /// Helpers

  extentToPolygon = (extent) => {
    const extentArray = JSON.parse(decodeURI(extent));
    return [
      [extentArray[0], extentArray[1]],
      [extentArray[2], extentArray[1]],
      [extentArray[2], extentArray[3]],
      [extentArray[0], extentArray[3]],
      [extentArray[0], extentArray[1]],
    ];
  };

  /// Render

  render() {
    const { widgets } = this.state;
    return (
      <div
        style={{
          margin: ".75rem 1rem 3rem",
          textAlign: "center",
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gridAutoRows: `${gridRowHeight}px`,
          gap: ".5rem",
        }}
      >
        {widgets === null ? (
          <div style={{ gridArea: "2 / 2 / span 2 / span 10" }}>
            <h1>Retrieving Geo-Dash configuration for this project</h1>
          </div>
        ) : widgets.length > 0 ? (
          widgets.map((widget, idx) => (
            <WidgetGridItem
              key={widget.id}
              idx={idx}
              imageryList={this.state.imageryList}
              initCenter={this.mapCenter}
              mapCenter={this.state.mapCenter}
              mapZoom={this.state.mapZoom}
              plotExtentPolygon={this.extentToPolygon(this.props.plotExtent)}
              resetCenterAndZoom={this.resetCenterAndZoom}
              setCenterAndZoom={this.setCenterAndZoom}
              vectorSource={this.state.vectorSource}
              visiblePlotId={this.props.visiblePlotId}
              widget={widget}
            />
          ))
        ) : (
          <div style={{ gridArea: "2 / 2 / span 2 / span 10" }}>
            <h1>There are no Geo-Dash widgets for this project</h1>
          </div>
        )}
      </div>
    );
  }
}

export function pageInit(args) {
  ReactDOM.render(
    <GeoDashNavigationBar
      page={() => <Geodash {...args} />}
      userName={args.userName || "guest"}
      visiblePlotId={args.visiblePlotId ? parseInt(args.visiblePlotId) : -1}
    />,
    document.getElementById("app")
  );
}
