import { useState, useEffect, useRef, useCallback } from 'react';

export default function SSEClient() {
  const [status, setStatus] = useState('disconnected');
  
  const eventSourceRef = useRef(null);

  const disconnectSSE = useCallback (() => {
    console.log('SSE: Disconnecting');
    if (eventSourceRef.current) {
      eventSourceRef.current.close ();
      eventSourceRef.current = null;
    }
    setStatus ('disconnected');
  }, []);

  
  const connectSSE = useCallback(() => {
    
    console.log('SSE: Attempting to connect');
    setStatus('connecting');
    
    eventSourceRef.current = new EventSource('/broadcast');
    
    eventSourceRef.current.onopen = () => {
      console.log('SSE: Connection opened');
      setStatus('connected');      
    };
        
    eventSourceRef.current.onmessage = (event) => {
      console.log('SSE: Received message: ', event);
      if (event.data === 'heartbeat') { console.log ('SSE: Heartbeat received');};
      console.log ('SSE: Data received', event.data);
    };
    
    eventSourceRef.current.onerror = (error) => {
      console.log('SSE: Error occurred', error);
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
      const timer = setTimeout (() => {
        connectSSE ();
      }, 5000);
      return () => clearTimeout (timer);
    };
  }, [status, connectSSE]);

  return (<></>);
} 

