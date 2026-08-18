# FlowDeck — Asana Feature Parity Roadmap

---

## ✅ Phase 1 — Batches 1–4 (ALL COMPLETE)

### Batch 1 — High Priority
- [x] **#1 Comments & Activity Feed**
- [x] **#2 Tags/Labels**
- [x] **#3 Task Due Dates**
- [x] **#4 My Tasks View**
- [x] **#5 Task Completion Checkbox**

### Batch 2 — Medium Priority
- [x] **#6 Drag-reorder rows**
- [x] **#7 Quick-add rows**
- [x] **#8 File download/preview**
- [x] **#9 Timeline group modes**
- [x] **#10 Team workload**
- [x] **#11 Followers**
- [x] **#12 Time tracking**
- [x] **#13 Search/filter panel**
- [x] **#14 Timeline Gantt drag**

### Batch 3
- [x] **#15 Custom Fields in TaskDetailPanel**
- [x] **#16 File navigation in FileViewerModal**
- [x] **#17 Board WIP limits**
- [x] **#18 Dependencies View**

### Batch 4
- [x] **#19 Project Templates**
- [x] **#20 Advanced Batch Operations UI**
- [x] **#21 Custom Fields Management UI**
- [x] **#22 Gantt Critical Path**
- [x] **#23 Notifications/Inbox**
- [x] **#24 Story Points/Estimation**

---

## Phase 2 — Additional Asana Feature Parity

### Batch 5 — Core UX Polish (High Impact) — ✅ ALL COMPLETE

- [x] **#25 Command Palette (Cmd+K)** — Uses shadcn `CommandDialog` wrapping `cmdk`, keyboard shortcut `Cmd+K/Ctrl+K`, fuzzy search across tasks/projects/views/actions, undo/redo, toggle theme, navigate to any view or project, open any task
- [x] **#26 Right-Click Context Menus** — Reusable `TaskContextMenu` using shadcn `ContextMenu` (Radix), integrated into TaskListView (desktop+mobile) and BoardView, submenus for Change Status/Set Priority/Toggle Tag, Duplicate task, Delete task, keyboard shortcut hints
- [x] **#27 Toast Notifications for All Actions** — Switched from old `toaster.tsx` to `sonner` Toaster, toast calls on: task created/deleted/completed/reopened/duplicated, project created/deleted, tag created/removed
- [x] **#28 Inline Task Name Editing** — `InlineTaskName` component, double-click to edit, auto-select-all on focus, Enter to save, Escape to cancel, click-outside to save, integrated into TaskListView and BoardView
- [x] **#29 LocalStorage Persistence** — Debounced 500ms auto-save of all project/task/tag/comment/activity/file/RAID/timeLog data, hydration-safe init, `resetToDefaults()` action clears storage and reloads

### Batch 6 — Task Management Enhancements — ✅ ALL COMPLETE

- [x] **#30 Task Duplication (Clone)**
  - "Duplicate" option in TaskDetailPanel header (Copy icon) and right-click context menu
  - Deep clone via `duplicateTaskWithOptions`: name + " (copy)", same status/priority/assignee/due-date/tags/custom fields
  - Option to include: subtasks, comments, attachments (checkboxes in `DuplicateTaskDialog`)
  - Keyboard shortcut: `Cmd+D` opens duplicate dialog
  - Bulk duplicate: `duplicateTasksBulk` via BulkActionBar Copy button

- [x] **#31 Recurring Task Execution Engine**
  - Recurrence picker in TaskDetailPanel (None/Daily/Weekly/Monthly select dropdown)
  - "Set recurrence" submenu in right-click context menu with None/Daily/Weekly/Monthly options
  - When a recurring task is marked complete, auto-creates next instance via `computeNextDate()`:
    - Daily → due date +1 day, Weekly → +7 days, Monthly → +1 month
  - New task inherits: name, assignee, priority, tags, description, custom fields, story points
  - Reset: status → Backlog, progress → 0, cleared deps, no comments
  - Teal "Recurring" badge on task cards and detail panel, tooltip showing next occurrence date

