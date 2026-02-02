import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import { MQTT_URL, MQTT_OPTIONS } from '../mqttConfig';

const UNSContext = createContext();

// CRITICAL: List of topics to load immediately when the app starts
const GLOBAL_SUBSCRIPTIONS = [
  // --- 1. EXTERNAL LOGISTICS (Operations) ---
  "Henkelv2/Shanghai/Logistics/External/Integration/State/Sync_Status",
  
  // --- 2. FINANCE & COSTING (Management) ---
  "Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB",      // The big database of orders
  "Henkelv2/Shanghai/Logistics/Costing/State/Financial_Trends",     // The Chart data
  "Henkelv2/Shanghai/Logistics/Costing/State/Bill_Generated",       // The Calculator result
  "Henkelv2/Shanghai/Logistics/Finance/State/Monthly_Billing",      // [NEW] For Reconciliation Page
  
  // --- 3. MASTER DATA (Control) ---
  "Henkelv2/Shanghai/Logistics/MasterData/State/Rate_Cards",
  "Henkelv2/Shanghai/Logistics/MasterData/State/Materials",
  "Henkelv2/Shanghai/Logistics/MasterData/State/Locations",
  "Henkelv2/Shanghai/Logistics/MasterData/State/Containers",
  "Henkelv2/Shanghai/Logistics/MasterData/State/Warehouses",
  "Henkelv2/Shanghai/Logistics/MasterData/State/BusinessPartners",
  "Henkelv2/Shanghai/Logistics/MasterData/State/Workers",

  // --- 4. INTERNAL WAREHOUSE (Manufacturing Support) ---
  "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level", // Real-time Stock
  "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Task_Queue",      // Forklift Drivers' tasks
  "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inbound_Plan",
  "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Disposition_Queue", // QC Disposition Queue
  "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Decision_Queue", // QA Manager Approval Queue
  "Henkelv2/Shanghai/Logistics/Production/State/Order_List",      // The Master Schedule
  "Henkelv2/Shanghai/Logistics/Production/State/Reservation_List", // Material Demands
  "Henkelv2/Shanghai/Logistics/Production/State/Picking_Tasks" ,    // Tasks for Operators
  
  // --- 5. EXCEPTIONS & GOVERNANCE ---
  "Henkelv2/Shanghai/Logistics/Exceptions/State/Dispute_List",      // [NEW] For 3PL Exceptions Page
  "Henkelv2/Shanghai/Logistics/Exceptions/State/Audit_Log",
  "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Trace_Result",
  "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Exceptions",       // [NEW] For Internal Exception Management


  // --- 6. UPCOMING FEATURES (Pre-loading for next phase) ---
  "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Inspection_Queue" // Ready for QC Page
];

