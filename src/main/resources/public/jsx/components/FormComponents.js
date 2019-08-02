import React from "react";
import { UnicodeIcon } from "../utils/textUtils";

export function FormLayout({ title, children }) {
    return (
        <div className="row justify-content-center">
            <div className="col-xl-6 col-lg-8 border bg-lightgray mb-5">
                <div className="bg-darkgreen mb-3 no-container-margin">
                    <h1>{title}</h1>
                </div>
                {children}
            </div>
        </div>
    );
}

export function SectionBlock({ title, children }) {
    return (
        <div className={title === "Survey Rules Design" ? "row m-1" : "row mb-3"}>
            <div className="col">
                <h2 className="header px-0" style={{ fontSize: "1.25rem", padding: ".75rem" }}>{title}</h2>
                {children}
            </div>
        </div>
    );
}

export class CollapsibleSectionBlock extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showContent: false,
            myRef: null,
        };
    }

    setInnerRef = (ref) => this.setState({ myRef: ref });

    render() {
        const { title, children } = this.props;
        return (
            <div>
                <div className="col">
                    <div
                        onClick={() => this.setState({ showContent: !this.state.showContent })}
                    >
                        <h2 className="header px-0" style={{ fontSize: "1.25rem", padding: ".75rem" }}>
                            {title}
                            <span
                                style={{
                                    transition: "transform 400ms linear 0s",
                                    transform: this.state.showContent ? "rotateZ(180deg)" : "rotateZ(0deg)",
                                    float: "right",
                                    marginRight: "2rem",
                                }}
                            >
                                <UnicodeIcon icon={"downCaret"}/>
                            </span>
                        </h2>
                    </div>
                    <div
                        ref={this.setInnerRef}
                        style={{
                            height: this.state.showContent ? this.state.myRef.scrollHeight + "px" : "0px",
                            overflow: "hidden",
                            transition: "height 250ms linear 0s",
                        }}
                    >
                        <div>{children}</div>
                    </div>
                </div>
            </div>
        );
    }
}

export function StatsCell({ title, children }) {
    return (
        <div className="row mb-2">
            <div className="col-7">
                {title}
            </div>
            <div className="col-2">
                <span className="badge badge-pill bg-lightgreen">{children}</span>
            </div>
        </div>
    );
}

export function StatsRow({ title, plots, analysisTime }) {
    return (
        <div className="StatsRow row mx-1 py-1 border-bottom">
            <div className="col-8">{title}</div>
            <div className="col-2">
                <span className="badge badge-pill bg-lightgreen">{plots} plots </span>
            </div>
            <div className="col-2">
                {analysisTime ?
                    (
                        <span className="badge badge-pill bg-lightgreen">{analysisTime} sec/plot </span>
                    )
                    : ("--")
                }
            </div>
        </div>
    );
}

export class ExpandableImage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            fullSize: false,
        };
    }

    getImageStyle = () => {
        const commonAttributes = { border: "1px solid #808080" };
        if (!this.state.fullSize) {
            return { ...commonAttributes, ...this.props.previewStyles };
        } else {
            return {
                ...commonAttributes,
                float: "none",
                position: "fixed",
                top: "60px",
                bottom: "0",
                left: "0",
                right: "0",
                margin: "auto",
                overflow: "auto",
                maxWidth: "99%",
                maxHeight: "calc(98% - 60px)",
                width: "auto",
                height: "auto",
            };
        }
    }

    getMainDivStyle = () => {
        const commonAttributes = { cursor: "pointer" };
        if (this.state.fullSize) {
            return {
                ...commonAttributes,
                position: "fixed",
                zIndex: "100",
                left: "0",
                top: "0",
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0,0,0,0.1)",
            };
        } else {
            return commonAttributes;
        }
    }

    render() {
        const { src } = this.props;
        return (
            <div
                className="ExpandableImage"
                onClick={() => this.setState({ fullSize: !this.state.fullSize })}
                style={this.getMainDivStyle()}
            >
                <img
                    src={src}
                    className={this.state.fullSize ? "ExpandableImage__previewImg fullSize" : "ExpandableImage__previewImg"}
                    style={this.getImageStyle()}
                />
            </div>
        );
    }
}