- [x] **#32 Task Move to Another Project**
  - "Move to Project" (FolderInput icon) in TaskDetailPanel header → dropdown of other projects
  - "Move to project" submenu in right-click context menu
  - `moveTaskToProject` recursively moves task + descendants + associated data
  - Bulk move via BulkActionBar "Move to project" popover

- [x] **#33 Subtask Promote / Demote**
  - "Promote to top-level task" button (ArrowUpCircle) in TaskDetailPanel (desktop + mobile)
  - "Convert to subtask" button (ArrowDownCircle) in TaskDetailPanel (desktop + mobile) with parent picker
  - "Promote to top-level" / "Convert to subtask" in right-click context menu
  - Store actions: `promoteSubtask`, `demoteToSubtask` with activity logging

- [x] **#34 Bulk Due Date, Tag, Status, and Project Operations**
  - BulkActionBar has: Set due date (CalendarDays popover), Add/Remove tag (Tag popover), Set status (Play popover), Move to project (FolderInput popover)
  - Store actions: `bulkSetDueDate`, `bulkAddTag`, `bulkRemoveTag`, `bulkSetStatus`, `moveTasksToProjectBulk`

- [x] **#35 Task Sections in List View**
  - `Section` type and `sectionsByProject` in store
  - Sections render as collapsible group headers (DesktopSectionRow, MobileSectionHeader) in List View
  - Tasks grouped by sectionId, unsectioned tasks shown separately
  - "Add section" inline button at top of list
  - Inline rename sections by double-clicking
  - Section picker in TaskDetailPanel (dropdown when sections exist)
  - "Move to section" submenu in right-click context menu
  - Store actions: `addSection`, `renameSection`, `deleteSection`, `toggleSectionCollapsed`, `reorderSection`, `setTaskSection`

### Batch 7 — Project Management — ✅ ALL COMPLETE

- [x] **#36 Project Description / Brief**
  - Added `description` field to `Project` type
  - Click-to-edit textarea in Dashboard header area with placeholder text
  - Description shown on Portfolio project cards (2-line clamp) as tooltip preview
  - Persisted via localStorage

- [x] **#37 Project Members**
  - Added `members: string[]` field to `Project` type
  - Member avatar row in Dashboard with count and "Manage" button
  - People picker dropdown: toggle members on/off with checkmarks, shows name + role
  - Member avatars on Portfolio project cards with count
  - Team stat card in Dashboard shows member count instead of total TEAM size

- [x] **#38 Project Favorites**
  - Added `isFavorite: boolean` to `Project` type
  - Star toggle icon on project cards (Portfolio) and Dashboard header
  - "Favorites" section in sidebar with Star header, shows favorited projects
  - Clicking favorite in sidebar opens that project
  - Persisted via localStorage

- [x] **#39 Project Archive / Restore**
  - Added `isArchived: boolean` to `Project` type
  - Archive/Restore buttons on Portfolio project cards
  - Archive button in Dashboard header
  - Archived projects shown in collapsible "Archived" section at bottom of Portfolio
  - Sidebar shows collapsible "Archived" section with count
  - Archived project cards shown with strikethrough and reduced opacity
  - Archiving current project navigates back to Portfolio
  - Toast notifications on archive/restore

- [x] **#40 Project Status Updates**
  - Added `ProjectStatusUpdate` type with id, projectId, authorId, text, color, createdAt
  - "Status" tab in Dashboard view with Overview/Status tab bar
  - Color selector: On Track (green), At Risk (yellow), Off Track (red) buttons
  - Textarea + Post button form for new status updates
  - Status history timeline with colored dots, author avatars, timestamps, badges
  - Delete button per status update
  - Sorted newest-first
  - Persisted via localStorage

