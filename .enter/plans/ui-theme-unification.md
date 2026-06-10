# UI Theme Unification & Dynamic Animations

## Context
All portals already share `PortalLayout` (sidebar + header) and use `.portal-panel` / `.portal-panel-header`. The ask is to make every interactive element — tabs, select dropdowns, buttons, panels — feel consistently themed and alive with smooth animations, hover effects, and transitions.

## Files to Modify

1. `tailwind.config.ts` — add new keyframes: `panel-in`, `tab-in`
2. `src/index.css` — enhance portal-panel hover, add animation utilities, improve button/select/tab theming
3. `src/components/ui/tabs.tsx` — restyle to match portal gradient theme
4. `src/components/ui/select.tsx` — polish trigger and dropdown
5. `src/components/ui/button.tsx` — add hover shadow + active scale, new `portal` variant

---

## Implementation

### 1. `tailwind.config.ts`
Add keyframes + animations:
```ts
'panel-in': {
  from: { opacity: '0', transform: 'translateY(6px) scale(0.99)' },
  to:   { opacity: '1', transform: 'translateY(0) scale(1)' }
},
'tab-indicator': {
  from: { opacity: '0', transform: 'scaleX(0.7)' },
  to:   { opacity: '1', transform: 'scaleX(1)' }
},
// animations:
'panel-in': 'panel-in 0.22s ease-out',
'tab-indicator': 'tab-indicator 0.18s ease-out',
```

### 2. `src/index.css`

**`portal-panel`** — add entry animation + hover lift:
```css
.portal-panel {
  @apply rounded-xl overflow-hidden border border-border/70 shadow-sm;
  animation: panel-in 0.22s ease-out;
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}
.portal-panel:hover {
  @apply shadow-md border-border;
}
```

**`portal-panel-header`** — subtle shimmer/brightness on hover:
```css
.portal-panel-header {
  /* existing styles kept, add: */
  transition: filter 0.2s ease;
}
.portal-panel-header:hover {
  filter: brightness(1.05);
}
```

**Add `.animate-panel-in`** utility class alias.

**Add portal select/input focus ring** — make focus rings use primary color:
```css
.portal-input-focus {
  @apply focus:ring-2 focus:ring-primary/40 focus:border-primary/60;
}
```

**Add scroll animation for long lists** (stagger children via CSS nth-child).

### 3. `src/components/ui/tabs.tsx`

**`TabsList`**: gradient bg using `--gradient-header` at low opacity, pill-shaped, border:
```tsx
"inline-flex h-10 items-center justify-center rounded-xl border border-border/60 bg-muted/60 p-1 text-muted-foreground backdrop-blur-sm gap-0.5 shadow-sm"
```

**`TabsTrigger`**: active state uses primary bg with white text + shadow, smooth transition:
```tsx
"inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:scale-[1.01]
hover:bg-muted hover:text-foreground"
```

### 4. `src/components/ui/select.tsx`

**`SelectTrigger`**: add focus ring with primary color + transition:
```tsx
"... focus:ring-primary/40 focus:border-primary/50 transition-all duration-150 hover:border-primary/40"
```

**`SelectContent`**: enhanced shadow + border + entry animation:
```tsx
"... shadow-lg border-border/80 animate-in fade-in-0 zoom-in-95"
```

**`SelectItem`**: better hover with primary tint:
```tsx
"... focus:bg-primary/10 focus:text-primary cursor-pointer transition-colors duration-100"
```

### 5. `src/components/ui/button.tsx`

**All variants**: add `transition-all duration-150 active:scale-[0.97]` to base class.

**`default` variant**: add hover shadow:
```tsx
default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md"
```

**Add `portal` variant**: gradient button matching portal header:
```tsx
portal: "text-white shadow-sm hover:shadow-md hover:brightness-110"
// with background via CSS: style={{ background: 'var(--gradient-header)' }}
// Actually: use bg-gradient approach:
portal: "bg-primary text-primary-foreground shadow-sm hover:shadow-md"
```

**`outline` variant**: add hover primary tint:
```tsx
outline: "border border-input bg-background hover:bg-primary/5 hover:border-primary/40 hover:text-foreground"
```

**`ghost` variant**: add smooth hover:
```tsx
ghost: "hover:bg-accent hover:text-accent-foreground transition-colors"
```

---

## What Stays the Same
- Sidebar navigation (already themed)
- Portal header gradient (already perfect)
- `portal-panel-header` gradient (already perfect)
- Color scheme / design tokens (already defined)
- Status badges (already themed)

## Verification
- Open any portal page → panels should fade in on load
- Hover over a panel → subtle lift + shadow increase
- Click any tab → active tab turns primary color (maroon) with smooth transition
- Click any Select → dropdown has clean shadow + entry animation
- Hover any primary button → slight shadow glow
- Click a button → scale-down micro-animation on press
