import { useState, useEffect, useRef, useCallback } from 'react';

export default function SSEClient({
  onopen    = (msg) => {console.log (msg);},
  onmessage = (msg) => {console.log (msg);},
  onerror   = (msg) => {console.log (msg);},
}) {
  const [status, setStatus] = useState('disconnected');
  const eventSourceRef = useRef(null);

  const disconnectSSE = useCallback (() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close ();
      eventSourceRef.current = null;
    }
    setStatus ('disconnected');
  }, []);

  
  const connectSSE = useCallback(() => {
   
    setStatus('connecting');
    
    eventSourceRef.current = new EventSource('/open-socket');
    
    eventSourceRef.current.onopen = () => {
      onopen();
      setStatus('connected');      
    };
        
    eventSourceRef.current.onmessage = (event) => {
      if (event.data === 'heartbeat') { console.log ('SSE: Heartbeat received');};
      event.data.length > 0 &&
        onmessage(event); 
    };
    
    eventSourceRef.current.onerror = (error) => {
      onerror();
      setStatus('error');
      setTimeout (() => {
        disconnectSSE ();
        connectSSE ();
      }, 3000);
    }; 
  }, [disconnectSSE]);
  

  useEffect (() => {
    connectSSE ();
    return () => {
      disconnectSSE ();
    };
  }, [connectSSE, disconnectSSE]);
  
  useEffect (() => {
    if (status === 'error') {
      connectSSE();
      /*
      const timer = setTimeout (() => {
        connectSSE ();
        }, 5000);
        */
      // return () => clearTimeout (timer);
    };
  }, [status, connectSSE]);

  return (<></>);
}

export function handleAsyncEvent ({setAppState}) {
    setAppState(s => ({...s, showAlert: {message: "Sending Async Request"}}));
    fetch('/gcloud-listener', {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify ({        
      })      
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then ((data) => {
        setAppState(s => ({... s, showAlert: {message: "Async Request Successful. Pending Response."}}));        
      });    
  };