- [x] **#41 Save Current Project as Template**
  - "Save as template" button in Dashboard header
  - Modal with template name input and "Include task structure" checkbox
  - Saves to localStorage as custom template (tags, custom cols, tasks blueprint)
  - Toast confirmation on save

### Batch 8 — Collaboration & Communication — ✅ ALL COMPLETE

- [x] **#42 Rich Text / Markdown in Task Descriptions**
  - Created `MarkdownDescription` component replacing old plain `DescriptionField`
  - Markdown toolbar: Bold, Italic, Heading, Bullet list, Numbered list, Checkbox, Code, Link
  - Preview mode: renders Markdown to formatted HTML via `react-markdown`
  - Toggle between view, edit, and preview modes
  - Edit button on description in view mode
  - Monospace font in edit mode for Markdown editing
  - Stored as plain text (Markdown syntax)

- [x] **#43 Comment Reactions / Likes (Emoji)**
  - Added `Reaction` type: `{ emoji: string; userIds: string[] }`
  - Added `reactions` field to `Comment` type
  - Quick-reaction picker with 8 emojis: ❤️ 👍 🎉 🎊 👏 😮 😎 👀
  - Click to toggle your reaction on any emoji
  - Active reactions highlighted with accent border
  - Reaction count displayed as pill below comment
  - Hover tooltip shows reactor names
  - Fixed-position picker avoids scroll container clipping
  - Store action: `toggleReaction(commentId, emoji)`

- [x] **#44 Comment Editing**
  - "Edit" button (Pencil icon) on own comments
  - Inline edit mode with textarea replacing comment text
  - Save (Ctrl+Enter) and Cancel (Escape) support
  - "(edited)" label shown after edited comments
  - Store action: `editComment(commentId, newText)`

- [x] **#45 Comment Threading (Nested Replies)**
  - Added `parentId` field to `Comment` type
  - "Reply" button on each comment opens inline reply input
  - Replies indented under parent comment (38px margin-left)
  - Reply placeholder identifies parent comment author
  - Collapse/expand thread with "X replies" toggle
  - Max nesting: 1 level (replies to top-level only)
  - Reply input supports @mention autocomplete
  - `addComment` now accepts optional `parentId` parameter
  - Deleting a parent also deletes its replies

- [x] **#46 @Mention in Task Descriptions**
  - @mention autocomplete in Markdown description editor
  - Type @ to trigger team member search dropdown
  - Arrow keys to navigate, Tab/Enter to select
  - Mention autocomplete in both edit mode textarea
  - @mentioned names highlighted with colored background in preview
  - Matches against first name for convenient @ shortcuts

### Batch 9 — Views & Navigation

- [ ] **#47 Goals / OKRs View**
  - Add types: `Goal { id, title, description, status, progress, startDate, endDate, parentId }`, `KeyResult { id, goalId, title, targetValue, currentValue, unit }`
  - New sidebar item: "Goals"
  - `GoalsView`: hierarchical tree (Goal → Key Results → linked Projects)
  - Progress bars on goals (weighted average of key results)
  - Add/edit/delete goals and key results
  - Status: On Track / At Risk / Off Track / Not Started

- [ ] **#48 Enhanced Portfolio View (True Portfolios)**
  - Replace simple project card grid with a table/list of projects with custom columns
  - Columns: Project Name, Status (progress bar), Owner, Due Date, Custom Fields
  - Portfolio-level progress rollup (average of project completion %)
  - Sort and filter portfolio items
  - Click project to navigate into it

- [ ] **#49 Saved Search Filters**
  - Add `SavedFilter` type: `{ id, name, filters: SearchFilters, createdAt }`
  - "Save current filter" button in SearchFilterPanel
  - Saved filters dropdown in the search bar
  - "Manage saved filters" → rename, delete
  - Pinned/favorite saved filters in sidebar

- [ ] **#50 Calendar Week/Day View + Drag-to-Reschedule**
  - Add view modes to Calendar: Month (existing), Week, Day
  - Week view: 7-column layout with hourly rows, tasks as positioned blocks
  - Day view: single column with hourly rows
  - Drag task pills to a different date to reschedule (updates `dueDate`)
  - Drag task edges to change duration (multi-day tasks)

