import "../../css/custom.css";

import React from "react";
import SvgIcon from "./SvgIcon";
import {getLanguage, capitalizeFirst} from "../utils/generalUtils";

function LogOutButton({userName, uri}) {
    const fullUri = uri + window.location.search;
    const loggedOut = !userName || userName === "guest";

    const logout = () => fetch("/logout", {method: "POST"})
        .then(() => window.location = "/home");

    return loggedOut
        ? (
            <button
                className="btn btn-lightgreen btn-sm"
                onClick={() => window.location = "/login?returnurl=" + encodeURIComponent(fullUri)}
                type="button"
            >
                Login/Register
            </button>

        ) : (
            <>
                <li className="nav-item my-auto" id="username">
                    <span className="nav-link disabled">{userName}</span>
                </li>
                <button
                    className="btn btn-outline-red btn-sm"
                    onClick={logout}
                    type="button"
                >
                    Logout
                </button>
            </>
        );
}

class HelpSlideDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentSlideIdx: 0
        };
    }

    render() {
        const {currentSlideIdx} = this.state;
        const {alt, body, img} = this.props.helpSlides[currentSlideIdx];
        const isLastSlide = currentSlideIdx === this.props.helpSlides.length - 1;
        return (
            <div
                onClick={this.props.closeHelpMenu}
                style={{
                    position: "fixed",
                    zIndex: "100",
                    left: "0",
                    top: "0",
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0,0,0,0.4)"
                }}
            >
                <div className="col-8 col-sm-12">
                    <div
                        className="overflow-hidden container-fluid d-flex flex-column"
                        onClick={e => e.stopPropagation()}
                        style={{
                            backgroundColor: "white",
                            border: "1.5px solid",
                            borderRadius: "5px",
                            maxHeight: "calc(100vh - 150px)",
                            margin: "90px auto",
                            width: "fit-content"
                        }}
                    >
                        <div className="row justify-content-between bg-lightgreen p-2">
                            <h2 className="ml-2">{capitalizeFirst(this.props.page)} Help</h2>
                            <div onClick={this.props.closeHelpMenu}>
                                <SvgIcon icon="close" size="2rem"/>
                            </div>
                        </div>
                        <div className="d-flex" style={{minHeight: "0", minWidth: "0"}}>
                            <div className="d-flex flex-column justify-content-between">
                                <p className="p-3" style={{width: "22vw"}}>{body}</p>
                                <div className="d-flex justify-content-end">
                                    <button
                                        className="btn btn-lightgreen btn-sm m-2"
                                        disabled={currentSlideIdx === 0}
                                        onClick={() => this.setState({currentSlideIdx: currentSlideIdx - 1})}
                                        type="button"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        className="btn btn-lightgreen btn-sm m-2"
                                        onClick={() => {
                                            if (isLastSlide) {
                                                this.props.closeHelpMenu();
                                            } else {
                                                this.setState({currentSlideIdx: currentSlideIdx + 1});
                                            }
                                        }}
                                        type="button"
                                    >
                                        {isLastSlide ? "Finish" : "Next"}
                                    </button>
                                </div>
                            </div>
                            <div style={{height: "100%", width: "33vw"}}>
                                <img
                                    alt={alt || ""}
                                    src={"locale/" + this.props.page + img}
                                    style={{maxHeight: "100%", maxWidth: "100%"}}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export class NavigationBar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            helpSlides: [],
            showHelpMenu: false,
            page: ""
        };
    }

    componentDidMount() {
        fetch("/locale/help.json",
              {headers: {"Cache-Control": "no-cache", "Pragma": "no-cache", "Accept": "application/json"}})
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => {
                const location = window.location.pathname.slice(1);
                const page = location === "" ? "home" : location;
                const availableLanguages = data[page];
                if (availableLanguages) this.getHelpSlides(availableLanguages, page);
            })
            .catch(error => console.log(error));
    }

    getHelpSlides = (availableLanguages, page) => {
        fetch(`/locale/${page}/${getLanguage(availableLanguages)}.json`,
              {headers: {"Cache-Control": "no-cache", "Pragma": "no-cache", "Accept": "application/json"}})
            .then(response => (response.ok ? response.json() : Promise.reject(response)))
            .then(data => this.setState({helpSlides: data, page}))
            .catch(error => console.log(page, getLanguage(availableLanguages), error));
    };

    closeHelpMenu = () => this.setState({showHelpMenu: false});

    render() {
        const {userName, userId, children} = this.props;
        const uri = window.location.pathname;
        const loggedOut = !userName || userName === "guest";

        return (
            <>
                {this.state.showHelpMenu && (
                    <HelpSlideDialog
                        closeHelpMenu={this.closeHelpMenu}
                        helpSlides={this.state.helpSlides}
                        page={this.state.page}
                    />
                )}
                <nav
                    className="navbar navbar-expand-lg navbar-light fixed-top py-0"
                    id="main-nav"
                    style={{backgroundColor: "white", borderBottom: "1px solid black"}}
                >
                    <a className="navbar-brand pt-1 pb-1" href="/home">
                        <img
                            alt="Home"
                            className="img-fluid"
                            id="ceo-site-logo"
                            src="/img/ceo-logo.png"
                        />
                    </a>
                    <button
                        aria-controls="navbarSupportedContent"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                        className="navbar-toggler"
                        data-target="#navbarSupportedContent"
                        data-toggle="collapse"
                        type="button"
                    >
                        <span className="navbar-toggler-icon"/>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarSupportedContent">
                        <ul className="navbar-nav mr-auto">
                            {["Home", "About", "Support", "Blog"].map(page => (
                                <li key={page} className={"nav-item" + ("/" + page.toLowerCase() === uri && " active")}>
                                    <a className="nav-link" href={page === "Blog" ? "https://blog.collect.earth" : "/" + page.toLowerCase()}>{page}</a>
                                </li>
                            ))}
                            {!loggedOut && (
                                <li className={"nav-item" + (uri === "/account" && " active")}>
                                    <a className="nav-link" href={"/account?accountId=" + userId}>Account</a>
                                </li>
                            )}
                        </ul>
                        <ul className="navbar-nav mr-0" id="login-info">
                            <LogOutButton uri={uri} userName={userName}/>
                        </ul>
                        <div
                            className="ml-3"
                            onClick={() => this.setState({showHelpMenu: true})}
                        >
                            {this.state.helpSlides.length > 0 && <SvgIcon color="purple" icon="help" size="2rem"/>}
                        </div>
                    </div>
                </nav>
                {children}
            </>
        );
    }
}

