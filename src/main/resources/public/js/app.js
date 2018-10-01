import renderHome from './home';
import renderCollection from './collection';
import renderInstitution from './institution';
import renderProject from './project';
import renderAccount from './account';

function renderPage(page, args) {
    switch (page) {
        case "home": renderHome(args); break;
        case "collection": renderCollection(args); break;
        case "institution": renderInstitution(args); break;
        case "project": renderProject(args); break;
        case "account": renderAccount(args); break;
    }
}
