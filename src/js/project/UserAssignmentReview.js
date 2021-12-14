import React from "react";

function Badge({children}) {
    return (
        <span className="badge badge-pill bg-lightgreen ml-1">{children}</span>
    );
}

function ReviewRow({title, content}) {
    return (
        <tr>
            <td className="w-80 pr-5">{title}</td>
            <td className="w-20 text-center">
                <Badge>{content}</Badge>
            </td>
        </tr>
    );
}

export default function UserAssignmentReview({designSettings, institutionUserList = []}) {
    const {userAssignment: {userMethod, users, percents}} = designSettings;

    const renderUser = (id, email, percent) => (
        <Badge key={id}>{email + (userMethod === "percent" ? ` - ${percent}%` : "")}</Badge>
    );

    return (
        <div className="d-flex">
            <div id="user-assignment-review">
                <table className="table table-sm" id="sample-review-table">
                    <tbody>
                        <ReviewRow content={userMethod} title="Method"/>
                        <tr>
                            <td className="w-80 pr-5">Users</td>
                            <td className="w-20 text-center">
                                {users.map((userId, idx) => {
                                    const {email} = (institutionUserList.find(({id}) => userId === id) || {});
                                    return renderUser(userId, email, percents[idx]);
                                })}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
