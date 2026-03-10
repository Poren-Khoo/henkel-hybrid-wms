# Page Transition Broke Dialog - Chain Bug Analysis

**Date:** 2026-02-04  
**Severity:** High (feature completely broken)  
**Time to Fix:** ~45 minutes  
**Tags:** #react-hooks #css-animations #tailwind-v4 #portal #stacking-context #dialog

---

## Summary

Adding CSS page transitions caused a cascade of 4 separate bugs that together prevented the OutboundOrders "View" dialog from opening. This documents the full debugging process and lessons learned.

---

## Problem Context

### What We Were Trying to Do
Add subtle page transition animations when navigating between sidebar menu items:
- Fade + slide-up effect (200ms)
- Professional feel for WMS application
- Using existing `tailwindcss-animate` package

### What Broke
1. Page transitions didn't work (no visible animation)
2. Clicking "View" button on OutboundOrders table did nothing
3. Console errors about React hooks
4. Dialog component completely non-functional

---

## The Chain of Bugs

```
┌─────────────────────────────────────────────────────────────────┐
│  Bug #1: Tailwind v4 Plugin Incompatibility                     │
│  tailwindcss-animate is v3 plugin, silently fails in v4         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Bug #2: Incomplete CSS Keyframe                                │
│  Added manual CSS but only 'from' state, no 'to' state          │
│  Elements could stay at opacity:0 after animation               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Bug #3: React Rules of Hooks Violation                         │
│  Tried to fix dialog by moving early return                     │
│  Put useMemo hooks AFTER conditional return = crash             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Bug #4: Missing Portal (Stacking Context)                      │
│  Dialog inside overflow:auto container                          │
│  Fixed positioning trapped in parent context                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Bug #1: Tailwind v4 Plugin Incompatibility

### The Setup
```js
// package.json
"tailwindcss": "^4.1.18",
"tailwindcss-animate": "^1.0.7"  // v3 plugin!

// src/index.css
@import "tailwindcss";  // v4 syntax

// tailwind.config.js
import animate from "tailwindcss-animate"
plugins: [animate]  // Plugin loaded but NOT WORKING
```

### Why It Failed
Tailwind v4 completely changed its architecture:
- v3: `@tailwind base; @tailwind components; @tailwind utilities;`
- v4: `@import "tailwindcss";`

Plugins built for v3 don't know how to inject CSS in v4's new system. The plugin loads without error but produces no output.

### The Fix
Added animation CSS manually to `src/index.css` instead of relying on the plugin.

---

## Bug #2: Incomplete CSS Keyframe

### Before (Broken)
```css
@keyframes enter {
  from {
    opacity: var(--tw-enter-opacity, 1);
    transform: scale3d(var(--tw-enter-scale, 1), ...);
  }
  /* NO 'to' STATE! */
}

.animate-in {
  animation-fill-mode: forwards;  /* Stays at LAST keyframe */
}

