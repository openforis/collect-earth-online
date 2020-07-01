import React from "react";

export function NavigationBar ({ userName, userId, children }) {
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
                        {userId === 1 &&
                            <li className={"nav-item" + ("/mailing-list" === uri && " active")}>
                                <a className="nav-link" href={"/mailing-list"}>Mailing List</a>
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