export class GeoDashNavigationBar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            addDialog: false,
            copyDialog: false
        };
    }

    closeDialogs = () => this.setState({
        addDialog: false,
        copyDialog: false
    });

    render() {
        const {userName, page, visiblePlotId} = this.props;
        const uri = window.location.pathname;

        return (
            <>
                <nav
                    className="navbar navbar-expand-lg navbar-light fixed-top py-0"
                    id="geodash-nav"
                    style={{backgroundColor: "white"}}
                >
                    <a className="navbar-brand pt-1 pb-1" href="home">
                        <img
                            alt="Home"
                            className="img-fluid"
                            id="ceo-site-logo"
                            src="/img/ceo-logo.png"
                        />
                    </a>
                    <button
                        aria-controls="navbarSupportedContent"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                        className="navbar-toggler"
                        data-target="#navbarSupportedContent"
                        data-toggle="collapse"
                        type="button"
                    >
                        <span className="navbar-toggler-icon"/>
                    </button>
                    <div
                        className="collapse navbar-collapse justify-content-between"
                        id="navbarSupportedContent"
                    >
                        <h1 className="mb-0">GEO-DASH</h1>
                        <ul className="navbar-nav" style={{flex: 1, justifyContent: "flex-end"}}>
                            {uri === "/widget-layout-editor"
                                ? (
                                    <>
                                        <li className="nav-item my-auto ml-1" id="copyWidgetLayout">
                                            <button
                                                alt="This will remove any existing widgets currently configured."
                                                className="btn btn-outline-lightgreen btn-sm"
                                                onClick={() => this.setState({copyDialog: true})}
                                                title="This will remove any existing widgets currently configured."
                                                type="button"
                                            >
                                            Copy Layout
                                            </button>
                                        </li>
                                        <li className="nav-item my-auto ml-1">
                                            <button
                                                className="btn btn-outline-lightgreen btn-sm"
                                                onClick={() => this.setState({addDialog : true})}
                                                type="button"
                                            >
                                            Add Widget
                                            </button>
                                        </li>
                                    </>
                                ) : (
                                    <li className="nav-item" style={{flex: 1, textAlign: "center"}}>
                                    Plot ID: {visiblePlotId}
                                    </li>
                                )}
                            <li className="nav-item my-auto ml-1">
                                <button
                                    className="btn btn-outline-lightgreen btn-sm"
                                    onClick={() => window.open("geo-dash/geo-dash-help", "_blank")}
                                    type="button"
                                >
                                    Geo-Dash Help
                                </button>
                            </li>
                            <LogOutButton uri={uri} userName={userName}/>
                        </ul>
                    </div>
                </nav>
                {page(this.state.addDialog, this.state.copyDialog, this.closeDialogs)}
            </>
        );
    }
}

