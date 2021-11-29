import React from "react";

import {LogOutButton} from "../components/PageComponents";

export default class GeoDashNavigationBar extends React.Component {
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
        const {userName, page, visiblePlotId, editor} = this.props;
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
                        <h1 className="mb-0">Geo-Dash</h1>
                        <ul className="navbar-nav" style={{flex: 1, justifyContent: "flex-end"}}>
                            {editor
                                ? (
                                    <>
                                        <li className="nav-item my-auto ml-1">
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
