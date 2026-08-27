import React, { useState } from "react";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";
import HomeTabs from "./home/components";


function Home ({params, session}) {
  const [tab, setTab] = useState('highlights');
  return (
    <NavigationBar userId={session.userId} userName={session.userName} version={session.versionDeployed}
                   fxns={{tab: {get: tab, set: setTab}}}>
      <HomeTabs tab={tab} session={session}/>
    </NavigationBar>
  );
}

export function pageInit(params, session) {
  ReactDOM.render(
    <Home params={params} session={session}/>,
    document.getElementById("app")
  );
}
