var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Account = function (_React$Component) {
    _inherits(Account, _React$Component);

    function Account(props) {
        _classCallCheck(this, Account);

        return _possibleConstructorReturn(this, (Account.__proto__ || Object.getPrototypeOf(Account)).call(this, props));
    }

    _createClass(Account, [{
        key: "render",
        value: function render() {
            return React.createElement(
                React.Fragment,
                null,
                React.createElement(
                    "div",
                    { className: "bg-darkgreen mb-3 no-container-margin" },
                    React.createElement(
                        "h1",
                        null,
                        "Your account"
                    )
                ),
                React.createElement(UserStats, null),
                React.createElement(AccountForm, { documentRoot: this.props.documentRoot, userId: this.props.userId,
                    accountId: this.props.accountId, username: this.props.username })
            );
        }
    }]);

    return Account;
}(React.Component);

function UserStats() {
    return React.createElement(
        "div",
        { id: "user-stats", className: "col" },
        React.createElement(
            "h2",
            { className: "header px-0" },
            "Here's your progress"
        ),
        React.createElement(
            "h1",
            null,
            React.createElement(
                "span",
                { className: "badge bg-lightgreen" },
                "Level 1"
            )
        ),
        React.createElement(
            "div",
            { className: "progress w3-light-grey mb-1" },
            React.createElement("div", { className: "progress-bar progress-bar-striped bg-lightgreen", role: "progressbar",
                style: { width: '33%' },
                "aria-valuenow": "10", "aria-valuemin": "0", "aria-valuemax": "100" }),
            React.createElement(
                "div",
                { id: "myBar", className: "w3-container w3-blue w3-center", style: { width: '33%' } },
                "33%"
            )
        ),
        React.createElement(
            "p",
            null,
            "You need to complete ",
            React.createElement(
                "span",
                { className: "badge bg-lightgreen" },
                "15"
            ),
            " more plots to reach ",
            React.createElement(
                "span",
                {
                    className: "badge bg-lightgreen" },
                "Level 2"
            )
        ),
        React.createElement(
            "table",
            { id: "user-stats-table", className: "table table-sm" },
            React.createElement(
                "tbody",
                null,
                React.createElement(
                    "tr",
                    null,
                    React.createElement(
                        "td",
                        { className: "w-80" },
                        "Projects Worked So Far"
                    ),
                    React.createElement(
                        "td",
                        { className: "w-20 text-center" },
                        React.createElement(
                            "span",
                            { className: "badge badge-pill bg-lightgreen" },
                            "2"
                        )
                    )
                ),
                React.createElement(
                    "tr",
                    null,
                    React.createElement(
                        "td",
                        null,
                        "Speed Score Total"
                    ),
                    React.createElement(
                        "td",
                        { className: "text-center" },
                        React.createElement(
                            "span",
                            { className: "badge badge-pill bg-lightgreen" },
                            "205"
                        )
                    )
                ),
                React.createElement(
                    "tr",
                    null,
                    React.createElement(
                        "td",
                        null,
                        "Plots Completed Per Project"
                    ),
                    React.createElement(
                        "td",
                        { className: "text-center" },
                        React.createElement(
                            "span",
                            { className: "badge badge-pill bg-lightgreen" },
                            "8"
                        )
                    )
                ),
                React.createElement(
                    "tr",
                    null,
                    React.createElement(
                        "td",
                        null,
                        "Accuracy Score Per Project"
                    ),
                    React.createElement(
                        "td",
                        { className: "text-center" },
                        React.createElement(
                            "span",
                            { className: "badge badge-pill bg-lightgreen" },
                            "10"
                        )
                    )
                ),
                React.createElement(
                    "tr",
                    null,
                    React.createElement(
                        "td",
                        null,
                        "Plots Completed Total"
                    ),
                    React.createElement(
                        "td",
                        { className: "text-center" },
                        React.createElement(
                            "span",
                            { className: "badge badge-pill bg-lightgreen" },
                            "16"
                        )
                    )
                ),
                React.createElement(
                    "tr",
                    null,
                    React.createElement(
                        "td",
                        null,
                        "Accuracy Score Total"
                    ),
                    React.createElement(
                        "td",
                        { className: "text-center" },
                        React.createElement(
                            "span",
                            { className: "badge badge-pill bg-lightgreen" },
                            "10"
                        )
                    )
                ),
                React.createElement(
                    "tr",
                    null,
                    React.createElement(
                        "td",
                        null,
                        "Speed Score Per Project"
                    ),
                    React.createElement(
                        "td",
                        { className: "text-center" },
                        React.createElement(
                            "span",
                            { className: "badge badge-pill bg-lightgreen" },
                            "205"
                        )
                    )
                )
            )
        ),
        React.createElement(
            "form",
            { style: { visibility: 'visible' } },
            React.createElement(
                "fieldset",
                null,
                React.createElement(
                    "strong",
                    null,
                    "Congratulations!"
                ),
                " You are ranked ",
                React.createElement(
                    "span",
                    {
                        className: "badge bg-lightgreen" },
                    "#3"
                ),
                " overall and ",
                React.createElement(
                    "span",
                    {
                        className: "badge bg-lightgreen" },
                    "#1"
                ),
                " in your organization."
            ),
            React.createElement(
                "span",
                null,
                "\xA0"
            )
        ),
        React.createElement("hr", { className: "d-block d-sm-none" })
    );
}

