import React from "react";

export function NavigationBar({ userName, userId, children }) {
    const uri = window.location.pathname;
    const fullUri = uri + window.location.search;
    const loggedOut = !userName || userName === "" || userName === "guest";

    return (
        <>
            <nav className="navbar navbar-expand-lg navbar-light fixed-top py-0" style={{ backgroundColor: "white" }} id="main-nav">
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
                                <a className="nav-link" href={"/account?userId=" + userId}>Account</a>
                            </li>
                        }
                    </ul>
                    <ul id="login-info" className="navbar-nav mr-0">
                        {loggedOut
                            ?
                                <button
                                    type="button"
                                    className="btn bg-lightgreen btn-sm"
                                    onClick={() => window.location = "/login?returnurl=" + encodeURIComponent(fullUri)}
                                >
                                    Login/Register
                                </button>

                            :
                                <>
                                    <li id="username" className="nav-item my-auto">
                                        <span className="nav-link disabled">{userName}</span>
                                    </li>
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => window.location = "/logout"}
                                    >
                                        Logout
                                    </button>
                                </>
                        }
                    </ul>
                </div>
            </nav>
            {children}
        </>
    );
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
                    <img className="img-fluid" id="usfs" style={{ width: "60vh" }} src="/img/usfs.png" />
                </div>

                <div className="col-sm-4 text-center my-auto">
                    <img className="img-fluid" id="gtac" src="/img/gtac-logo.png" />
                </div>
            </div>
        </div>
    );
}