- [ ] **#51 Board Swimlanes**
  - Add swimlane grouping to Board view
  - Group by: Assignee, Priority, Tag, Custom Field, None (default)
  - Each swimlane is a horizontal row of columns
  - Drag cards between columns within and across swimlanes
  - Collapsible swimlanes
  - Toggle swimlane mode on/off in Board toolbar

- [ ] **#52 List View Enhancements (Sort, Group, Column Resize)**
  - Column header click to sort ascending/descending/none
  - Group by any field (status, assignee, priority, tag, due date range)
  - Column resize by dragging header borders
  - Horizontal scroll when columns exceed viewport width
  - Sticky header row on vertical scroll
  - Persist column order/width/sort preferences

### Batch 10 — Timeline & Gantt Enhancements

- [ ] **#53 Milestone Diamonds on Timeline**
  - Render `task.milestone === true` as a diamond shape instead of a bar
  - Diamond positioned at the milestone due date
  - Click diamond to open task detail
  - Visual distinction: filled diamond for completed, outline for pending

- [ ] **#54 Today Line on Timeline**
  - Vertical red/blue dashed line at the current date
  - Label "Today" at the top of the line
  - Auto-scroll to keep today visible on initial load
  - Toggle show/hide today line

- [ ] **#55 Timeline Zoom to Fit**
  - "Zoom to fit" button in Timeline toolbar
  4. Auto-calculates zoom level and scroll position to show all tasks
  - Accounts for task dependencies (include padding)

- [ ] **#56 Timeline Task Tooltips**
  - Hover over Gantt bar shows rich tooltip:
    - Task name, assignee avatar + name, dates (start → end), duration
    - Progress bar, priority badge, dependency count
    - Tags as colored pills
  - Tooltip follows cursor, positioned to avoid clipping

- [ ] **#57 Drag-to-Create Task on Timeline**
  - Click and drag on empty timeline space to create a new task
  - Horizontal drag sets start date and duration
  - Opens NewTask modal with pre-filled dates after drag release
  - Visual feedback: ghost bar during drag

- [ ] **#58 Dependency Arrows with Arrowheads**
  - Enhance existing dependency lines with arrowheads showing direction
  - Arrow points from blocking task → blocked task
  - Color: gray for normal, red for critical path dependencies
  - Curved/orthogonal routing to avoid overlapping bars

### Batch 11 — Automation & Advanced Features

- [ ] **#59 Rules / Automation Engine**
  - Add `Rule` type: `{ id, name, enabled, trigger: { type, conditions }, actions: { type, params }[] }`
  - Triggers: Status changes to X, Task assigned to Y, Due date is today/overdue, Task created, Task completed
  - Actions: Set status, Assign to, Add tag, Remove tag, Set priority, Set due date, Move to project, Add comment, Notify
  - Rules management modal: create, edit, delete, toggle enable/disable, reorder
  - Rules run client-side on state changes
  - Built-in rule templates ("When completed, notify followers", "When overdue, add Urgent tag")

- [ ] **#60 Additional Custom Field Types**
  - Add to `CustomColumn` type support:
    - `checkbox` (boolean toggle)
    - `currency` (number with $ prefix and 2 decimal formatting)
    - `progress` (0–100 slider with visual bar)
    - `multiSelect` (select multiple options from a list)
    - `people` (assign team member picker)
  - Update CustomFieldsModal, TaskDetailPanel, and all views to render these types

- [ ] **#61 Dependency Lag Time / Lead Time**
  - Extend `Task.deps` from `string[]` to `Dependency[]`: `{ taskId, type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish', lagDays: number }`
  - Lag days: positive = wait after, negative = start before
  - Show lag on dependency arrows (label on the line)
  - Recalculate timeline positions based on lag

