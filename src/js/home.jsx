import React, { useState, useEffect } from "react";
import { useAtom } from "jotai";
import ReactDOM from "react-dom";
import { NavigationBar } from "./components/PageComponents";
import Modal from "./components/Modal";
import HomeTabs from "./home/components";
import { stateAtom } from "./utils/constants";


function Home ({ userId, userName, version }) {
  const [appState, setAppState] = useAtom(stateAtom);
  const [tab, setTab] = useState('highlights');

  function getUserStats (userId) {
    /*
      get data of logged-in user: TOS acceptance, ip login location for map centering(?)
    */

    fetch("/get-user-stats?accountId=" + userId)
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((stats) => {
        if (stats) {
          (!(stats.acceptTOS || "").length > 0) &&
            setAppState(s => ({ ... s, modal: {"TOS": true}}));
          return Promise.resolve();
        } else {
          return Promise.reject("Unable to get User Data");
        }       
      });
  }

  function userAcceptTOS (slug) {
    fetch(`/user-accept-tos?userId=${userId}&slug=${slug}`, { method: "POST" })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        setAppState(s => ({... s, modal: null}));
      })
      .catch((error) => {
        console.log(error);
      });
  }
  useEffect(()=>{
    Promise.all([getUserStats(userId)])
      .catch((response) => {
        setAppState (prev => ({ ... prev, modal: {alert: {alertType: "Collection Alert", alertMessage: "Error retrieving the collection data. See console for details."}}}));
      })
      .finally(() => setAppState(prev => ({... prev, modalMessage: null })));
  }, []);
  
  function TOSModal (){
    const [slug, setSlug] = useState("");
    return (
      <Modal
        title="Terms of Service"
        confirmDisabled={slug.length === 0}
        confirmText="Accept"          
        onConfirm={()=>{userAcceptTOS(slug);}}
      >
        <p>In order to use Collect Earth Online, please review and accept the
          <span
            onClick={()=>window.open('/terms-of-service')}
            style={{cursor: 'pointer',
                    textDecorationLine: 'underline',
                    color: 'var(--Primary-Highlight-Green)'}}
          > Terms of Service</span>.</p>
        <div>            
          <input type="text"
                 className="text-input"
                 value={slug}
                 onChange={(e)=> {setSlug(e.target.value);}}
                 placeholder="Enter Username to Accept"/>
        </div>
      </Modal>);

  }

  function AlertModal({alertType}) {
    return (<Modal title={appState.modal.alert.alertType}
    onClose={()=>{setAppState({ ... appState, modal: null});}}>
                                  {appState.modal.alert.alertMessage}
                                </Modal>);
  }

  function HomeModal({modal}) {
    const [tos, setTos] = useState("");
    if (modal) {
      const modalType = Object.keys(modal)[0];
      switch( modalType ) {
      case "alert": return (<AlertModal/>);
      case "TOS": return (<TOSModal/>);
      default: return (<></>);
      }    
    }
    else return null;
  }
  
  return (
    <NavigationBar userId={userId} userName={userName} version={version}
                   fxns={{tab: {get: tab, set: setTab}}}>
       <HomeModal modal={appState.modal}/>  
      <HomeTabs tab={tab}  userId={userId} userRole={null}/>
    </NavigationBar>
  );
}


export function pageInit(params, session) {
  ReactDOM.render(
    <Home userId={session.userId} userName={session.userName} version={session.versionDeployed}/>,
    document.getElementById("app")
  );
}
