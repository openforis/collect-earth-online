import React from 'react';
import ReactDOM from 'react-dom';

class TimeSync extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            documentRoot: props.documentRoot,
            userId: props.userId,
            userName: props.userName,
            version: ""
        };
    }

    componentDidMount() {
        fetch(this.state.documentRoot + "/timesync/version")
            .then(response => {
                console.log(response);
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving the TimeSync info. See console for details.");
                }
            })
            .then(data => this.setState({version: data}));
    }

    render() {
        return (
            <div id="bcontainer">
                <p>{this.state.documentRoot}</p>
                <p>{this.state.userId}</p>
                <p>{this.state.userName}</p>
                <p>{this.state.version}</p>
            </div>
        );
    }
}


export function renderTimeSyncPage(args) {
    ReactDOM.render(
        <TimeSync documentRoot={args.documentRoot} userId={args.userId} userName={args.userName}/>,
        document.getElementById("timesync")
    );
}