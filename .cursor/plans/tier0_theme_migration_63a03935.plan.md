---
name: Tier0 Theme Migration
overview: Migrate the entire app from Henkel red theme (#e60000) to Tier0 green theme (#a3e635) by updating configuration files, core UI components, and all page components systematically.
todos:
  - id: config-tailwind
    content: Update tailwind.config.js to import and use tier0Theme colors
    status: pending
  - id: config-css
    content: Add CSS variables for Tier0 theme colors in src/index.css
    status: pending
  - id: component-button
    content: Update src/components/ui/button.jsx to use primary green for default variant
    status: pending
    dependencies:
      - config-tailwind
      - config-css
  - id: component-badge
    content: Update src/components/ui/badge.jsx to use primary green for default variant
    status: pending
    dependencies:
      - config-tailwind
      - config-css
  - id: component-layout
    content: "Update src/components/Layout.jsx: Replace all #e60000 with primary color classes (6 instances)"
    status: pending
    dependencies:
      - config-tailwind
      - component-button
  - id: component-userswitcher
    content: "Update src/components/UserSwitcher.jsx: Change ADMIN badge and active states to primary green"
    status: pending
    dependencies:
      - config-tailwind
      - component-badge
  - id: pages-admin
    content: "Update src/modules/admin/pages/UserManagement.jsx: Replace #e60000 with primary color"
    status: pending
    dependencies:
      - component-layout
  - id: pages-external
    content: "Update all 6 external page components: Replace #e60000 with primary color"
    status: pending
    dependencies:
      - component-layout
  - id: component-roleswitcher
    content: "Update src/components/RoleSwitcher.jsx: Replace red with primary color"
    status: pending
    dependencies:
      - component-layout
  - id: component-checkbox
    content: "Update src/components/ui/checkbox.jsx: Replace red with primary color"
    status: pending
    dependencies:
      - config-tailwind
  - id: visual-polish
    content: Test all pages, verify no red remains, ensure consistent green theme throughout
    status: pending
    dependencies:
      - pages-admin
      - pages-external
      - component-roleswitcher
      - component-checkbox
---

# Tier0 The

me Migration Plan

## Overview

Migrate the entire WMS app from Henkel red branding (#e60000) to Tier0 green branding (#a3e635) across all components, pages, and UI elements.

## Current State

- Theme file exists: `src/config/theme.js` with Tier0 colors already defined
- 11 files contain hardcoded red color (#e60000)
- Tailwind config doesn't use the theme yet
- CSS variables not set up
- Components use hardcoded colors instead of theme variables

## Implementation Strategy

### Phase 1: Configuration & Foundation (Core Theme Setup)

#### 1.1 Update Tailwind Config

**File:** `tailwind.config.js`

- Import theme from `src/config/theme.js`
- Extend Tailwind colors with Tier0 theme colors
- Add primary, secondary, and utility colors
- Keep existing HSL variables for compatibility

**Key Changes:**

```javascript
import { tier0Theme } from "./src/config/theme.js"

extend: {
  colors: {
    // Tier0 theme colors
    primary: tier0Theme.colors.primary,
    'tier0-dark': tier0Theme.colors.dark,
    // Keep existing HSL vars...
  }
}
```



#### 1.2 Add CSS Variables

**File:** `src/index.css`

- Add CSS custom properties for Tier0 colors
- Update button focus states to use green
- Update border colors to match theme
- Keep base styles clean and consistent

**Key Variables:**

```css
:root {
  --primary: #a3e635;
  --primary-hover: #84cc16;
  --primary-light: #d9f99d;
  --tier0-dark: #020617;
}
```



### Phase 2: Core UI Components (Affects Entire App)

#### 2.1 Update Button Component

**File:** `src/components/ui/button.jsx`

- Change default button to use `bg-primary` instead of `bg-slate-900`
- Update hover states to `hover:bg-primary-hover`
- Update focus rings to use primary color
- Keep destructive variant as red (for errors/warnings)

#### 2.2 Update Badge Component

**File:** `src/components/ui/badge.jsx`

- Change default variant to use primary color
- Add primary variant for green badges
- Update existing variants to maintain semantic meaning

#### 2.3 Update Layout Component (Navigation)

**File:** `src/components/Layout.jsx`

- Replace all `#e60000` with `text-primary` or `bg-primary/10`
- Update active menu item styles: `bg-primary/10 text-primary`
- Update active icon colors: `text-primary`
- Update hover states to use primary color
- Change `bg-red-50` to `bg-primary/10`
- Change `bg-red-100` to `bg-primary/20`

**Specific Changes:**

- Line 317: `text-[#e60000] `→ `text-primary`
- Line 339: `bg-red-50 text-[#e60000] `→ `bg-primary/10 text-primary`
- Line 346: `text-[#e60000] `→ `text-primary`
- Line 348: `bg-[#e60000] `→ `bg-primary`
- Line 372: `bg-red-50 text-[#e60000] hover:bg-red-100 `→ `bg-primary/10 text-primary hover:bg-primary/20`
- Line 377: `text-[#e60000] `→ `text-primary`

#### 2.4 Update UserSwitcher Component

**File:** `src/components/UserSwitcher.jsx`

- Update ADMIN role badge from red to primary green
- Update active check icon color
- Update hover states to use primary color

### Phase 3: Page Components (11 Files with Red Color)

#### 3.1 Admin Pages

**File:** `src/modules/admin/pages/UserManagement.jsx`

- Replace `#e60000` with primary color references

#### 3.2 External Pages

- `src/modules/external/pages/CostingEngine.jsx`
- `src/modules/external/pages/DnOperatorQueue.jsx`
- `src/modules/external/pages/OutboundDN.jsx`
- `src/modules/external/pages/Reports.jsx`
- `src/modules/external/pages/OutboundVAS.jsx`
- `src/modules/external/pages/ExternalDashboard.jsx`

**Changes:** Replace hardcoded `#e60000` with `text-primary`, `bg-primary`, or appropriate primary color classes.

#### 3.3 Additional Components

- `src/components/RoleSwitcher.jsx`
- `src/components/ui/checkbox.jsx`

### Phase 4: Visual Polish & Consistency

#### 4.1 Button Styles

- Update button border radius to match Tier0 aesthetic (rounded-md instead of rounded-full for primary actions)
- Ensure consistent padding and heights

#### 4.2 Active States

- Ensure all active states use primary green consistently
- Update focus rings to use primary color
- Update selection/highlight colors

#### 4.3 Icons & Accents

- Green icons for active states
- Green underlines for active tabs
- Green indicators for selected items

## Implementation Order

1. **Foundation First:** Update Tailwind config and CSS variables
2. **Core Components:** Button, Badge, Layout (affects everything)
3. **User Components:** UserSwitcher, RoleSwitcher
4. **Page Components:** Update all 11 files systematically
5. **Visual Polish:** Test and refine consistency

## Testing Checklist

After each phase, verify:

- [ ] Navigation active states are green
- [ ] Primary buttons are green
- [ ] Active menu items highlight in green
- [ ] Icons use green for active states
- [ ] Hover states use appropriate green shades
- [ ] No red (#e60000) remains except for errors/destructive actions
- [ ] All pages render correctly
- [ ] Focus states are visible and green

## Files to Modify

### Configuration (2 files)

1. `tailwind.config.js`
2. `src/index.css`

### Core UI Components (4 files)

3. `src/components/ui/button.jsx`
4. `src/components/ui/badge.jsx`
5. `src/components/Layout.jsx`
6. `src/components/UserSwitcher.jsx`

### Page Components (7 files)

7. `src/modules/admin/pages/UserManagement.jsx`
8. `src/modules/external/pages/CostingEngine.jsx`
9. `src/modules/external/pages/DnOperatorQueue.jsx`
10. `src/modules/external/pages/OutboundDN.jsx`
11. `src/modules/external/pages/Reports.jsx`
12. `src/modules/external/pages/OutboundVAS.jsx`
13. `src/modules/external/pages/ExternalDashboard.jsx`

### Additional Components (2 files)