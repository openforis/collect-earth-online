import React from "react";

function LogOutButton({ userName, uri }) {
    const fullUri = uri + window.location.search;
    const loggedOut = !userName || userName === "" || userName === "guest";

    return loggedOut
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
            </>;
}

export function NavigationBar ({ userName, userId, children }) {
    const uri = window.location.pathname;
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
                        <LogOutButton userName={userName} uri={uri} />
                    </ul>
                </div>
            </nav>
            {children}
        </>
    );
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
    })

    render() {
        const { userName, page } = this.props;
        const uri = window.location.pathname;

        console.log(page)
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
                                    <h1>GEO-DASH 2</h1>
                                </li>
                            </ul>
                            <ul className="navbar-nav mr-0">
                                {uri === "/widget-layout-editor" &&
                                <>
                                    <li className="nav-item my-auto ml-1" id="copyWidgetLayout">
                                        <button
                                            className="btn btn-outline-lightgreen btn-sm"
                                            type="button"
                                            onClick={() => this.setState({ copyDialog: true })}
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
                                            onClick={() => this.setState({ addDialog : true })}
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
                                    >Geo-Dash Help
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
