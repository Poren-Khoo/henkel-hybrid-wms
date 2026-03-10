# Node-RED Flow Fixes Required

## Critical Issues Found:

### 1. **MQTT Out Nodes Have Empty Topic Fields** ⚠️
All your MQTT out nodes have `"topic": ""` which means they're not publishing to any topic!

**Fix:** In Node-RED, for each MQTT out node, change the topic setting to:
- **Option 1 (Recommended):** Set topic to `{{topic}}` or use `msg.topic` - This will use the topic from the incoming message
- **Option 2:** Set the topic directly to the full path (e.g., `Henkelv2/Shanghai/Logistics/MasterData/State/Materials`)

### 2. **Warehouse Action Listener is Wrong** ⚠️
You have a node listening to `Action: Update_Location` but the function inside handles `TOPIC_WH` (Warehouses). This is incorrect.

**Fix:** 
- Change the MQTT in node `8bd780f0b9317dbe` topic from:
  ```
  Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Location
  ```
  To:
  ```
  Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Warehouse
  ```

### 3. **Warehouse Publisher Node Name is Wrong** ⚠️
The node `cb23c71239e0e51c` is named "Pub: Locations" but it should publish Warehouses.

**Fix:** 
- Rename the node to "Pub: Warehouses"
- Make sure its topic is set to use `msg.topic` (or set to `Henkelv2/Shanghai/Logistics/MasterData/State/Warehouses`)

### 4. **Broker Configuration** ⚠️
You're using two different broker configs:
- `85bb67b2dbefe3ba` (emqx:1883)
- `a749d056cff1a785` (emqx:1883)

Make sure both are pointing to the same broker that your frontend connects to (`tier0-edge-demo.tier0.app:8084`).

## Step-by-Step Fix Instructions:

### Fix 1: Update MQTT Out Topics

For each MQTT out node in your flow:

1. **"Pub: Materials"** (`35fd0d91443502a5` and `fd883febf07534f0`):
   - Double-click the node
   - In the "Topic" field, enter: `{{topic}}` or leave it empty and check "Use topic from msg.topic"
   - Click "Done"

2. **"Pub: Locations"** (`80576419a0f8fa8c` and `0a5af91631900a10`):
   - Same as above

3. **"Pub: Containers"** (`3ba695d48e9e176c` and `55f83e9241ca190f`):
   - Same as above

4. **Warehouse Publisher** (`25f5f20b0fb620c3` and `cb23c71239e0e51c`):
   - Same as above
   - Rename `cb23c71239e0e51c` to "Pub: Warehouses"

### Fix 2: Fix Warehouse Action Listener

1. Find the node with ID `8bd780f0b9317dbe`
2. Double-click it
3. Change the topic from:
   ```
   Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Location
   ```
   To:
   ```
   Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Warehouse
   ```

### Fix 3: Verify Broker Connection

1. Check that your MQTT broker configs point to: `tier0-edge-demo.tier0.app:8084`
2. Make sure the port is `8084` (not 1883)
3. If using WSS, make sure TLS is enabled

## Testing After Fixes:

1. Deploy your Node-RED flow
2. Press the "Init SAP Data" inject button
3. Check the debug panel - you should see messages being published
4. In your browser console, check if the frontend is receiving messages
5. Verify the topics are being subscribed to correctly

## Quick JSON Fix (If you want to edit the flow JSON directly):

If you want to fix the JSON directly, here are the key changes:

1. For all MQTT out nodes, change:
   ```json
   "topic": ""
   ```
   To:
   ```json
   "topic": "{{topic}}"
   ```
   OR remove the topic field entirely (Node-RED will use msg.topic)

2. For the warehouse action listener (`8bd780f0b9317dbe`), change:
   ```json
   "topic": "Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Location"
   ```
   To:
   ```json
   "topic": "Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Warehouse"
   ```
