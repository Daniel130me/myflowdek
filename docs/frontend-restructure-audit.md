# Flowdek Frontend Restructure Audit & Architecture Baseline

## 1. Current Architecture Overview
Flowdek is currently a single-page, state-controlled Next.js prototype. Main application orchestration resides in `src/app/page.tsx`, which relies on `activeView` string state inside `useFlowDeck.ts` store.

- **Routing:** Controlled via `activeView` React state (e.g. `'dashboard'`, `'tasks'`, `'board'`, `'projects'`, etc.) rather than Next.js App Router URLs.
- **State Management:** Single monolithic Zustand-like / custom hook store (`useFlowDeck.ts`) combining domain data (projects, tasks, files, goals, automations, etc.), UI state (modals open, active views, search filters), LocalStorage persistence, and view calculations.
- **Data Access:** Mock fixtures (`INITIAL_PROJECTS`, `TEAM`, etc.) imported directly into state with `localStorage` fallback under `flowdeck-state-v1`.
- **Modals & Drawers:** Boolean flags (`showNewTask`, `selectedTaskId`, `shareOpen`, `fileViewerFileId`) rendering overlay components conditionally without URL representation.

---

## 2. Existing Screens & Navigation Destinations
| Target Screen / View | Current State Identifier | Intended Next.js Route |
| :--- | :--- | :--- |
| Login Page | `!auth.isAuthenticated` | `/login` |
| Onboarding Flow | `!auth.isOnboarded` | `/onboarding` |
| Projects / Portfolio | `activeView === 'projects'` | `/projects` |
| My Tasks | `activeView === 'mytasks'` | `/my-tasks` |
| Inbox | `activeView === 'inbox'` | `/inbox` |
| Goals | `activeView === 'goals'` | `/goals` |
| Automations | `activeView === 'automations'` | `/automations` |
| Forms | `activeView === 'forms'` | `/forms` |
| Approvals | `activeView === 'approvals'` | `/approvals` |
| Budgets | `activeView === 'budget'` | `/budgets` |
| Timesheets | `activeView === 'timesheets'` | `/timesheets` |
| AI Assistant | `activeView === 'ai'` | `/ai` |
| Project Overview / Dashboard | `activeView === 'dashboard'` | `/projects/[projectId]/overview` |
| Project Task List | `activeView === 'tasks'` | `/projects/[projectId]/tasks` |
| Project Kanban Board | `activeView === 'board'` | `/projects/[projectId]/board` |
| Project Timeline | `activeView === 'timeline'` | `/projects/[projectId]/timeline` |
| Project Sheet / Grid | `activeView === 'sheet'` | `/projects/[projectId]/sheet` |
| Project Calendar | `activeView === 'calendar'` | `/projects/[projectId]/calendar` |
| Project RAID Log | `activeView === 'raid'` | `/projects/[projectId]/raid` |
| Project Files | `activeView === 'files'` | `/projects/[projectId]/files` |
| Project Team | `activeView === 'team'` | `/projects/[projectId]/team` |
| Project Reports | `activeView === 'reports'` | `/projects/[projectId]/reports` |
| Project Dependencies | `activeView === 'dependencies'` | `/projects/[projectId]/dependencies` |

---

## 3. Modal & Drawer Overlay Inventory
| Overlay | Trigger / Current State | Target URL / Intercepting Route |
| :--- | :--- | :--- |
| New Project Modal | `showNewProject === true` | `/projects/new` |
| New Task Modal | `showNewTask === true` | `/projects/[projectId]/tasks/new` |
| Task Details Drawer | `selectedTaskId !== null` | `/projects/[projectId]/tasks/[taskId]` |
| Duplicate Task Dialog | `duplicateDialogTaskId !== null` | `/projects/[projectId]/tasks/[taskId]/duplicate` |
| File Viewer Modal | `viewingFile !== null` | `/projects/[projectId]/files/[fileId]` |
| Share Project Modal | `shareOpen === true` | `/projects/[projectId]/share` |
| Custom Fields Modal | `customFieldsOpen === true` | `/projects/[projectId]/settings/custom-fields` |
| Keyboard Shortcuts Modal | `shortcutsOpen === true` | `/shortcuts` |
| Command Palette | `commandPaletteOpen === true` | `/command` |

