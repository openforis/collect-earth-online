import React from "react";

import Switch from "../components/Switch";
import GraphWidget from "./GraphWidget";
import MapWidget from "./MapWidget";

export default class DegradationWidget extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      imageDate: "",
      stretch: 321,
      degDataType: "landsat",
      sarGraphBand: "VV",
    };
  }

  toggleDegDataType = (checked) => {
    this.setState({
      imageDate: "",
      degDataType: checked ? "sar" : "landsat",
    });
  };

  handleSelectDate = (date) => {
    this.setState({ imageDate: date });
  };

  render() {
    const { degDataType } = this.state;
    const { widget } = this.props;
    const selectOptions = [
      { label: "VV", value: "VV" },
      { label: "VH", value: "VH" },
      { label: "VV/VH", value: "VV/VH" },
    ];
    return (
      <div
        id={"degradation_" + widget.id}
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <MapWidget
          degDataType={this.state.degDataType}
          idx={this.props.idx}
          imageDate={this.state.imageDate}
          imageryList={this.props.imageryList}
          isFullScreen={this.props.isFullScreen}
          mapCenter={this.props.mapCenter}
          mapZoom={this.props.mapZoom}
          plotExtentPolygon={this.props.plotExtentPolygon}
          resetCenterAndZoom={this.props.resetCenterAndZoom}
          sarGraphBand={this.state.sarGraphBand}
          setCenterAndZoom={this.props.setCenterAndZoom}
          stretch={this.state.stretch}
          vectorSource={this.props.vectorSource}
          widget={this.props.widget}
        />

        <div className="settings-block">
          {degDataType === "landsat" ? (
            <>
              <div className="settings-item">
                <label className="font-weight-bold" htmlFor="map-select">
                  Map Bands:
                </label>
                <select
                  className="form-control"
                  id="map-select"
                  onChange={(e) => this.setState({ stretch: parseInt(e.target.value) })}
                  style={{
                    maxWidth: "65%",
                    display: "inline-block",
                    fontSize: ".8rem",
                    height: "30px",
                  }}
                  value={this.state.stretch}
                >
                  <option value={321}>R,G,B</option>
                  <option value={543}>SWIR,NIR,R</option>
                  <option value={453}>NIR,SWIR,R</option>
                </select>
              </div>
              <div className="settings-item">
                <label className="font-weight-bold">{`Graph Band: ${widget.band}`}</label>
              </div>
            </>
          ) : (
            <>
              <div className="settings-item">
                <label className="settings-item font-weight-bold">Map Bands: VV, VH, VV/VH</label>
              </div>
              <div className="settings-item">
                <label className="font-weight-bold" html-for="graph-select">
                  Graph Band:{" "}
                </label>
                <select
                  className="form-control"
                  id="graph-select"
                  onChange={(e) => this.setState({ sarGraphBand: e.target.value })}
                  style={{
                    maxWidth: "85%",
                    fontSize: ".9rem",
                    height: "30px",
                  }}
                >
                  {selectOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="settings-item">
            <span className="font-weight-bold">Data: </span>
            <span className="mx-2">LANDSAT</span>
            <Switch
              check={degDataType === "sar"}
              onChange={(e) => this.toggleDegDataType(e.target.checked)}
            />
            <span className="mr-2">SAR</span>
          </div>
        </div>

        <GraphWidget
          degDataType={this.state.degDataType}
          handleSelectDate={this.handleSelectDate}
          initCenter={this.props.initCenter}
          isFullScreen={this.props.isFullScreen}
          plotExtentPolygon={this.props.plotExtentPolygon}
          sarGraphBand={this.state.sarGraphBand}
          vectorSource={this.props.vectorSource}
          widget={this.props.widget}
        />
      </div>
    );
  }
}
