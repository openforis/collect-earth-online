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
                    : ("Untimed")
                }
            </div>
        </div>
    );
}
