'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { FONT_FAMILY as FF, COLORS, type TaskPriority } from '@/features/flowdeck/model';
import { useViewport } from '@/features/flowdeck/hooks/useViewport';
import { useWorkspaces } from '@/features/flowdeck/hooks/useWorkspaces';
import { useKeyboardShortcuts } from '@/features/flowdeck/hooks/useKeyboardShortcuts';
import { ThemeProvider, useTheme } from '@/features/flowdeck/hooks/useTheme';
import { FlowdekDataProvider } from '@/providers/FlowdekDataProvider';
import { WorkspaceProvider } from '@/providers/WorkspaceProvider';
import { MemberDirectoryProvider, useProjectMembers } from '@/features/flowdeck/components/ui';
import { useAuth } from '@/features/flowdeck/components/auth';
import {
  Sidebar, MobileSidebar, TopBar, MobileSearchRow, BottomNav, MoreMenu,
} from '@/features/flowdeck/components/layout';
import { BulkActionBar } from '@/features/flowdeck/components/ui';
import { NewTaskModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes, getRouteForView, getViewFromPathname, replaceProjectInPath } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';
import type { TopBarHandle } from '@/features/flowdeck/components/layout/TopBar';
import { Toaster } from '@/components/ui/sonner';
import { ProductShellSkeleton } from '@/components/ui/skeleton';

export default function ProductLayout({ children, modal }: { children: React.ReactNode; modal?: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.ready) {
      if (!auth.isAuthenticated) {
        router.replace(routes.login());
      } else if (!auth.isOnboarded) {
        router.replace(routes.onboarding());
      }
    }
  }, [auth.ready, auth.isAuthenticated, auth.isOnboarded, router]);

  if (!auth.ready || !auth.isAuthenticated || !auth.isOnboarded) {
    return <ProductShellSkeleton fontFamily={FF} />;
  }

  return (
    <ThemeProvider>
      <FlowdekDataProvider>
        <MemberDirectoryProvider>
          <WorkspaceProvider>
            <ProductShellInner onLogout={auth.logout} modal={modal}>
              {children}
            </ProductShellInner>
            <Toaster />
          </WorkspaceProvider>
        </MemberDirectoryProvider>
      </FlowdekDataProvider>
    </ThemeProvider>
  );
}

