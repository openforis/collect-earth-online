import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";

class UnsubscribeMailingList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: "",
        };
    }

    submitUnsubscribe = () => {
        if (confirm("Are you sure you want to unsubscribe from mailing list?")) {
            fetch("/unsubscribe-mailing-list", {
                method: "POST",
                body: JSON.stringify(this.state),
            })
                .then(response => Promise.all([response.ok, response.text()]))
                .then(data => {
                    if (data[0] && data[1] === "") {
                        alert("You have been unsubscribed from mailing list.");
                        window.location = "/home";
                    } else {
                        alert(data[1]);
                    }
                })
                .catch(err => console.log(err));
        }
    };

    render() {
        return (
            <div className="container absolute-center">
                <div className="row justify-content-center">
                    <div className="col-lg-4 col-md-6 col-sm-10 pb-3" id="login">
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                this.submitUnsubscribe();
                            }}
                        >
                            <h2 className="header">Unsubscribe from Mailing List</h2>
                            <div className="form-group">
                                <label htmlFor="email">Email address</label>
                                <input
                                    id="email"
                                    placeholder="Enter email"
                                    type="email"
                                    value={this.state.email}
                                    className="form-control"
                                    onChange={e => this.setState({ email: e.target.value })}
                                />
                            </div>
                            <button className="btn bg-lightgreen float-right mb-2" type="submit">Unsubscribe</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
}

export function renderUnsubscribeMailingListPage(args) {
    ReactDOM.render(
        <NavigationBar userName={args.userName} userId={args.userId}>
            <UnsubscribeMailingList />
        </NavigationBar>,
        document.getElementById("unsubscribe-mailing-list")
    );
}
