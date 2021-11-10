import React from "react";
import Switch from "../components/Switch";

import GraphWidget from "./GraphWidget";
import MapWidget from "./MapWidget";

export default class DegradationWidget extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedDate: "",
            degDataType: "landsat",
            selectSarGraphBand: "VV"
        };
    }

    handleDegDataType = dataType => {
        this.setState({
            degDataType: dataType
        });
    };

    handleSelectDate = date => {
        this.setState({selectedDate: date});
    };

    render() {
        const {degDataType} = this.state;
        const {widget} = this.props;
        const selectOptions = [
            {label: "VV", value: "VV"},
            {label: "VH", value: "VH"},
            {label: "VV/VH", value: "VV/VH"}
        ];
        return (
            <div id={"degradation_" + widget.id} style={{flex: 1, display: "flex", flexDirection: "column"}}>
                <MapWidget
                    degDataType={this.state.degDataType}
                    imageryList={this.props.imageryList}
                    isFullScreen={this.props.isFullScreen}
                    mapCenter={this.props.mapCenter}
                    mapZoom={this.props.mapZoom}
                    plotExtent={this.props.plotExtent}
                    plotExtentPolygon={this.props.plotExtentPolygon}
                    resetCenterAndZoom={this.props.resetCenterAndZoom}
                    selectedDate={this.state.selectedDate}
                    selectSarGraphBand={this.state.selectSarGraphBand}
                    setCenterAndZoom={this.props.setCenterAndZoom}
                    vectorSource={this.props.vectorSource}
                    widget={this.props.widget}
                />

                <div className="d-flex justify-content-between">
                    {degDataType === "landsat"
                        ? (
                            <div className="col-6">
                                <span className="ctrl-text font-weight-bold">Map Bands: </span>
                                <select
                                    className="form-control"
                                    onChange={e => this.setState({stretch: parseInt(e.target.value)})}
                                    style={{
                                        maxWidth: "65%",
                                        display: "inline-block",
                                        fontSize: ".8rem",
                                        height: "30px"
                                    }}
                                >
                                    <option value={321}>R,G,B</option>
                                    <option value={543}>SWIR,NIR,R</option>
                                    <option value={453}>NIR,SWIR,R</option>
                                </select>
                            </div>
                        ) : (
                            <div className="col-6">
                                <span className="ctrl-text font-weight-bold">Map Band Combination: </span>
                                <span className="ctrl-text">VV, VH, VV/VH </span>
                            </div>
                        )}
                    <div className="col-6">
                        <span className="ctrl-text font-weight-bold">Data: </span>
                        <span className="ctrl-text mr-1">LANDSAT</span>
                        <Switch
                            check={degDataType === "sar"}
                            onChange={e => this.setState({degDataType: e.target.checked ? "sar" : "landsat"})}
                        />
                        <span className="ctrl-text mr-2">SAR</span>
                    </div>
                </div>

                <GraphWidget
                    degDataType={this.state.degDataType}
                    handleSelectDate={this.handleSelectDate}
                    initCenter={this.props.initCenter}
                    isFullScreen={this.props.isFullScreen}
                    plotExtentPolygon={this.props.plotExtentPolygon}
                    vectorSource={this.props.vectorSource}
                    widget={this.props.widget}
                />
                {degDataType === "sar" && (
                    <div className="d-flex">
                        <span className="ctrl-text font-weight-bold">Graph Band: </span>
                        <select
                            className="form-control"
                            onChange={e => this.setState({selectSarGraphBand: e.target.value})}
                            style={{
                                maxWidth: "85%",
                                fontSize: ".9rem",
                                height: "30px"
                            }}
                        >
                            {selectOptions.map(el => <option key={el.value} value={el.value}>{el.label}</option>)}
                        </select>
                    </div>
                )}
            </div>
        );
    }
}
