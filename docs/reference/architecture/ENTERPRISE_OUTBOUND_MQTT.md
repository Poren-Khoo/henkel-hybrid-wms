# Enterprise Outbound MQTT Topics

This document describes the new MQTT topics introduced for the enterprise outbound module.

## Action Topics (Frontend → Backend)

| Topic | Payload | Description |
|-------|---------|-------------|
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Hold_Order` | `{ dn_no, reason, operator }` | Put an order on hold |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Release_Hold` | `{ dn_no, operator }` | Release an order from hold |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Create_Wave` | `{ ship_date, carrier, route, pick_method, delivery_ids[] }` | Create a new wave |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Release_Wave` | `{ wave_id, operator }` | Release wave (triggers allocation) |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Add_To_Wave` | `{ dn_no, wave_id }` | Add order to existing wave |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Remove_From_Wave` | `{ dn_no }` | Remove order from wave |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Allocate_DN` | `{ dn_no }` | Direct allocation (manufacturing) |
| `Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Delivery` | `{ dn_no, production_line }` | Confirm delivery to line (manufacturing) |

## State Topics (Backend → Frontend)

| Topic | Payload | Description |
|-------|---------|-------------|
| `Henkelv2/Shanghai/Logistics/Outbound/State/DN_Workflow` | `{ items: [...orders] }` | Updated order list with statuses |
| `Henkelv2/Shanghai/Logistics/Outbound/State/Wave_List` | `{ items: [...waves] }` | Wave planning list |
| `Henkelv2/Shanghai/Logistics/Outbound/State/Picking_Tasks` | `{ items: [...tasks] }` | Outbound picking tasks |

## Order Status Flow

### Trading (SALES_ORDER)
```
RELEASED → WAVE_ASSIGNED → ALLOCATING → ALLOCATED → PICKING → PICKED → PACKING → PACKED → SHIPPED
     ↓           ↓
  ON_HOLD     ON_HOLD
```

### Manufacturing (TRANSFER_OUT, PRODUCTION_ISSUE)
```
RELEASED → ALLOCATING → ALLOCATED → PICKING → PICKED → DELIVERED
     ↓
  ON_HOLD
```

## Wave Status Flow
```
PLANNED → RELEASED → IN_PROGRESS → COMPLETED
    ↓         ↓
CANCELLED  CANCELLED
```

## Global Variables (Node-RED)

| Variable | Type | Description |
|----------|------|-------------|
| `outbound_dn_db` | `{ items: [] }` | Outbound delivery orders |
| `wave_db` | `{ items: [] }` | Wave planning records |
| `outbound_task_db` | `{ items: [] }` | Outbound picking tasks |

## Integration Notes

1. **Importing Flows**: The `enterprise_outbound_flows.json` file can be imported directly into Node-RED via the hamburger menu → Import.

2. **Broker Reference**: The flows reference `a749d056cff1a785` as the MQTT broker ID. Update this if your broker has a different ID.

3. **Tab ID**: Flows are configured for tab `99f9fe79da9e4937` (Hybrid_WMS). Update if needed.
