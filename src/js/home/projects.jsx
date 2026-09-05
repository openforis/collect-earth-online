import React, { useEffect, useState } from "react";
import { atom, useAtom } from 'jotai';
import SvgIcon from "../components/svg/SvgIcon";
import { stateAtom } from '../utils/constants';
import "../../css/highlights.css";

export default function Projects ({}) {
  const [projects, setProjects] = useState([]);
  
  useEffect(()=>{
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

  }, []);
  
  return (
    <div id='collect-tab' className='home-tab'>
      <div className="header">
        <div className="header-row">
          <p className="header-title">Collect</p>
          <p className="header-subtitle"></p>
        </div>
      </div>
    </div>);
}
