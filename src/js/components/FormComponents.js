import React from "react";
import {ButtonSvgIcon} from "./svg/SvgIcon";
import {UnicodeIcon} from "../utils/generalUtils";

export function FormLayout({title, children}) {
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

export function SectionBlock({title, children}) {
    return (
        <div className={title === "Survey Rules Design" ? "row m-1" : "row mb-3"}>
            <div className="col">
                <h2 className="header px-0" style={{fontSize: "1.25rem", padding: ".75rem"}}>{title}</h2>
                {children}
            </div>
        </div>
    );
}

export class CollapsibleSectionBlock extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showContent: props.showContent || false,
            height: props.showContent ? "auto" : "0px",
            myRef: null
        };
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.height === "auto" && this.state.height !== "auto") {
            setTimeout(() => this.setState({height: "0px"}), 1);
        }
    }

    setInnerRef = ref => this.setState({myRef: ref});

    toggleOpenClose = () => this.setState({
        showContent: !this.state.showContent,
        height: this.state.height !== "auto" && this.state.showContent ? "0px" : this.state.myRef.scrollHeight
    });

    updateAfterTransition = () => {
        if (this.state.showContent) {
            this.setState({height: "auto"});
        }
    };

    render() {
        const {title, children} = this.props;
        return (
            <div>
                <h2
                    className="header"
                    onClick={() => this.toggleOpenClose()}
                    style={{
                        textAlign: "left",
                        fontSize: "1.25rem",
                        padding: ".75rem",
                        cursor: "pointer",
                        margin: "0 0 .5rem 0"
                    }}
                >
                    {title}
                    <span
                        style={{
                            transition: "transform 150ms linear 0s",
                            transform: this.state.showContent && "scaleY(-1)",
                            float: "right",
                            marginRight: "2rem"
                        }}
                    >
                        <UnicodeIcon icon="downCaret"/>
                    </span>
                </h2>
                <div
                    ref={this.setInnerRef}
                    onTransitionEnd={() => this.updateAfterTransition()}
                    style={{
                        height: this.state.height,
                        overflow: "hidden",
                        transition: "height 250ms linear 0s"
                    }}
                >
                    {children}
                </div>
            </div>
        );
    }
}

export function StatsCell({title, children}) {
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

export function StatsRow({title, plots, analysisTime, titleHref}) {
    return (
        <div className="StatsRow row mx-1 py-1 border-bottom">
            <div className="col-7">
                {titleHref
                    ? <a href={titleHref} rel="noreferrer noopener" target="_blank">{title}</a>
                    : title}
            </div>
            <div className="col-2">
                <span className="badge badge-pill bg-lightgreen">{plots} plots</span>
            </div>
            <div className="col-3">
                {analysisTime
                    ? (
                        <span className="badge badge-pill bg-lightgreen">
                            {analysisTime >= 60
                                ? `${(analysisTime / 60).toFixed(2)} mins/plot`
                                : `${analysisTime} secs/plot`}
                        </span>
                    ) : ("--")}
            </div>
        </div>
    );
}

export class ExpandableImage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            fullSize: false
        };
    }

    getImageStyle = () => (this.state.fullSize
        ? {
            border: "1px solid #808080",
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
            height: "auto"
        } : {
            border: "1px solid #808080",
            ...this.props.previewStyles
        });

    getMainDivStyle = () => (this.state.fullSize
        ? {
            cursor: "pointer",
            position: "fixed",
            zIndex: "100",
            left: "0",
            top: "0",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.1)"
        } : {
            cursor: "pointer"
        });

    render() {
        const {src} = this.props;
        return (
            <div
                className="ExpandableImage"
                onClick={() => this.setState({fullSize: !this.state.fullSize})}
                style={this.getMainDivStyle()}
            >
                <img
                    alt="pane"
                    className={this.state.fullSize
                        ? "ExpandableImage__previewImg fullSize"
                        : "ExpandableImage__previewImg"}
                    src={src}
                    style={this.getImageStyle()}
                />
            </div>
        );
    }
}

export function CollapsibleTitle({title, showGroup, toggleShow}) {
    return (
        <div
            className="CollapsibleTitle__Title row p-1"
            style={{borderBottom: "2px solid black", margin: "0 0 .5rem 0"}}
        >
            <button
                className="btn btn-outline-darkgray btn-sm"
                onClick={toggleShow}
                type="button"
            >
                {showGroup ? <ButtonSvgIcon icon="downArrow" size="0.9rem"/> : <ButtonSvgIcon icon="rightArrow" size="0.9rem"/>}
            </button>
            <h3 className="ml-2" style={{marginBottom: "0"}}>{title}</h3>
        </div>
    );
}
