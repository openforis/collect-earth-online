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
    const userPercents = Object.fromEntries(users.map((id, index) => [id, percents[index]]));

    const renderUser = ({id, email, percent}) => {
        const content = email + (userMethod === "percent" ? ` - ${percent}%` : "");
        return (
            <Badge key={id}>{content}</Badge>
        );
    };

    const assignedUsers = institutionUserList
        .filter(u => users.includes(u.id))
        .map(user => ({...user, percent: userPercents[user.id]}));

    return (
        <div className="d-flex">
            <div id="user-assignment-review">
                <table className="table table-sm" id="sample-review-table">
                    <tbody>
                        <ReviewRow content={userMethod} title="Method"/>
                        <tr>
                            <td className="w-80 pr-5">Users</td>
                            <td className="w-20 text-center">
                                {assignedUsers.map(renderUser)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
