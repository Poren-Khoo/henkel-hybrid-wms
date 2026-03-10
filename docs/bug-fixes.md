# Bug Fixes Log

A running log of significant bugs encountered, their root causes, and solutions. Use this as a reference to avoid repeating mistakes.

---

## 2026-02-04: Page Transition Broke Dialog Component (Chain Bug)

### Problem
After adding CSS page transitions, the "View" button on OutboundOrders stopped opening the detail dialog. Multiple cascading errors appeared:
- `Cannot access 'orderToDisplay' before initialization`
- `Rendered more hooks than during the previous render`
- Dialog simply not appearing (no error)

### Root Cause (Chain of 4 Issues)
1. **Tailwind v4 incompatibility**: `tailwindcss-animate` is a v3 plugin that silently fails in Tailwind v4
2. **Incomplete CSS keyframe**: Animation only had `from` state, no `to` state - elements could stay invisible
3. **React Rules of Hooks violation**: `useMemo` hooks were placed after an early `return null` statement
4. **Missing Portal**: Dialog rendered inside `overflow-auto` container, trapped in parent stacking context

### Solution
1. Added manual animation CSS with both `from` and `to` keyframe states
2. Moved all hooks BEFORE early return statements
3. Used `createPortal(... , document.body)` in DialogContent component

### Key Lesson
**One change can expose multiple latent bugs.** The transition didn't cause these bugs - it revealed pre-existing fragility:
- Plugin incompatibility was always there
- Dialog was always missing Portal (worked by luck)
- Component structure was fragile (hooks would break with any conditional)

### Similar Bugs to Watch For
- Any v3 Tailwind plugin in a v4 project
- CSS animations with only `from` (or only `to`) keyframes
- Hooks inside conditionals or after early returns
- Fixed/absolute positioned modals inside scrollable containers
- Any `animate-in` class not working → check if CSS actually exists

### Files Changed
- `src/index.css` (animation keyframes)
- `src/components/ui/dialog.jsx` (added Portal)
- `src/modules/outbound/pages/OutboundOrderDetail.jsx` (hooks order)
- `src/components/PageTransition.jsx` (new component)
- `src/components/Layout.jsx` (wrap Outlet with transition)

---

## 2026-02-05: Node-RED Backend Publishing to Wrong MQTT Topic

### Problem
After clicking "Generate DNs" in Node-RED, the debug panel shows data was published, but the `OutboundOrders.jsx` page doesn't update. Old "garbage data" persists even after clicking "Reset All Data".

### Root Cause
**Documentation was not consulted before implementing.** The Node-RED backend was publishing to the wrong topic:

| Wrong Topic | Correct Topic |
|------------|---------------|
| `Henkelv2/Shanghai/Logistics/Outbound/State/DN_Workflow` | `Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB` |

The frontend `OutboundOrders.jsx` reads from `data.dns` which is ONLY populated by `DN_Workflow_DB` topic (see `UNSContext.jsx` line 202-203). The topic naming convention is clearly documented in:
- `docs/reference/architecture/MQTT_CONTRACT.md` (Section 4.1, line 213)
- `docs/reference/architecture/ARCHITECTURE_OVERVIEW.md` (line 143)

### Solution
Used `replace_all` to change all 11 occurrences of `Outbound/State/DN_Workflow` to `Costing/State/DN_Workflow_DB` in `nodered/outbound.json`.

### Key Lesson
**ALWAYS read `/docs/reference/architecture/MQTT_CONTRACT.md` before implementing ANY MQTT-related changes.** This file is the single source of truth for topic naming.

### Prevention Checklist
- [ ] Before changing MQTT topics, check `MQTT_CONTRACT.md`
- [ ] Before creating new backend flows, check which topics the frontend subscribes to in `UNSContext.jsx`
- [ ] Verify frontend reads data from `data.dns`, `data.raw[TOPIC]`, or `data.rates` - understand which bucket your topic updates

### Files Changed
- `nodered/outbound.json` (all DN topic references)

---

<!-- Add new entries above this line -->
