import React from "react";
import ReactDOM from "react-dom";

class UnsubscribeMailingList extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <>TEST</>
        );
    }

}

export function renderUnsubscribeMailingListPage(args) {
    ReactDOM.render(
        <UnsubscribeMailingList
            documentRoot={args.documentRoot}
        />,
        document.getElementById("unsubscribe-mailing-list")
    );
}
