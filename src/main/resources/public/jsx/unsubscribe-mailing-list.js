import React from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";

class UnsubscribeMailingList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: props.userName,
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
            <div className="d-flex justify-content-center">
                <div className="card card-lightgreen">
                    <div className="card-header card-header-lightgreen">Unsubscribe from Mailing List</div>
                    <div className="card-body">
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                this.submitUnsubscribe();
                            }}
                        >
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
            <UnsubscribeMailingList userName={args.userName} />
        </NavigationBar>,
        document.getElementById("unsubscribe-mailing-list")
    );
}