function AccountForm(props) {
    if (props.userId == props.accountId) {
        return React.createElement(
            "div",
            { id: "account-form", className: "col mb-3" },
            React.createElement(
                "h2",
                { className: "header px-0" },
                "Account Settings"
            ),
            React.createElement(
                "h1",
                null,
                props.username
            ),
            React.createElement(
                "form",
                { action: props.documentRoot + "/account/" + props.accountId, method: "post" },
                React.createElement(
                    "div",
                    { className: "form-group" },
                    React.createElement(
                        "label",
                        { htmlFor: "email" },
                        "Reset email"
                    ),
                    React.createElement("input", { autoComplete: "off", id: "email", name: "email", placeholder: "New email", defaultValue: "",
                        type: "email",
                        className: "form-control" })
                ),
                React.createElement(
                    "div",
                    { className: "form-group" },
                    React.createElement(
                        "label",
                        { htmlFor: "password" },
                        "Reset password"
                    ),
                    React.createElement(
                        "div",
                        { className: "form-row" },
                        React.createElement(
                            "div",
                            { className: "col" },
                            React.createElement("input", { autoComplete: "off", id: "password", name: "password", placeholder: "New password",
                                defaultValue: "",
                                type: "password", className: "form-control mb-1" })
                        ),
                        React.createElement(
                            "div",
                            { className: "col" },
                            React.createElement("input", { autoComplete: "off", id: "password-confirmation", name: "password-confirmation",
                                placeholder: "New password confirmation", defaultValue: "", type: "password",
                                className: "form-control" })
                        )
                    )
                ),
                React.createElement(
                    "div",
                    { "class": "form-group" },
                    React.createElement(
                        "label",
                        { "for": "current-password" },
                        "Verify your identity"
                    ),
                    React.createElement("input", { autocomplete: " off", id: "current-password", name: "current-password", placeholder: "\r Current password", defaultValue: "", type: "password", "class": "form-control" })
                ),
                React.createElement("input", { "class": "btn btn-outline-lightgreen btn-block", name: "update-account", defaultValue: "Update\r account settings", type: "submit" })
            )
        );
    } else {
        return React.createElement(
            "div",
            { id: "account-form", className: "col mb-3" },
            React.createElement(
                "h2",
                { className: "header px-0" },
                "Account Settings"
            ),
            React.createElement(
                "h1",
                null,
                props.username
            )
        );
    }
}

function renderAccount(documentRoot, userId, accountId, username) {
    ReactDOM.render(React.createElement(Account, { documentRoot: documentRoot, userId: userId, accountId: accountId, username: username }), document.getElementById("account-page"));
}