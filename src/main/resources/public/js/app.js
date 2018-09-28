import React from 'react';
import ReactDOM from 'react-dom';
import Home from './home';
import Collection from './collection';
import Institution from './institution';
import Project from './project';
import Account from './account';

function renderHome(args) {
    ReactDOM.render(React.createElement(Home, { documentRoot: args.documentRoot, userId: args.userId, username: args.username }), document.getElementById("home"));
}
function renderCollection(args) {
    ReactDOM.render(React.createElement(Collection, { documentRoot: args.documentRoot, userName: args.username, projectId: args.projectId }), document.getElementById("collection"));
}
function renderInstitution(args) {
    ReactDOM.render(React.createElement(Institution, { documentRoot: args.documentRoot, userId: args.userId, institutionId: args.institutionId,
        of_users_api_url: args.of_users_api_url, role: args.role, storage: args.storage, nonPendingUsers: args.nonPendingUsers,
        pageMode: args.pageMode }), document.getElementById("institution"));
}

function renderProject(args) {
    ReactDOM.render(React.createElement(Project, { documentRoot: args.documentRoot, userId: args.userId, projectId: args.projectId, institutionId: args.institutionId,
        project_stats_visibility: args.project_stats_visibility,
        project_template_visibility: args.project_template_visibility }), document.getElementById("project"));
}
function renderAccount(args) {
    ReactDOM.render(React.createElement(Account, { documentRoot: args.documentRoot, userId: args.userId, accountId: args.accountId, username: args.username }), document.getElementById("account-page"));
}

function renderPage(page, args) {
    switch (page) {
        case "home":
            renderHome(args);
            break;
        case "collection":
            renderCollection(args);
            break;
        case "institution":
            renderInstitution(args);
            break;
        case "project":
            renderProject(args);
            break;
        case "account-page":
            renderAccount(args);
            break;
    }
}