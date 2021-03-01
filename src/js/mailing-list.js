import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";
import CKEditor from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

class MailingList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            subject: "",
            body: "",
        };
    }

    submitEmail = () => {
        if (confirm("Are you sure you want to send to this mailing list?")) {
            fetch("/send-to-mailing-list", {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(this.state),
            })
                .then((response) => Promise.all([response.ok, response.json()]))
                .then((data) => {
                    if (data[0] && data[1] === "") {
                        this.setState({subject: "", body: ""});
                        alert("Your message has been sent to the mailing list.");
                    } else {
                        alert(data[1]);
                    }
                })
                .catch((err) => console.log(err));
        }
    };

    render() {
        return (
            <div className="row justify-content-center">
                <div className="col-xl-6 col-lg-8 border bg-lightgray mb-5">
                    <div className="bg-darkgreen mb-3 no-container-margin">
                        <h1>Mailing List</h1>
                    </div>
                    <div className="row mb-3">
                        <div className="col">
                            <div className="form-group">
                                <label htmlFor="subject">Subject</label>
                                <input
                                    id="subject"
                                    className="form-control"
                                    autoComplete="off"
                                    placeholder="Subject"
                                    type="text"
                                    value={this.state.subject}
                                    onChange={(e) => this.setState({subject: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="body">Body</label>
                                <CKEditor
                                    editor={ClassicEditor}
                                    data={this.state.body}
                                    onChange={(e, editor) =>
                                        this.setState({body: editor.getData()})
                                    }
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-outline-lightgreen btn-block"
                                onClick={this.submitEmail}
                            >
                                Send to All CEO Users
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar userName={args.userName} userId={args.userId}>
            <MailingList />
        </NavigationBar>,
        document.getElementById("app")
    );
}
