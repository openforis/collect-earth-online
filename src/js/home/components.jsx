import { useState, useEffect } from "react";
import Highlights from './highlights';
import Institutions from './institutions';
import Collect from './collect';


export default function HomeTabs ({tab, userId, userRole}) {
  // null while loading, so the collect tab can tell "loading" from "no projects".
  const [projects, setProjects] = useState(null);

  useEffect(()=>{
    if (!userId) {
      setProjects([]);
      return;
    }
    fetch(`/get-home-projects`)
      .then((response) => (response.ok? response.json() : Promise.reject(response)))
      .then(setProjects)
      .catch((error) => {
        console.error(error);
        setProjects([]);
      });
  }, [userId]);

  switch (tab) {
  case 'highlights':
    return (<Highlights userId={userId} userRole={userRole}/>);
  case 'institutions' :
    return (<Institutions userId={userId} userRole={userRole} projects={projects}/>);
  case 'collect' :
    return (<Collect projects={projects}/>);
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



