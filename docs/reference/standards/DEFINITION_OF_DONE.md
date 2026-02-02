# Definition of Done

A feature/page is complete when ALL items are checked.

---

## 1. MQTT Communication

### Subscriptions (State Topics)
- [ ] Uses correct State topic from MQTT_CONTRACT.md
- [ ] Topic is listed in `UNSContext.jsx` GLOBAL_SUBSCRIPTIONS
- [ ] Handles UNS envelope unwrapping (use `data.raw[TOPIC]`)
- [ ] Handles data structure variations (array vs `{items: [...]}`)

### Publications (Action Topics)
- [ ] Uses correct Action topic from MQTT_CONTRACT.md
- [ ] Payload includes `operator` field (current user)
- [ ] Payload includes `timestamp` field (Unix ms)
- [ ] Payload matches schema in MQTT_CONTRACT.md

---

## 2. Domain Logic

### Validator Usage
- [ ] Uses domain Validator class (NOT inline validation)
- [ ] Validator file exists: `src/domain/{module}/{Entity}Validator.js`
- [ ] Field-level errors returned for UI binding
- [ ] Custom error class: `{Entity}ValidationError`

### Service Usage
- [ ] Uses domain Service class (NOT inline command building)
- [ ] Service file exists: `src/domain/{module}/{Entity}Service.js`
- [ ] All commands built via `Service.buildXxxCommand()`
- [ ] Data normalization via `Service.normalize()` if needed

### State Machine (if applicable)
- [ ] Status transitions validated before sending
- [ ] `VALID_STATUSES` constant defined in Validator
- [ ] `VALID_TRANSITIONS` map defined in Validator
- [ ] `validateStatusTransition()` called before publish

---

## 3. User Experience

### Loading States
- [ ] Loading indicator during async operations
- [ ] Buttons disabled while submitting
- [ ] Skeleton/spinner for initial data load

### Error States
- [ ] Field-level validation errors displayed inline
- [ ] Form-level errors displayed prominently
- [ ] MQTT action timeout handled (5 second default)
- [ ] Error message is actionable (tells user what to do)

### Empty States
- [ ] Empty state shown when no data
- [ ] Empty state has helpful message/action

### Success Feedback
- [ ] Success feedback after actions (toast, redirect, or UI update)
- [ ] Form reset after successful submission
- [ ] User redirected or sees updated list

---

## 4. Code Quality

### Console & Errors
- [ ] No console errors in browser
- [ ] No React warnings
- [ ] No linter errors

### MQTT Resilience
- [ ] Handles MQTT disconnection gracefully
- [ ] Uses `UNSConnectionInfo` component for status display
- [ ] Publish checks connection status before sending

### Imports & Dependencies
- [ ] Imports from domain layer (Validator, Service)
- [ ] No business logic in component (moved to domain)
- [ ] No hardcoded topics (use `const TOPIC_XXX` at file top)

---

## 5. Documentation

### MQTT Contract
- [ ] Topics used are documented in `docs/MQTT_CONTRACT.md`
- [ ] Payload schema is documented
- [ ] If new topic created, add to Contract

### Node-RED (Backend)
- [ ] Corresponding handler exists in Node-RED (if Action topic)
- [ ] Handler documented in `docs/NODERED_HANDLERS.md`
- [ ] If new handler needed, TODO added to NODERED_HANDLERS.md

---

## Quick Reference

```javascript
// Standard page pattern
import { EntityValidator } from '@/domain/{module}/{Entity}Validator';
import { EntityService } from '@/domain/{module}/{Entity}Service';

const TOPIC_STATE = "Henkelv2/Shanghai/Logistics/.../State/...";
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/.../Action/...";

// Validation before publish
const errors = EntityValidator.collectCreateErrors(formData);
if (Object.keys(errors).length > 0) {
  setValidationErrors(errors);
  return;
}

// Build and publish
const payload = EntityService.buildCreateCommand(formData);
publish(TOPIC_ACTION, payload);
```
