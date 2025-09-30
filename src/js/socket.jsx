import { useState, useEffect, useRef, useCallback } from 'react';

export default function SSEClient({callback}) {
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
      setStatus('connected');      
    };
        
    eventSourceRef.current.onmessage = (event) => {
      if (event.data === 'heartbeat') { console.log ('SSE: Heartbeat received');};
      event.data.length > 0 &&
        callback(s => ({...s, modal: {alert: {alertMessage: event.data}}})); 
    };
    
    eventSourceRef.current.onerror = (error) => {
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

