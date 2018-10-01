import React from 'react';
import ReactDOM from 'react-dom';

class Account extends React.Component {
    constructor(props) {
        super(props);
    };
    render() {
        return (
            <React.Fragment>
                <div className="bg-darkgreen mb-3 no-container-margin">
                    <h1>Your account</h1>
                </div>
                <UserStats/>
                <AccountForm documentRoot={this.props.documentRoot} userId={this.props.userId}
                             accountId={this.props.accountId} username={this.props.username}/>
            </React.Fragment>
        );
    }
}

function UserStats() {
    return (
        <div id="user-stats" className="col">
            <h2 className="header px-0">Here's your progress</h2>
            <h1><span className="badge bg-lightgreen">Level 1</span></h1>
            <div className="progress w3-light-grey mb-1">
                <div className="progress-bar progress-bar-striped bg-lightgreen" role="progressbar"
                     style={{width: '33%'}}
                     aria-valuenow="10" aria-valuemin="0" aria-valuemax="100"></div>
                <div id="myBar" className="w3-container w3-blue w3-center" style={{width: '33%'}}>33%</div>
            </div>
            <p>You need to complete <span className="badge bg-lightgreen">15</span> more plots to reach <span
                className="badge bg-lightgreen">Level 2</span></p>
            <table id="user-stats-table" className="table table-sm">
                <tbody>
                <tr>
                    <td className="w-80">Projects Worked So Far</td>
                    <td className="w-20 text-center"><span className="badge badge-pill bg-lightgreen">2</span></td>
                </tr>
                <tr>
                    <td>Speed Score Total</td>
                    <td className="text-center"><span className="badge badge-pill bg-lightgreen">205</span></td>
                </tr>
                <tr>
                    <td>Plots Completed Per Project</td>
                    <td className="text-center"><span className="badge badge-pill bg-lightgreen">8</span></td>
                </tr>
                <tr>
                    <td>Accuracy Score Per Project</td>
                    <td className="text-center"><span className="badge badge-pill bg-lightgreen">10</span></td>
                </tr>
                <tr>
                    <td>Plots Completed Total</td>
                    <td className="text-center"><span className="badge badge-pill bg-lightgreen">16</span></td>
                </tr>
                <tr>
                    <td>Accuracy Score Total</td>
                    <td className="text-center"><span className="badge badge-pill bg-lightgreen">10</span></td>
                </tr>
                <tr>
                    <td>Speed Score Per Project</td>
                    <td className="text-center"><span className="badge badge-pill bg-lightgreen">205</span></td>

                </tr>
                </tbody>
            </table>
            <form style={{visibility: 'visible'}}>
                <fieldset>
                    <strong>Congratulations!</strong> You are ranked <span
                    className="badge bg-lightgreen">#3</span> overall and <span
                    className="badge bg-lightgreen">#1</span> in your organization.
                </fieldset>
                <span>&nbsp;</span>
            </form>
            <hr className="d-block d-sm-none"/>
        </div>
    );
}

function AccountForm(props) {
    if (props.userId == props.accountId) {
        return (<div id="account-form" className="col mb-3">
                <h2 className="header px-0">Account Settings</h2>
                <h1>{props.username}</h1>

                <form action={props.documentRoot + "/account/" + props.accountId} method="post">
                    <div className="form-group">
                        <label htmlFor="email">Reset email</label>
                        <input autoComplete="off" id="email" name="email" placeholder="New email" defaultValue=""
                               type="email"
                               className="form-control"/>
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Reset password</label>
                        <div className="form-row">
                            <div className="col">
                                <input autoComplete="off" id="password" name="password" placeholder="New password"
                                       defaultValue=""
                                       type="password" className="form-control mb-1"/>
                            </div>
                            <div className="col">
                                <input autoComplete="off" id="password-confirmation" name="password-confirmation"
                                       placeholder="New password confirmation" defaultValue="" type="password"
                                       className="form-control"/>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="current-password">Verify your identity</label>
                        <input autocomplete=" off" id="current-password" name="current-password" placeholder="
                                       Current password" defaultValue="" type="password" class="form-control"/>
                    </div>
                    <input class="btn btn-outline-lightgreen btn-block" name="update-account" defaultValue="Update
                                       account settings" type="submit"/>
                </form>

            </div>
        );
    }
    else {
        return (
            <div id="account-form" className="col mb-3">
                <h2 className="header px-0">Account Settings</h2>
                <h1>{props.username}</h1>
            </div>
        );
    }
}

export default function renderAccount(args) {
    ReactDOM.render(
        <Account documentRoot={args.documentRoot} userId={args.userId} accountId={args.accountId} username={args.username}/>,
        document.getElementById("account")
    );
}
