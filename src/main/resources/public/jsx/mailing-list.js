import React from "react"; 
import ReactDOM from "react-dom";
import CKEditor from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

class MailingList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            subject: "",
            body: `<br /><br />--<p><a href="${window.location.origin}/unsubscribe-mailing-list">Unsubscribe</a></p>`,
        };
    }

    submitEmail = () => {
        if (confirm("Are you sure you want to send to this mailing list?")) {
            const { subject, body } = this.state;
            fetch(this.props.documentRoot + "/send-mailing-list", {
                method: "POST",
                body: JSON.stringify({
                    subject,
                    body,
                }),
            })
                .then(response => response.ok ? response.json() : Promise.reject(response))
                .then(() => {
                    alert("Your message has been sent to the mailing list.\n\n");
                })
                .catch(() => {
                    alert("There was an issue sending to the mailing list.\n\n");
                });
        }
    };

    onChangeSubject = (event) => this.setState({ subject: event.target.value });

    onChangeBody = (event, editor) => this.setState({ body: editor.getData() });

    render() {
        return (
            <section id="content" className="container-fluid">
                <div className="row justify-content-center">
                    <div className="col-xl-6 col-lg-8 border bg-lightgray mb-5">
                        <div className="bg-darkgreen mb-3 no-container-margin">
                            <h1>Mailing List!</h1>
                        </div>
                        <div className="row mb-3">
                            <div className="col">
                                <form action="${root}/mailing-list" method="post">
                                    <div className="form-group">
                                        <label forHtml="subject">Subject</label>
                                        <input
                                            autoComplete="off"
                                            id="subject"
                                            name="subject"
                                            placeholder="Subject"
                                            type="text"
                                            className="form-control"
                                            onChange={this.onChangeSubject}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label forHtml="body">Body</label>
                                        <CKEditor
                                            editor={ClassicEditor}
                                            data={this.state.body}
                                            onChange={this.onChangeBody}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-outline-lightgreen btn-block"
                                        onClick={this.submitEmail}
                                    >
                                        Send to All CEO Users
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

}

export function renderMailingListPage(args) {
    ReactDOM.render(
        <MailingList documentRoot={args.documentRoot}/>,
        document.getElementById("mailing-list")
    );
}