.fade-in { --tw-enter-opacity: 0; }
.zoom-in-95 { --tw-enter-scale: 0.95; }
```

### Why It Failed
With only `from` defined:
1. Animation starts at `opacity: 0, scale: 0.95`
2. Should animate TO element's natural state
3. But `animation-fill-mode: forwards` keeps element at final keyframe
4. Without explicit `to`, browser behavior is inconsistent
5. Element can remain invisible

### After (Fixed)
```css
@keyframes enter {
  from {
    opacity: var(--tw-enter-opacity, 1);
    transform: translate3d(...) scale3d(...);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale3d(1, 1, 1) rotate(0);
  }
}
```

---

## Bug #3: React Rules of Hooks Violation

### Error Messages
```
Cannot access 'orderToDisplay' before initialization
Rendered more hooks than during the previous render
```

### Before (Broken) - Attempt 1
```jsx
function OutboundOrderDetail({ order: initialOrder, open }) {
  const [currentOrder, setCurrentOrder] = useState(initialOrder)
  
  useEffect(() => { ... }, [initialOrder])
  
  // Early return BEFORE hooks
  if (!open || !initialOrder) return null
  
  // Variable used before declaration!
  const orderToDisplay = currentOrder || initialOrder
  
  // Hooks AFTER early return = VIOLATION
  const progressSteps = useMemo(() => {
    return getSteps(orderToDisplay)  // orderToDisplay not defined yet!
  }, [orderToDisplay])
}
```

### Before (Broken) - Attempt 2
```jsx
function OutboundOrderDetail({ order: initialOrder, open }) {
  useEffect(() => { ... })
  
  if (!open) return null  // Returns here on first render
  
  // These hooks only run when open=true
  // Different number of hooks per render = CRASH
  const data = useMemo(() => { ... })
  const config = useMemo(() => { ... })
}
```

### After (Fixed)
```jsx
function OutboundOrderDetail({ order: initialOrder, open }) {
  const [currentOrder, setCurrentOrder] = useState(initialOrder)
  
  // ALL useEffects first
  useEffect(() => { ... }, [initialOrder])
  useEffect(() => { ... }, [data])
  
  // Derived value (not a hook)
  const orderToDisplay = currentOrder || initialOrder
  
  // ALL useMemos - they handle null internally
  const progressSteps = useMemo(() => {
    if (!orderToDisplay) return []
    return getSteps(orderToDisplay)
  }, [orderToDisplay?.status])
  
  const statusConfig = useMemo(() => {
    if (!orderToDisplay) return { label: 'Unknown' }
    return getConfig(orderToDisplay)
  }, [orderToDisplay?.status])
  
  // Early return AFTER all hooks
  if (!open || !initialOrder) return null
  
  return <Dialog>...</Dialog>
}
```

### React Rules of Hooks (Official Rules)
1. Only call hooks at the top level (not inside loops, conditions, nested functions)
2. Only call hooks from React function components or custom hooks
3. Hooks must be called in the same order every render
4. Same NUMBER of hooks must run every render

---

## Bug #4: Missing Portal (Stacking Context)

### The DOM Structure
```jsx
// Layout.jsx
<SidebarInset>
  <header>...</header>
  <div className="overflow-auto">  {/* Creates stacking context */}
    <PageTransition>
      <Outlet />  {/* OutboundOrders renders here */}
    </PageTransition>
  </div>
</SidebarInset>

// OutboundOrders.jsx (inside Outlet)
<OutboundOrderDetail order={...} open={true}>
  <Dialog>
    <DialogContent className="fixed z-50">  {/* Trapped! */}
```

### Why It Failed
Even with `position: fixed` and `z-index: 50`, the dialog was rendered inside a parent with `overflow-auto`. This can create a new stacking context that traps fixed-positioned children.

### Before (Broken)
```jsx
const DialogContent = ({ children }) => {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50">
      {/* Rendered in normal DOM position */}
      {/* Parent's overflow/transform can trap this */}
      {children}
    </div>
  )
}
```

### After (Fixed)
```jsx
import { createPortal } from 'react-dom'

const DialogContent = ({ children }) => {
  if (!open) return null
  
  return createPortal(
    <div className="fixed inset-0 z-50">
      {children}
    </div>,
    document.body  // Renders directly in <body>, escapes all parents
  )
}
```

---

## Files Changed

### src/index.css
Added complete animation system with proper keyframes:
```css
@keyframes enter {
  from { /* starting state */ }
  to { /* ending state */ }
}

.animate-in { animation-name: enter; ... }
.fade-in { --tw-enter-opacity: 0; }
.slide-in-from-bottom-4 { --tw-enter-translate-y: 1rem; }
/* etc. */
```

### src/components/ui/dialog.jsx
- Added `import { createPortal } from 'react-dom'`
- Wrapped DialogContent return in `createPortal(..., document.body)`

### src/modules/outbound/pages/OutboundOrderDetail.jsx
- Moved all `useMemo` hooks before the early return
- Added null checks inside each useMemo
- Early return moved to after all hooks

### src/components/PageTransition.jsx (new)
```jsx
export default function PageTransition({ children, className }) {
  return (
    <div className={cn(
      'w-full min-h-0',
      'animate-in fade-in slide-in-from-bottom-4 duration-200',
      className
    )}>
      {children}
    </div>
  )
}
```

### src/components/Layout.jsx
```jsx
<div className="flex-1 overflow-auto p-[10px] bg-slate-50">
  <PageTransition key={location.pathname}>
    <Outlet />
  </PageTransition>