export const UNSProvider = ({ children }) => {
  const [data, setData] = useState({
    // We categorize data to avoid collisions
    dns: [],       // For DN_Workflow_DB
    rates: {},     // For Rate_Cards
    raw: {}        // Fallback for everything else (Disputes, Billing, Inventory, etc.)
  });
  
  const [status, setStatus] = useState('CONNECTING');
  const clientRef = useRef(null);

  // 1. The "Publish" function (Global Version)
  const publish = useCallback((topic, payload) => {
    const client = clientRef.current;
    if (client && client.connected) {
      try {
        const message = JSON.stringify(payload);
        client.publish(topic, message);
        console.log(`📤 Global Publish to ${topic}`);
      } catch (err) {
        console.error('❌ Publish Error', err);
      }
    } else {
      console.warn('⚠️ MQTT Disconnected, cannot publish');
    }
  }, []);

  // 2. The Connection Logic (Runs ONCE)
  useEffect(() => {
    // Generate a permanent ID for this session
    const uniqueClientId = "henkel_global_" + Math.random().toString(16).substr(2, 8);
    const options = { ...MQTT_OPTIONS, clientId: uniqueClientId, keepalive: 60 };

    console.log(`🔌 Global MQTT Connecting as ${uniqueClientId}...`);
    const client = mqtt.connect(MQTT_URL, options);
    clientRef.current = client;

    client.on('connect', () => {
      console.log('✅ Global MQTT Connected!');
      setStatus('CONNECTED');
      
      // ADD A TINY DELAY just to be safe (fixes race condition)
      setTimeout(() => {
        // Check if client is still connected before subscribing
        if (client.connected && clientRef.current === client) {
          console.log("Subscribing to topics...", GLOBAL_SUBSCRIPTIONS);
          // Log MasterData subscriptions specifically
          const masterDataTopics = GLOBAL_SUBSCRIPTIONS.filter(t => t.includes("MasterData"));
          console.log("📋 MasterData topics to subscribe:", masterDataTopics);
          
          client.subscribe(GLOBAL_SUBSCRIPTIONS, (err) => {
            if (err) console.error("❌ Subscription Error:", err);
            else {
              console.log(`📩 Subscribed successfully to ${GLOBAL_SUBSCRIPTIONS.length} topics`);
              console.log(`📋 MasterData subscriptions:`, masterDataTopics);
            }
          });
        }
      }, 100);
    });

    client.on('message', (topic, payload) => {
      try {
        const messageStr = payload.toString();
        const parsed = JSON.parse(messageStr);
        
        // DEBUG: Log ALL MasterData topics to see what's coming in
        if (topic.includes("MasterData")) {
          console.log(`📨 [MasterData] Received on topic:`, topic);
          console.log(`📨 [MasterData] RAW payload:`, parsed);
        }
        
        // Extract the "Real" Value (handling the Tier0 Envelope)
        let cleanValue = parsed;
        
        // Handle Tier0 envelope structure: { version: "1.0", topics: [{ value: ... }] }
        if (parsed.topics && Array.isArray(parsed.topics) && parsed.topics.length > 0) {
          // Check if topics[0] has a 'value' property
          if (parsed.topics[0].value !== undefined) {
            cleanValue = parsed.topics[0].value;
          } else {
            // If no 'value' property, use topics[0] directly
            cleanValue = parsed.topics[0];
          }
        }

        // DEBUG: Log Task_Queue messages to debug
        if (topic.includes("Task_Queue")) {
            console.log(`🔔 Task_Queue RAW:`, parsed);
            console.log(`🔔 Task_Queue CLEAN:`, cleanValue);
            console.log(`🔔 Task_Queue Topic:`, topic);
        }

        // DEBUG: Log Inspection_Queue messages to debug
        if (topic.includes("Inspection_Queue")) {
            console.log(`🔔 Inspection_Queue RAW:`, parsed);
            console.log(`🔔 Inspection_Queue CLEAN:`, cleanValue);
            console.log(`🔔 Inspection_Queue Topic:`, topic);
        }

        // DEBUG: Log Decision_Queue messages to debug
        if (topic.includes("Decision_Queue")) {
            console.log(`🔔 Decision_Queue RAW:`, parsed);
            console.log(`🔔 Decision_Queue CLEAN:`, cleanValue);
            console.log(`🔔 Decision_Queue Topic:`, topic);
        }

        // DEBUG: Log Inventory_Level messages to debug
        if (topic.includes("Inventory_Level")) {
            console.log(`🔔 Inventory_Level RAW:`, parsed);
            console.log(`🔔 Inventory_Level CLEAN:`, cleanValue);
            console.log(`🔔 Inventory_Level Topic:`, topic);
        }

        // DEBUG: Log new topics to ensure they are working
        if (topic.includes("Dispute_List") || topic.includes("Monthly_Billing")) {
            console.log(`🔔 NEW DATA [${topic.split('/').pop()}]:`, cleanValue);
        }

        // DEBUG: Log Materials messages to debug
        if (topic.includes("Materials")) {
            console.log(`🔔 Materials RAW:`, parsed);
            console.log(`🔔 Materials CLEAN:`, cleanValue);
            console.log(`🔔 Materials Topic:`, topic);
            console.log(`🔔 Materials cleanValue type:`, typeof cleanValue, Array.isArray(cleanValue));
        }

        // DEBUG: Log Locations messages to debug
        if (topic.includes("Locations")) {
            console.log(`🔔 Locations RAW:`, parsed);
            console.log(`🔔 Locations CLEAN:`, cleanValue);
            console.log(`🔔 Locations Topic:`, topic);
        }

        // DEBUG: Log Containers messages to debug
        if (topic.includes("Containers")) {
            console.log(`🔔 Containers RAW:`, parsed);
            console.log(`🔔 Containers CLEAN:`, cleanValue);
            console.log(`🔔 Containers Topic:`, topic);
        }

        // Route the data to the right "Bucket"
        setData(prev => {
          const newData = { ...prev };
          
          // Optimization: Specialized buckets for heavy data
          if (topic.includes('DN_Workflow_DB')) {
            newData.dns = cleanValue; 
          } else if (topic.includes('Rate_Cards')) {
            newData.rates = cleanValue;
          }
          
          // ALWAYS update raw bucket (This is what Reconciliation & Exceptions use)
          // Create a new raw object to ensure React detects the change
          newData.raw = { ...prev.raw, [topic]: cleanValue };
          
          return newData;
        });

      } catch (e) {
        console.error('Global JSON Error:', e);
      }
    });

    client.on('error', (err) => console.error('Global MQTT Error:', err));

    return () => {
      console.log('🛑 Closing Global Connection');
      if (client && client.connected) {
        client.end();
      }
      clientRef.current = null;
    };
  }, []);

  return (
    <UNSContext.Provider value={{ data, publish, status }}>
      {children}
    </UNSContext.Provider>
  );
};

// 3. The Hook to use in your pages
export const useGlobalUNS = () => useContext(UNSContext);