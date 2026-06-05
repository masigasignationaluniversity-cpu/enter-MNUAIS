# Enhanced Video Tutorial Plan

## Goal
Completely rewrite `VideoTutorialModal.tsx` to include per-module:
- Animated flowchart (nodes enter one-by-one with CSS keyframes)
- SVG UI illustration ("picture of that feature")
- Warning box
- Do's & Don'ts two-column panel

## Architecture: 2-File Split

### `src/pages/shared/VideoTutorialData.ts` (NEW)
Pure data — no React. Exports `TUTORIAL_DATA: Record<Role, TModule[]>`.

```ts
type IlluType = 'dashboard' | 'table' | 'form' | 'grades' | 'timetable'
             | 'consents' | 'plan' | 'evaluation' | 'banner' | 'profile';
type NodeType = 'start' | 'step' | 'decision' | 'success' | 'reject';
interface FNode { l: string; t: NodeType; }
interface TModule {
  title: string;    // module name
  sub: string;      // subtitle
  accent: string;   // hex color
  illu: IlluType;   // illustration type
  steps: string[];  // 3-4 steps
  flow: FNode[];    // 4-6 flowchart nodes
  warn?: string;    // optional warning
  dos: string[];    // 3 do's
  donts: string[];  // 3 don'ts
}
```

Contains all 49 modules across 5 roles:
- Admin: 10 modules
- OCS: 15 modules
- Faculty: 8 modules
- Student: 12 modules
- DeptHead: 4 modules

### `src/pages/shared/VideoTutorialModal.tsx` (FULL REWRITE)
All React display logic. Imports data from `VideoTutorialData.ts`.

## 3-Frame Structure Per Module

Each module expands into 3 sequential frames:
1. **Overview** (6s): SVG illustration top + steps list below
2. **Flowchart** (8s): Animated nodes (staggered CSS `fadeSlideIn` with `animation-delay: i*0.35s`)
3. **Tips** (6s): Warning box (if any) + Do's (green) / Don'ts (red) two columns

Frame title bar shows: `Module X/N · Frame name (1/3 2/3 3/3)`

## Animated Flowchart Design
```tsx
// Each node appears with: opacity 0→1, translateY 12px→0
// Delay = nodeIndex × 350ms
// Arrow between nodes: scaleY 0→1 with matching delay
// Component re-animates on key={`${modIdx}-1`} change
```
Node shapes by type:
- `start`: pill shape, accent color
- `step`: rounded rect, dark bg + accent border
- `decision`: diamond/rotated square, amber bg
- `success`: rounded rect, green border
- `reject`: rounded rect, red border

## SVG Illustrations (10 types)
All use `viewBox="0 0 340 130"` with maroon sidebar (52px) + content area:
- `dashboard`: 4 stat cards in 2×2 grid
- `table`: header row + 3 data rows
- `form`: labeled input fields + submit button
- `grades`: grade grid (rows=students, cols=columns)
- `timetable`: weekly grid (Mon-Sat × time slots)
- `consents`: vertical list with status badges
- `plan`: course plan rows by year/semester
- `evaluation`: question rows with star rating
- `banner`: banner request form (header bar + fields)
- `profile`: user card with name/info fields

## Layout at 820×580 Modal
```
+------+------------------------------------------+
|      | [MacOS dots] [Video Tutorial — Role Name] [X] |
| 200px|------------------------------------------+
| Side-|  [frame tab: OVERVIEW / FLOWCHART / TIPS] |
| bar  |  content area (scrollable, 380px height)  |
| (mod |                                           |
| list)|------------------------------------------+
|      | [progress bar full-width]                 |
|      | [◀] [▶] [⏮] [⏭]  Module X/N · Frame Y/3  |
+------+------------------------------------------+
```

Frame tab buttons at top of content area let user jump frames; auto-play advances automatically.

## Files Modified
1. **NEW** `src/pages/shared/VideoTutorialData.ts` — all data
2. **REWRITE** `src/pages/shared/VideoTutorialModal.tsx` — display components

No dashboard files need changes (they already import VideoTutorialModal).

## Verification
- Open any dashboard → click "Video Tutorial"
- Confirm: illustrations appear for each module (overview frame)
- Confirm: flowchart nodes animate in sequence on flowchart frame
- Confirm: Warning + Do's/Don'ts appear on tips frame
- Confirm: auto-play advances frames → modules
- Confirm: sidebar module click jumps directly to module overview
