import { useState, useEffect } from "react";
import Highlights from './highlights';
import Institutions from './institutions';
import Collect from './collect';

export default function HomeTabs ({tab, session}) {
  const [projects, setProjects] = useState([]);

  useEffect(()=>{
    session.userId &&
      fetch(`/get-home-projects`)
      .then((response) => (response.ok? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          console.log('fetched home projects', data);
          setProjects(data);
          return Promise.resolve();
        } else {
          return Promise.reject("No Projects Found");
        }
      });

  }, [session.userId]);
  
  switch (tab) {
  case 'highlights':
    return (<Highlights userId={session.userId} userRole={session.userRole}/>);
  case 'institutions' :
    return (<Institutions userId={session.userId} userRole={session.userRole}/>);
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