### Batch 12 — Reporting & Analytics

- [ ] **#62 Burndown / Burnup Charts**
  - Add to ReportsView: Burndown chart (ideal line vs actual completed line)
  - Time axis: days/weeks, Y axis: total tasks / remaining tasks
  - Burnup variant: ideal line vs actual scope + completed
  - Filter by: project, status, assignee, date range
  - Data generated from task completion timestamps (add `completedAt` field to Task)

- [ ] **#63 Sprint Concept with Velocity Tracking**
  - Add `Sprint` type: `{ id, name, projectId, startDate, endDate, goal }`
  - Sprint picker in sidebar (for projects that use sprints)
  - Assign tasks to sprints
  - Sprint board view (filtered to sprint tasks)
  - Sprint burndown chart
  - Sprint velocity: story points completed per sprint
  - Sprint retrospective notes (optional)

- [ ] **#64 Configurable Dashboard Widgets**
  - Replace hardcoded Dashboard with widget-based layout
  - Widget library: Task Summary, My Tasks, Overdue Tasks, Team Workload, Recent Activity, Upcoming Deadlines, Project Progress, Custom Chart
  - Drag widgets to rearrange
  - Add/remove widgets from a widget picker
  - Widget size options (small, medium, large)
  - Each widget has a header with title and collapse/expand

- [ ] **#65 Cycle Time & Lead Time Metrics**
  - Add `statusHistory: { status, timestamp }[]` to Task type (or separate tracking)
  - Compute: cycle time (In Progress → Done), lead time (Created → Done)
  - Average cycle time chart in Reports
  - Per-assignee cycle time breakdown
  - Trend line over time

- [ ] **#66 Cross-Project Reports**
  - Reports view can aggregate data across all projects
  - Toggle: "Current Project" vs "All Projects"
  - Cross-project charts: total tasks by project, completion rate by project, workload distribution
  - Export cross-project data

### Batch 13 — Data & Export

- [ ] **#67 PDF Export**
  - "Export to PDF" button in toolbar
  - Formatted PDF with project name, task list table, status summary
  - Options: include/exclude columns, date range filter
  - Use browser `window.print()` with print-specific CSS or a PDF library

- [ ] **#68 JSON Export / Import with Field Mapping**
  - "Export as JSON" option alongside existing CSV export
  - Import JSON with field mapping UI (drag source fields to target fields)
  - Import CSV with improved field mapping (current is hardcoded)
  - Support for Asana JSON export format
  - Import preview: show first 5 rows before confirming

### Batch 14 — Mobile Enhancements

- [ ] **#69 Swipe Actions on Mobile Task Rows**
  - Swipe right on task row: reveal Complete (green) action
  - Swipe left: reveal Delete (red) action
  - Haptic-style visual feedback (color flash)
  - Configurable swipe actions in settings

- [ ] **#70 Mobile Long-Press Context Menu**
  - Long-press on task row opens a bottom sheet with actions
  - Same actions as right-click context menu: Edit, Duplicate, Delete, Change Status, etc.
  - Visual feedback on long-press (slight scale + overlay)

---

## Summary

| Phase | Batches | Items | Status |
|-------|---------|-------|--------|
| Phase 1 | 1–4 | #1–#24 | ✅ All Complete |
| Phase 2 | 5–14 | #25–#70 | 🔄 Batches 5–8 done / rest pending |
| **Total** | **14** | **70** | **46 done / 24 remaining** |

## Priority Legend

- **Batch 5** — Core UX polish (highest ROI, shadcn components already exist)
- **Batch 6** — Task management gaps that Asana users expect
- **Batch 7** — Project management completeness
- **Batch 8** — Collaboration richness
- **Batch 9** — New views and navigation
- **Batch 10** — Timeline/Gantt power features
- **Batch 11** — Automation and advanced custom fields
- **Batch 12** — Reporting and analytics depth
- **Batch 13** — Data portability
- **Batch 14** — Mobile-specific UX