function ProductShellInner({ children, modal, onLogout }: { children: React.ReactNode; modal?: React.ReactNode; onLogout: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();

  const theme = useTheme();
  const { isMobile } = useViewport();
  const wsHook = useWorkspaces();

  const topBarRef = useRef<TopBarHandle>(null);

  const state = useFlowDeck();
  const {
    project, tasks, gridActions,
    searchQuery, projectMenuOpen, sidebarOpen, moreMenuOpen,
    projects, searchFilters, setSearchFilters, activeFilterCount, clearFilters,
  } = state;

  // Extract route parameters & current view without fallbacks
  const routeProjectId = getSingleParam(params?.projectId);
  const activeView = getViewFromPathname(pathname);
  const isTalentRoute = pathname.startsWith('/talent');

  // Fetch real project members for the current route so the BulkActionBar
  // assign popover + the TopBar avatar stack + assignee selectors all see
  // real member data. The result is also registered into the global
  // MemberDirectory via the hook.
  const { members: routeProjectMembers } = useProjectMembers(routeProjectId);

  // Keyboard shortcut listeners
  useKeyboardShortcuts({
    activeView,
    searchQuery,
    selectedIds: state.selectedIds,
    onToggleComplete: (id) => routeProjectId && state.toggleComplete(routeProjectId, id),
    onIndent: () => routeProjectId && gridActions.onIndent(routeProjectId),
    onOutdent: () => routeProjectId && gridActions.onOutdent(routeProjectId),
    onDelete: () => routeProjectId && gridActions.onDeleteSelected(routeProjectId),
    onShowNewTask: () => {
      if (routeProjectId) state.setShowNewTask(true);
    },
    onSearchFocus: () => topBarRef.current?.focusSearch(),
    onShowShortcuts: () => router.push(routes.shortcuts()),
    onOpenCommandPalette: () => router.push(routes.command()),
    onDuplicate: () => {
      if (state.selectedIds.size === 1) {
        const singleId = [...state.selectedIds][0];
        if (routeProjectId) {
          router.push(routes.taskDuplicate(routeProjectId, singleId));
        }
      }
    },
  });

  // Navigation handlers
  const handleNavigate = (viewId: string) => {
    if (viewId.startsWith('_fav_')) {
      const targetProjId = viewId.replace('_fav_', '');
      state.openProject(targetProjId);
      router.push(routes.projectOverview(targetProjId));
      return;
    }
    const targetRoute = getRouteForView(viewId, routeProjectId || undefined);
    router.push(targetRoute);
  };

  const handleOpenProject = (projId: string) => {
    state.openProject(projId);
    state.setProjectMenuOpen(false);
    router.push(replaceProjectInPath(pathname, projId));
  };

  // Reserve the nav height plus the iOS home-indicator inset so content is
  // never overlapped (audit H-27).
  const bottomNavHeight = isMobile ? 'calc(64px + env(safe-area-inset-bottom, 0px))' : 0;
  const topbarHeight = isMobile ? 52 : theme.layout.topbar.height;

  function mobileNavTo(id: string) {
    if (id === '_more') {
      state.setMoreMenuOpen(o => !o);
      return;
    }
    const targetRoute = getRouteForView(id, routeProjectId || undefined);
    router.push(targetRoute);
    state.setMoreMenuOpen(false);
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: theme.layout.content.bg, fontFamily: FF, color: theme.colors.ink, overflow: 'hidden' }}>
      {/* Skip link: first focusable element, lets keyboard users bypass the
          whole nav chrome on every page (audit H-29). */}
      <a
        href="#main-content"
        style={{
          position: 'fixed', top: -48, left: 12, zIndex: 10000,
          background: COLORS.ink, color: '#FFFFFF', padding: '10px 16px',
          borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: FF,
          textDecoration: 'none', transition: 'top 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.top = '12px'; }}
        onBlur={e => { e.currentTarget.style.top = '-48px'; }}
      >
        Skip to content
      </a>
      {!isMobile && (
        <Sidebar
          project={project}
          projects={projects}
          activeView={activeView}
          onNavigate={handleNavigate}
          goToPortfolio={() => router.push(routes.projects())}
          pendingMyTasks={tasks.filter(t => t.assignee === state.currentUserId && t.status !== 'done').length}
          onToggleFavorite={state.toggleProjectFavorite}
          onArchive={state.archiveProject}
          onLogout={onLogout}
          workspaces={wsHook.workspaces}
          selectedWorkspace={wsHook.selectedWorkspace}
          onSelectWorkspace={wsHook.setSelectedWorkspace}
        />
      )}

      {isMobile && (
        <MobileSidebar
          open={sidebarOpen}
          onClose={() => state.setSidebarOpen(false)}
          project={project}
          activeView={activeView}
          onNavigate={id => {
            state.setSidebarOpen(false);
            handleNavigate(id);
          }}
          goToPortfolio={() => {
            state.setSidebarOpen(false);
            router.push(routes.projects());
          }}
          bottomNavHeight={bottomNavHeight}
          workspaces={wsHook.workspaces}
          selectedWorkspace={wsHook.selectedWorkspace}
          onSelectWorkspace={wsHook.setSelectedWorkspace}
          onLogout={onLogout}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <TopBar
          ref={topBarRef}
          isMobile={isMobile}
          project={project}
          projects={projects}
          activeView={activeView}
          searchQuery={searchQuery}
          projectMenuOpen={projectMenuOpen}
          topbarHeight={topbarHeight}
          searchFilters={searchFilters}
          activeFilterCount={activeFilterCount}
          tags={state.tags}
          onToggleSidebar={() => state.setSidebarOpen(o => !o)}
          onToggleProjectMenu={() => state.setProjectMenuOpen(o => !o)}
          onOpenProject={handleOpenProject}
          onShowNewTask={() => {
            if (routeProjectId) state.setShowNewTask(true);
          }}
          onShowNewProject={() => router.push(routes.newProject())}
          onSearchChange={state.setSearchQuery}
          onSearchFiltersChange={setSearchFilters}
          onClearFilters={clearFilters}
          onLogout={onLogout}
        />

        {isMobile && (
          <MobileSearchRow
            project={project}
            searchQuery={searchQuery}
            onChange={state.setSearchQuery}
          />
        )}

        <main
          id="main-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            padding: isTalentRoute ? 0 : isMobile ? '18px 14px 0' : '28px 32px 40px',
            paddingBottom: isTalentRoute ? 0 : isMobile ? bottomNavHeight : 40,
          }}
        >
          {children}
        </main>
        {state.showNewTask && routeProjectId && (
          <NewTaskModal
            projectStart={state.projects[routeProjectId]?.start || ''}
            tasks={state.tasksByProject[routeProjectId] || []}
            tags={state.tagsByProject[routeProjectId] || []}
            members={routeProjectMembers}
            onClose={() => state.setShowNewTask(false)}
            onCreate={(input) => {
              state.addTask(routeProjectId, input);
              state.setShowNewTask(false);
            }}
          />
        )}
        {modal}

        {isMobile && (
          <BottomNav activeView={activeView} onNav={mobileNavTo} />
        )}
        {isMobile && moreMenuOpen && (
          <MoreMenu onClose={() => state.setMoreMenuOpen(false)} activeView={activeView} project={project} onNavigate={mobileNavTo} />
        )}
      </div>

      {/* Global Selection Action Bar */}
      {state.selectedIds.size > 0 && routeProjectId && (
        <BulkActionBar
          count={state.selectedIds.size}
          onClearSelection={() => state.setSelectedIds(new Set())}
          onBulkAssign={(pid, memberId) => state.bulkAssign(pid, state.selectedIds, memberId)}
          onSetPriority={(pid, priority) => state.bulkSetPriority(pid, state.selectedIds, priority as TaskPriority)}
          onComplete={(pid) => state.bulkComplete(pid, state.selectedIds)}
          onDelete={(pid) => state.removeTasksBulk(pid, state.selectedIds)}
          onLink={(pid) => gridActions.onLink(pid)}
          onUnlink={(pid) => gridActions.onUnlink(pid)}
          onBold={(pid) => gridActions.onToggleBold(pid)}
          onMilestone={(pid) => gridActions.onToggleMilestone(pid)}
          onAttachFiles={(pid, files) => gridActions.onAttachFiles(pid, files)}
          onDuplicateBulk={(pid) => state.duplicateTasksBulk(pid, state.selectedIds)}
          onBulkSetDueDate={(pid, date) => state.bulkSetDueDate(pid, state.selectedIds, date)}
          onBulkAddTag={(pid, tagId) => state.bulkAddTag(pid, state.selectedIds, tagId)}
          onBulkRemoveTag={(pid, tagId) => state.bulkRemoveTag(pid, state.selectedIds, tagId)}
          onBulkSetStatus={(pid, status) => state.bulkSetStatus(pid, state.selectedIds, status)}
          onBulkMoveToProject={(pid, targetProjectId) => state.moveTasksToProjectBulk(pid, state.selectedIds, targetProjectId)}
          tags={state.tags}
          projects={projects}
          members={routeProjectMembers}
          currentProjectId={routeProjectId}
        />
      )}
    </div>
  );
}
