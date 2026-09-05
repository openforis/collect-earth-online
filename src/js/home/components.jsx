import Highlights from './highlights';
import Institutions from './institutions';
import Projects from './projects';

export default function HomeTabs ({tab, session}) {
  switch (tab) {
  case 'highlights':
    return (<Highlights userId={session.userId} userRole={session.userRole}/>);
  case 'institutions' :
    return (<Institutions userId={session.userId} userRole={session.userRole}/>);
  case 'collect' :
    return (<Projects/>);
  case 'manage' :
    return (
      <div id='manage-tab' className='home-tab'>
        <div className="header">
          <div className="header-row">
            <p className="header-title">Manage</p>
            <p className="header-subtitle"></p>
          </div>
        </div>
      </div>);
  default: return (<></>);
  }}