---

## 4. Data Ownership & Storage Inventory
- **LocalStorage Key:** `flowdeck-state-v1`
- **Stored Data Domains:** Projects, Tasks, Files, RAID items, Goals, Automations, Forms, Approvals, Budgets, Timesheets, Submissions, Expenses, Tags, Time logs, Custom columns.
- **Migration & Compatibility Requirement:** Must validate LocalStorage schema, support legacy state key `flowdeck-state-v1`, and prevent data loss on refresh/migration.

---

## 5. Large Components Technical Debt Inventory
- `src/app/page.tsx`: 214 lines orchestrating layout, all views, modals, shortcuts, and auth state.
- `src/features/flowdeck/store/useFlowDeck.ts`: Over 500 lines holding all application state, LocalStorage sync, task filters, undo/redo stack, and entity mutators.
- View components (`TaskListView.tsx`, `BoardView.tsx`, `SheetView.tsx`, `FormsView.tsx`, etc.): Coupling UI presentation directly with monolithic store mutation functions and inline layout styles.

---

## 6. Proposed Directory Structure
```text
src/
  app/
    (auth)/
      login/page.tsx
      onboarding/page.tsx
    (product)/
      layout.tsx
      loading.tsx
      error.tsx
      not-found.tsx
      page.tsx                      # Redirects to /projects or /login
      projects/
        page.tsx                    # PortfolioView (/projects)
        new/page.tsx                # New project modal/page
        [projectId]/
          layout.tsx                # Project workspace shell
          overview/page.tsx
          tasks/
            page.tsx
            new/page.tsx
            [taskId]/
              page.tsx
              duplicate/page.tsx
          board/page.tsx
          timeline/page.tsx
          sheet/page.tsx
          calendar/page.tsx
          raid/page.tsx
          files/
            page.tsx
            [fileId]/page.tsx
          team/page.tsx
          reports/page.tsx
          dependencies/page.tsx
          share/page.tsx
          settings/
            custom-fields/page.tsx
      my-tasks/page.tsx
      inbox/page.tsx
      goals/page.tsx
      automations/page.tsx
      forms/page.tsx
      approvals/page.tsx
      budgets/page.tsx
      timesheets/page.tsx
      ai/page.tsx
      shortcuts/page.tsx
      command/page.tsx
  features/
    auth/
    projects/
    tasks/
    files/
    goals/
    automations/
    forms/
    approvals/
    budgets/
    timesheets/
    raid/
    reports/
    ai/
  shared/
    navigation/routes.ts
    components/
      layout/
      ui/
    hooks/
    types/
  data/
    contracts/
    mock/
    local-storage/
    mappers/
```

---

## 7. Migration Risks & Mitigation Strategy
1. **Broken Deep Links or Overlays:** Solved by typed route builders (`src/shared/navigation/routes.ts`) and fallback rendering when accessed directly.
2. **LocalStorage Data Loss:** Maintained through a safe data adapter and migration helper (`src/data/local-storage/storageAdapter.ts`) reading `flowdeck-state-v1`.
3. **Layout Flicker during Server/Client Auth:** Solved by App Router client layout shell and auth provider wrapping top-level product routes.

---

## 8. Implementation Phases Plan
- **Phase 1: Audit and Routing Foundation** — Route registry, App Router tree for global and project routes, route-based product layout shell, top bar & sidebarpathname integration.
- **Phase 2: Project & Sub-domain Route Pages** — Render individual feature views based on Next.js params and pathnames with loading/error/not-found boundaries.
- **Phase 3: URL-Addressable Overlays** — Route-driven drawers/modals for Tasks, Files, New Project, Share, Custom Fields, Shortcuts, and Command Palette.
- **Phase 4: Data & State Boundaries** — Decouple `useFlowDeck` into focused store/repository interfaces, mock data contracts, and safe LocalStorage persistence.
- **Phase 5: Domain & Component Restructuring** — Refactor large components, typed domain values (TaskStatus, TaskPriority, etc.), and clean create/update DTOs.
- **Phase 6: Quality, Performance & Verification** — Unit tests for route builders and stores, lint/typecheck verification, and performance checks.
- **Phase 7: Final Documentation & Walkthrough** — Complete technical documentation and final walkthrough compliance report.
