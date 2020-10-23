import "../../css/custom.css";

import React from "react";
import {SvgIcon} from "../utils/svgIcons";
import {getLanguage, capitalizeFirst} from "../utils/generalUtils";

function LogOutButton({userName, uri}) {
    const fullUri = uri + window.location.search;
    const loggedOut = !userName || userName === "" || userName === "guest";

    const logout = () => fetch("/logout", {method: "POST"})
        .then(() => window.location = "/home");

    return loggedOut
        ? (
            <button
                type="button"
                className="btn btn-lightgreen btn-sm"
                onClick={() => window.location = "/login?returnurl=" + encodeURIComponent(fullUri)}
            >
                Login/Register
            </button>

        ) : (
            <>
                <li id="username" className="nav-item my-auto">
                    <span className="nav-link disabled">{userName}</span>
                </li>
                <button
                    type="button"
                    className="btn btn-outline-red btn-sm"
                    onClick={logout}
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
            currentSlideIdx: 0,
        };
    }

    render() {
        const {currentSlideIdx} = this.state;
        const {body, img} = this.props.helpSlides[currentSlideIdx];
        const isLastSlide = currentSlideIdx === this.props.helpSlides.length - 1;
        return (
            <div
                style={{
                    position: "fixed",
                    zIndex: "100",
                    left: "0",
                    top: "0",
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0,0,0,0.4)",
                }}
                onClick={this.props.closeHelpMenu}
            >
                <div className="col-8 col-sm-12">
                    <div
                        className="overflow-hidden container-fluid d-flex flex-column"
                        style={{
                            backgroundColor: "white",
                            border: "1.5px solid",
                            borderRadius: "5px",
                            maxHeight: "calc(100vh - 150px)",
                            margin: "90px auto",
                            width: "fit-content",
                        }}
                        onClick={e => e.stopPropagation()}
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
                                        type="button"
                                        className="btn btn-lightgreen btn-sm m-2"
                                        onClick={() => this.setState({currentSlideIdx: currentSlideIdx - 1})}
                                        disabled={currentSlideIdx === 0}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-lightgreen btn-sm m-2"
                                        onClick={() => {
                                            if (isLastSlide) {
                                                this.props.closeHelpMenu();
                                            } else {
                                                this.setState({currentSlideIdx: currentSlideIdx + 1});
                                            }
                                        }}
                                    >
                                        {isLastSlide ? "Finish" : "Next"}
                                    </button>
                                </div>
                            </div>
                            <div style={{height: "100%", width: "33vw"}}>
                                <img
                                    style={{maxHeight: "100%", maxWidth: "100%"}}
                                    src={"locale/" + this.props.page + img}
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
            page: "",
        };
    }

    componentDidMount () {
        fetch("/locale/help.json",
              {headers: {"Cache-Control": "no-cache", "Pragma": "no-cache", "Accept": "application/json"}})
            .then(response => response.ok ? response.json() : Promise.reject(response))
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
            .then(response => response.ok ? response.json() : Promise.reject(response))
            .then(data => this.setState({helpSlides: data, page: page}))
            .catch(error => console.log(page, getLanguage(availableLanguages), error));
    }

    closeHelpMenu = () => this.setState({showHelpMenu: false});

    render() {
        const {userName, userId, children} = this.props;
        const uri = window.location.pathname;
        const loggedOut = !userName || userName === "" || userName === "guest";

        return (
            <>
                {this.state.showHelpMenu &&
                    <HelpSlideDialog
                        helpSlides={this.state.helpSlides}
                        closeHelpMenu={this.closeHelpMenu}
                        page={this.state.page}
                    />
                }
                <nav
                    className="navbar navbar-expand-lg navbar-light fixed-top py-0"
                    style={{backgroundColor: "white", borderBottom: "1px solid black"}}
                    id="main-nav"
                >
                    <a className="navbar-brand pt-1 pb-1" href="/home">
                        <img className="img-fluid" id="ceo-site-logo" src="/img/ceo-logo.png" />
                    </a>
                    <button
                        className="navbar-toggler"
                        type="button"
                        data-toggle="collapse"
                        data-target="#navbarSupportedContent"
                        aria-controls="navbarSupportedContent"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarSupportedContent">
                        <ul className="navbar-nav mr-auto">
                            {["Home", "About", "Support"].map(page =>
                                <li className={"nav-item" + ("/" + page.toLowerCase() === uri && " active")} key={page}>
                                    <a className="nav-link" href={"/" + page.toLowerCase()}>{page}</a>
                                </li>
                            )}
                            {!loggedOut &&
                                <li className={"nav-item" + ("/account" === uri && " active")}>
                                    <a className="nav-link" href={"/account?accountId=" + userId}>Account</a>
                                </li>
                            }
                            {userId === 1 &&
                                <li className={"nav-item" + ("/mailing-list" === uri && " active")}>
                                    <a className="nav-link" href={"/mailing-list"}>Mailing List</a>
                                </li>
                            }
                        </ul>
                        <ul id="login-info" className="navbar-nav mr-0">
                            <LogOutButton userName={userName} uri={uri} />
                        </ul>
                        <div
                            className="ml-3"
                            onClick={() => this.setState({showHelpMenu: true})}
                        >
                            {this.state.helpSlides.length > 0 && <SvgIcon icon="help" size="2rem" color="purple"/>}
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
            copyDialog: false,
        };
    }

    closeDialogs = () => this.setState({
        addDialog: false,
        copyDialog: false,
    });

    render() {
        const {userName, page} = this.props;
        const uri = window.location.pathname;

        return (
            <>
                <nav
                    className="navbar navbar-expand-lg navbar-light fixed-top pt-0 pb-0"
                    style={{backgroundColor: "white"}}
                    id="geodash-nav"
                >
                    <div className="container-fluid">
                        <a className="navbar-brand" href="home">
                            <img className= "img-fluid" id="ceo-site-logo" src="/img/ceo-logo.png" />
                        </a>
                        <button
                            className="navbar-toggler"
                            type="button"
                            data-toggle="collapse"
                            data-target="#navbarSupportedContent"
                            aria-controls="navbarSupportedContent"
                            aria-expanded="false"
                            aria-label="Toggle navigation"
                        >
                            <span className="navbar-toggler-icon"></span>
                        </button>
                        <div className="collapse navbar-collapse" id="navbarSupportedContent">
                            <ul id="login-info" className="navbar-nav mr-auto">
                                <li className="nav-item my-auto">
                                    <h1>GEO-DASH</h1>
                                </li>
                            </ul>
                            <ul className="navbar-nav mr-0">
                                {uri === "/widget-layout-editor" &&
                                    <>
                                        <li className="nav-item my-auto ml-1" id="copyWidgetLayout">
                                            <button
                                                className="btn btn-outline-lightgreen btn-sm"
                                                type="button"
                                                onClick={() => this.setState({copyDialog: true})}
                                                alt="This will remove any existing widgets currently configured."
                                                title="This will remove any existing widgets currently configured."
                                            >
                                                Copy Layout
                                            </button>
                                        </li>
                                        <li className="nav-item my-auto ml-1">
                                            <button
                                                className="btn btn-outline-lightgreen btn-sm"
                                                type="button"
                                                onClick={() => this.setState({addDialog : true})}
                                            >
                                                Add Widget
                                            </button>
                                        </li>
                                    </>
                                }
                                <li className="nav-item my-auto ml-1">
                                    <button
                                        className="btn btn-outline-lightgreen btn-sm"
                                        type="button"
                                        onClick={() => window.open("geo-dash/geo-dash-help", "_blank")}
                                    >
                                        Geo-Dash Help
                                    </button>
                                </li>
                                <LogOutButton userName={userName} uri={uri} />
                            </ul>
                        </div>
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
                    <img className="img-fluid" id="servir" src="/img/servir-logo.png" />
                </div>
            </div>
            <div className="row justify-content-center mb-2">
                <div className="col-sm-6 text-center">
                    <h2>With the support of</h2>
                </div>
            </div>
            <div className="row mb-4">
                <div className="col-sm-3 text-center my-auto">
                    <a href="http://openforis.org" target="_blank" rel="noreferrer noopener">
                        <img className="img-fluid" id="openforis" src="/img/openforis-logo.png" />
                    </a>
                </div>
                <div className="col-sm-3 text-center my-auto">
                    <a href="http://fao.org" target="_blank" rel="noreferrer noopener">
                        <img className="img-fluid" id="fao" src="/img/fao.png" />
                    </a>
                </div>
                <div className="col-sm-3 text-center my-auto">
                    <img className="img-fluid" id="usaid" src="/img/usaid.png" />
                </div>
                <div className="col-sm-3 text-center my-auto">
                    <img className="img-fluid" id="nasa" src="/img/nasa.png" />
                </div>
            </div>
            <div className="row mb-2 justify-content-center">
                <div className="col-sm-6 text-center">
                    <h2>In partnership with</h2>
                </div>
            </div>
            <div className="row mb-4 justify-content-center">
                <div className="col-sm-4 text-center my-auto">
                    <a href="http://www.silvacarbon.org">
                        <img className="img-fluid" id="silvacarbon" src="/img/SilvaCarbon.png" />
                    </a>
                </div>
                <div className="col-sm-4 text-center my-auto">
                    <a href="http://www.sig-gis.com">
                        <img className="img-fluid" id="sig" src="/img/sig-logo.png" />
                    </a>
                </div>
                <div className="col-sm-4 text-center my-auto">
                    <a href="https://servir.adpc.net">
                        <img className="img-fluid" id="servir-mekong" src="/img/servir-mekong-logo.png" />
                    </a>
                </div>
            </div>
            <div className="row mb-4 justify-content-center">
                <div className="col-sm-4 text-center my-auto">
                    <img className="img-fluid" id="google" src="/img/google-logo.png" />
                </div>

                <div className="col-sm-4 text-center my-auto">
                    <img className="img-fluid" id="usfs" style={{width: "60vh"}} src="/img/usfs.png" />
                </div>

                <div className="col-sm-4 text-center my-auto">
                    <img className="img-fluid" id="gtac" src="/img/gtac-logo.png" />
                </div>
            </div>
        </div>
    );
}

export class SafeImage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            error: false,
        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.src !== this.props.src) {
            this.setState({error: false});
        }
    }

    render() {
        const {src, fallbackSrc, ...extraProps} = this.props;
        return (
            <img
                src={this.state.error ? fallbackSrc : src}
                onError={() => this.setState({error: true})}
                {...extraProps}
            />
        );
    }

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
                backgroundColor: "rgba(0,0,0,0.4)",
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
                    width: "fit-content",
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
