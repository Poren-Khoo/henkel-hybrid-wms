import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import { MQTT_URL, MQTT_OPTIONS } from '../mqttConfig';

export function useUNS(topicPath) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('CONNECTING');
  const clientRef = useRef(null); // Keep track of the client so we don't lose it

  // Publish function to send messages to MQTT broker
  const publish = useCallback((topic, payload) => {
    const client = clientRef.current;
    
    if (!client) {
      console.warn('⚠️ Cannot publish, MQTT client not initialized');
      return;
    }

    if (!client.connected) {
      console.warn('⚠️ Cannot publish, MQTT disconnected');
      return;
    }

    try {
      const message = JSON.stringify(payload);
      client.publish(topic, message, (err) => {
        if (err) {
          console.error('❌ Publish Error:', err);
        } else {
          console.log(`📤 Sending to ${topic}:`, payload);
        }
      });
    } catch (error) {
      console.error('❌ Error stringifying payload:', error);
    }
  }, []);

  useEffect(() => {
    // 1. Generate a TRULY unique ID for this specific connection instance
    const uniqueClientId = "henkel_web_" + Math.random().toString(16).substr(2, 8);
    
    console.log(`🔌 Connecting with ID: ${uniqueClientId}...`);
    
    // 2. Merge options with new ID
    const options = { 
      ...MQTT_OPTIONS, 
      clientId: uniqueClientId,
      keepalive: 60,
    };

    const client = mqtt.connect(MQTT_URL, options);
    clientRef.current = client;

    client.on('connect', () => {
      console.log('✅ MQTT Connected!');
      setStatus('CONNECTED');
      
      // 3. Subscribe immediately
      client.subscribe(topicPath, (err) => {
        if (err) {
          console.error('❌ Subscribe Error:', err);
          setStatus('ERROR');
        } else {
          console.log(`📩 Listening to: ${topicPath}`);
        }
      });
    });

    client.on('message', (topic, message) => {
      try {
        console.log("📦 Data Received!"); // Debug log
        const payload = JSON.parse(message.toString());
        
        // Handle Tier0 "Envelope" format
        if (payload.topics && payload.topics[0] && payload.topics[0].value) {
           setData(payload.topics[0].value);
        } 
        // Handle "Flat" format (fallback)
        else {
           setData(payload);
        }
      } catch (e) {
        console.error('JSON Parse Error:', e);
      }
    });

    client.on('error', (err) => {
      console.error('⚠️ MQTT Error:', err);
      // Don't set status to ERROR immediately, allow it to try reconnecting
    });

    // Cleanup: Force disconnect when component unmounts
    return () => {
      console.log('🛑 Cleaning up connection...');
      if (client.connected) {
        client.end(true); // "true" forces immediate close
      }
    };
  }, [topicPath]);

  return { data, status, publish };
}
