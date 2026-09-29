import { useState, useEffect } from "react";
import Highlights from './highlights';
import Institutions from './institutions';
import Collect from './collect';


export default function HomeTabs ({tab, userId, userRole}) {
  const [projects, setProjects] = useState([]);

  useEffect(()=>{
    userId &&
      fetch(`/get-home-projects`)
      .then((response) => (response.ok? response.json() : Promise.reject(response)))
      .then((data) => {
        if (data.length > 0) {
          setProjects(data);
          return Promise.resolve();
        } else {
          return Promise.reject("No Projects Found");
        }
      });
  }, [userId]);

  switch (tab) {
  case 'highlights':
    return (<Highlights userId={userId} userRole={userRole}/>);
  case 'institutions' :
    return (<Institutions userId={userId} userRole={userRole}/>);
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