export function LogoBanner() {
    return (
        <div id="logo-banner">
            <div className="row mb-4 justify-content-center">
                <div className="col-sm-4 text-center">
                    <a href="https://www.servirglobal.net/" rel="noreferrer noopener" target="_blank">
                        <img
                            alt="Servir Global"
                            className="img-fluid"
                            id="servir"
                            src="/img/servir-logo.png"
                        />
                    </a>
                </div>
            </div>
            <div className="row justify-content-center mb-2">
                <div className="col-sm-6 text-center">
                    <h2>With the support of</h2>
                </div>
            </div>
            <div className="row mb-4">
                <div className="col-sm-3 text-center my-auto">
                    <a href="http://openforis.org" rel="noreferrer noopener" target="_blank">
                        <img alt="Open Foris" className="img-fluid" id="openforis" src="/img/openforis-logo.png"/>
                    </a>
                </div>
                <div className="col-sm-3 text-center my-auto">
                    <a href="http://www.fao.org" rel="noreferrer noopener" target="_blank">
                        <img
                            alt="Food and Agriculture Organization of the United Nations"
                            className="img-fluid"
                            id="fao"
                            src="/img/fao.png"
                        />
                    </a>
                </div>
                <div className="col-sm-3 text-center my-auto">
                    <a href="https://www.usaid.gov" rel="noreferrer noopener" target="_blank">
                        <img
                            alt="U.S. Agency for International Development"
                            className="img-fluid"
                            id="usaid"
                            src="/img/usaid.png"
                        />
                    </a>
                </div>
                <div className="col-sm-3 text-center my-auto">
                    <a href="https://www.nasa.gov" rel="noreferrer noopener" target="_blank">
                        <img
                            alt="National Aeronautics and Space Administration"
                            className="img-fluid"
                            id="nasa"
                            src="/img/nasa.png"
                        />
                    </a>
                </div>
            </div>
            <div className="row mb-2 justify-content-center">
                <div className="col-sm-6 text-center">
                    <h2>In partnership with</h2>
                </div>
            </div>
            <div className="row mb-4 justify-content-center">
                <div className="col-sm-6 text-center my-auto">
                    <a href="https://www.silvacarbon.org" rel="noreferrer noopener" target="_blank">
                        <img
                            alt="Silva Carbon"
                            className="img-fluid"
                            id="silvacarbon"
                            src="/img/SilvaCarbon.png"
                        />
                    </a>
                </div>
                <div className="col-sm-6 text-center my-auto">
                    <a href="https://sig-gis.com" rel="noreferrer noopener" target="_blank">
                        <img
                            alt="Spatial Informatics Group, Inc."
                            className="img-fluid"
                            id="sig"
                            src="/img/sig-logo.png"
                        />
                    </a>
                </div>
            </div>
            <div className="row mb-4 justify-content-center">
                <div className="col-sm-6 text-center my-auto">
                    <a href="https://servir.adpc.net" rel="noreferrer noopener" target="_blank">
                        <img
                            alt="Servir Mekong"
                            className="img-fluid"
                            id="servir-mekong"
                            src="/img/servir-mekong-logo.png"
                        />
                    </a>
                </div>
                <div className="col-sm-6 text-center my-auto">
                    <a href="https://servir.ciat.cgiar.org" rel="noreferrer noopener" target="_blank">
                        <img
                            alt="Servir Amazonia"
                            className="img-fluid"
                            id="servir-mekong"
                            src="/img/servir-amazonia-logo.png"
                        />
                    </a>
                </div>
            </div>
            <div className="row mb-4 justify-content-center">
                <div className="col-sm-4 text-center my-auto">
                    <a href="https://www.google.com" rel="noreferrer noopener" target="_blank">
                        <img
                            alt="Google, Inc."
                            className="img-fluid"
                            id="google"
                            src="/img/google-logo.png"
                        />
                    </a>
                </div>

                <div className="col-sm-4 text-center my-auto">
                    <a href="https://www.fs.usda.gov" rel="noreferrer noopener" target="_blank">
                        <img
                            alt="U.S. Forest Service"
                            className="img-fluid"
                            id="usfs"
                            src="/img/usfs.png"
                            style={{width: "120px"}}
                        />
                    </a>
                </div>

                <div className="col-sm-4 text-center my-auto">
                    <a href="https://www.fs.usda.gov/about-agency/gtac" rel="noreferrer noopener" target="_blank">
                        <img
                            alt="Geospatial Technology and Applications Center"
                            className="img-fluid"
                            id="gtac"
                            src="/img/gtac-logo.png"
                        />
                    </a>
                </div>
            </div>
        </div>
    );
}

export function LoadingModal({message}) {
    return (
        <div
            style={{
                position: "fixed",
                zIndex: "100",
                left: "0",
                top: "0",
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0,0,0,0.4)"
            }}
        >
            <div
                style={{
                    alignItems: "center",
                    backgroundColor: "white",
                    border: "1.5px solid",
                    borderRadius: "5px",
                    display: "flex",
                    margin: "20% auto",
                    width: "fit-content"
                }}
            >
                <div className="p-3">
                    <div id="spinner" style={{height: "2.5rem", position: "static", width: "2.5rem"}}/>
                </div>
                <label className="m-0 mr-3">{message}</label>
            </div>
        </div>
    );
}
