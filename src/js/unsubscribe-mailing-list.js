import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";

class UnsubscribeMailingList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            email: "",
        };
    }

    componentDidMount() {
        this.setState({email: this.props.userName});
    }

    submitUnsubscribe = () => {
        if (confirm("Are you sure you want to unsubscribe from mailing list?")) {
            fetch("/unsubscribe-mailing-list", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(this.state),
            })
                .then(response => Promise.all([response.ok, response.json()]))
                .then(data => {
                    alert(data[1]);
                    window.location = "/home";
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
                                    onChange={e => this.setState({email: e.target.value})}
                                />
                            </div>
                            <button className="btn btn-lightgreen float-right mb-2" type="submit">Unsubscribe</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar userName={args.userName} userId={args.userId}>
            <UnsubscribeMailingList userName={args.userName} />
        </NavigationBar>,
        document.getElementById("app")
    );
}