</div>
```

---

## Prevention Checklist

Use this checklist when adding animations or modals:

- [ ] Check if CSS framework plugins are compatible with your version
- [ ] CSS keyframes have both `from` AND `to` states
- [ ] All React hooks are called unconditionally at component top
- [ ] Early returns come AFTER all hooks
- [ ] Modals/dialogs use Portal to render in document.body
- [ ] Test the feature in isolation before integrating

---

## Related Documentation

- [React Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [React Portal](https://react.dev/reference/react-dom/createPortal)
- [CSS Stacking Context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context)
- [Tailwind v4 Migration](https://tailwindcss.com/docs/upgrade-guide)
- [CSS animation-fill-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-fill-mode)

---

## Concepts to Study

1. **React Hooks Lifecycle** - How React tracks hooks between renders
2. **CSS Stacking Context** - What creates new contexts, how z-index works
3. **React Portals** - Rendering outside parent DOM hierarchy
4. **CSS Animations** - Keyframes, fill-mode, timing functions
5. **Tailwind v4 Architecture** - How it differs from v3

---

## ELI5 Summary

### The Bug in Simple Terms

想象你在装修房子 (decorating a house):

**Bug #1: 买了不兼容的工具 (Incompatible Tool)**

你买了一个电钻 (tailwindcss-animate), 但你家的电压是 220V (Tailwind v4), 而电钻是 110V 的 (Tailwind v3)。插上去没有火花，也没有报错，但就是不转。It just... doesn't work. Silently.

**Bug #2: 动画只说了开始，没说结束 (Animation Missing End State)**

就像跟朋友说："从这里开始走..."，但没告诉他走到哪里停。

```
"从 opacity: 0 开始..." → 然后呢？
```

CSS animation 需要 `from` (从哪开始) 和 `to` (到哪结束)。只有 `from` 的话，元素可能永远卡在 invisible 的状态。

**Bug #3: React Hooks 的规则 (React's Counting Game)**

React 内部在数你用了多少个 hook。Every render, it counts:

```
Render 1: useState, useEffect, useMemo, useMemo → 4 hooks ✓
Render 2: useState, useEffect, [early return] → 2 hooks ✗ CRASH!
```

React 说: "等等，上次是 4 个，这次只有 2 个？出问题了！"

这就是为什么 **所有 hooks 必须在 early return 之前**。不管条件是什么，hooks 必须每次都跑。

**Bug #4: 对话框被困住了 (Dialog Trapped in a Box)**

想象你在一个玻璃盒子里 (parent div with overflow:auto)。你说 "我要飞到天花板！" (position: fixed, z-index: 50)。但玻璃盒子说："不行，你只能在我这个范围内飞。"

Portal 就像是一个传送门 - 直接把 dialog 传送到 `<body>` 标签里，完全逃出了玻璃盒子。

---

### Concepts to Google/Learn

| Concept | 中文 | What to Search |
|---------|------|----------------|
| React Rules of Hooks | React Hooks 规则 | "React hooks rules why same order" |
| CSS Stacking Context | CSS 层叠上下文 | "CSS stacking context overflow z-index" |
| React Portal | React 传送门 | "React createPortal modal example" |
| CSS Keyframes | CSS 关键帧动画 | "CSS keyframes from to animation" |
| animation-fill-mode | 动画填充模式 | "CSS animation-fill-mode forwards" |

---

### The Mental Model

```
添加功能时，想象你在玩积木：

1. 检查积木兼容性 (版本匹配吗？v3 vs v4?)
2. 动画要有头有尾 (from → to)
3. React hooks 是"必修课"，不能翘课 (每次渲染都要跑)
4. Modal/Dialog 要用 Portal 逃离父容器
```

---

### Why This Was Scary (And Why It's Actually Normal)

这种 "连锁 bug" 很常见。一个改动暴露了多个潜在问题：

- Plugin 一直是坏的，只是之前没用到
- Dialog 一直没用 Portal，只是之前 overflow 没挡住
- Component 的 hooks 顺序一直很脆弱，只是之前没触发条件

**好消息**: 现在这些都修好了，代码比之前更 robust 了！
