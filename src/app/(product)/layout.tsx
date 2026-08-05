'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { FONT_FAMILY as FF } from '@/features/flowdeck/model';
import { useViewport } from '@/features/flowdeck/hooks/useViewport';
import { useKeyboardShortcuts } from '@/features/flowdeck/hooks/useKeyboardShortcuts';
import { ThemeProvider, useTheme } from '@/features/flowdeck/hooks/useTheme';
import { useAuth } from '@/features/flowdeck/components/auth';
import {
  Sidebar, MobileSidebar, TopBar, MobileSearchRow, BottomNav, MoreMenu,
} from '@/features/flowdeck/components/layout';
import { NewProjectModal, NewTaskModal, TaskDetailPanel, ShareModal, FileViewerModal, CustomFieldsModal } from '@/features/flowdeck/components/modals';
import { KeyboardShortcutsModal, BulkActionBar, CommandPalette, DuplicateTaskDialog } from '@/features/flowdeck/components/ui';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes, getRouteForView, getViewFromPathname } from '@/shared/navigation/routes';
import type { TopBarHandle } from '@/features/flowdeck/components/layout/TopBar';

export default function ProductLayout({ children }: { children: React.ReactNode }) {
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
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F7F7F7', fontFamily: FF, color: '#9CA3AF' }}>
        Loading Flowdek…
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ProductShellInner onLogout={auth.logout}>
        {children}
      </ProductShellInner>
    </ThemeProvider>
  );
}

function ProductShellInner({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();

  const theme = useTheme();
  const { isMobile } = useViewport();
  const [mounted, setMounted] = useState(false);
  const [shortcutsOpenState, setShortcutsOpenState] = useState(false);
  const [customFieldsOpenState, setCustomFieldsOpenState] = useState(false);
  const [commandPaletteOpenState, setCommandPaletteOpenState] = useState(false);
  const [duplicateDialogTaskIdState, setDuplicateDialogTaskIdState] = useState<string | null>(null);

  const topBarRef = useRef<TopBarHandle>(null);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const state = useFlowDeck();
  const {
    project, tasks, files, gridActions,
    searchQuery, projectMenuOpen, sidebarOpen, moreMenuOpen,
    showNewTask, showNewProject, shareOpen, projects,
    searchFilters, setSearchFilters, activeFilterCount, clearFilters,
    selectedTaskId, currentProjectId,
  } = state;

  // Extract route parameters & current view
  const routeProjectId = (params?.projectId as string) || currentProjectId || Object.keys(projects)[0] || 'p1';
  const activeView = getViewFromPathname(pathname);

  // Sync route projectId with store state
  useEffect(() => {
    if (routeProjectId && routeProjectId !== currentProjectId && projects[routeProjectId]) {
      state.openProject(routeProjectId);
    }
  }, [routeProjectId, currentProjectId, projects, state]);

  // Derived overlay visibility flags driven by URL or state fallback
  const isNewProjectRoute = pathname === routes.newProject() || showNewProject;
  const isNewTaskRoute = pathname === routes.newTask(routeProjectId) || showNewTask;
  const isShareRoute = pathname === routes.projectShare(routeProjectId) || shareOpen;
  const isCustomFieldsRoute = pathname === routes.projectCustomFields(routeProjectId) || customFieldsOpenState;
  const isShortcutsRoute = pathname === routes.shortcuts() || shortcutsOpenState;
  const isCommandRoute = pathname === routes.command() || commandPaletteOpenState;

  // Task Detail Modal derived from URL or state
  let urlTaskId: string | null = null;
  if (pathname.includes('/tasks/') && !pathname.endsWith('/tasks/new')) {
    const parts = pathname.split('/');
    const taskIdx = parts.indexOf('tasks');
    if (taskIdx !== -1 && parts.length > taskIdx + 1) {
      const candidate = parts[taskIdx + 1];
      if (candidate && candidate !== 'new') {
        urlTaskId = decodeURIComponent(candidate);
      }
    }
  }
  const effectiveSelectedTaskId = urlTaskId || selectedTaskId;
  const activeSelectedTask = effectiveSelectedTaskId ? tasks.find(t => t.id === effectiveSelectedTaskId) || null : null;
  const parentTask = activeSelectedTask?.parentId ? tasks.find(t => t.id === activeSelectedTask.parentId) || null : null;

  // File viewer derived from URL or state
  let urlFileId: string | null = null;
  if (pathname.includes('/files/')) {
    const parts = pathname.split('/');
    const fileIdx = parts.indexOf('files');
    if (fileIdx !== -1 && parts.length > fileIdx + 1) {
      urlFileId = decodeURIComponent(parts[fileIdx + 1]);
    }
  }
  const activeViewingFile = urlFileId
    ? files.find(f => f.id === urlFileId) || null
    : state.viewingFile;

  // Duplicate task dialog derived from URL or state
  let urlDuplicateTaskId: string | null = null;
  if (pathname.endsWith('/duplicate')) {
    const parts = pathname.split('/');
    const dupIdx = parts.indexOf('duplicate');
    if (dupIdx > 0) {
      urlDuplicateTaskId = decodeURIComponent(parts[dupIdx - 1]);
    }
  }
  const effectiveDuplicateTaskId = urlDuplicateTaskId || duplicateDialogTaskIdState;
  const duplicateDialogTask = effectiveDuplicateTaskId ? tasks.find(t => t.id === effectiveDuplicateTaskId) : null;

  // Keyboard shortcut listeners
  useKeyboardShortcuts({
    activeView,
    searchQuery,
    selectedIds: state.selectedIds,
    onToggleComplete: state.toggleComplete,
    onIndent: gridActions.onIndent,
    onOutdent: gridActions.onOutdent,
    onDelete: gridActions.onDeleteSelected,
    onUndo: gridActions.onUndo,
    onRedo: gridActions.onRedo,
    onShowNewTask: () => router.push(routes.newTask(routeProjectId)),
    onSearchFocus: () => topBarRef.current?.focusSearch(),
    onShowShortcuts: () => router.push(routes.shortcuts()),
    onOpenCommandPalette: () => router.push(routes.command()),
    onDuplicate: () => {
      if (effectiveSelectedTaskId) {
        router.push(routes.taskDuplicate(routeProjectId, effectiveSelectedTaskId));
      } else if (state.selectedIds.size === 1) {
        const singleId = [...state.selectedIds][0];
        router.push(routes.taskDuplicate(routeProjectId, singleId));
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
    const targetRoute = getRouteForView(viewId, routeProjectId);
    router.push(targetRoute);
  };

  const handleOpenProject = (projId: string) => {
    state.openProject(projId);
    state.setProjectMenuOpen(false);
    router.push(routes.projectOverview(projId));
  };

  const handleCloseModal = (fallbackRoute?: string) => {
    state.setShowNewProject(false);
    state.setShowNewTask(false);
    state.setShareOpen(false);
    state.setSelectedTaskId(null);
    state.setViewingFileId(null);
    setShortcutsOpenState(false);
    setCustomFieldsOpenState(false);
    setCommandPaletteOpenState(false);
    setDuplicateDialogTaskIdState(null);

    const defaultFallback = routes.projectTasks(routeProjectId);
    router.push(fallbackRoute || defaultFallback);
  };

  const bottomNavHeight = isMobile ? 64 : 0;
  const topbarHeight = isMobile ? 52 : theme.layout.topbar.height;

  function mobileNavTo(id: string) {
    if (id === '_more') {
      state.setMoreMenuOpen(o => !o);
      return;
    }
    const targetRoute = getRouteForView(id, routeProjectId);
    router.push(targetRoute);
    state.setMoreMenuOpen(false);
  }

  if (!mounted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: theme.layout.content.bg, fontFamily: FF, color: theme.colors.gray }}>
        Loading Flowdek…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: theme.layout.content.bg, fontFamily: FF, color: theme.colors.ink, overflow: 'hidden' }}>
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
          onShowNewTask={() => router.push(routes.newTask(routeProjectId))}
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

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, paddingBottom: bottomNavHeight }}>
          {children}
        </div>

        {isMobile && (
          <BottomNav activeView={activeView} onNav={mobileNavTo} />
        )}
        {isMobile && moreMenuOpen && (
          <MoreMenu onClose={() => state.setMoreMenuOpen(false)} activeView={activeView} project={project} onNavigate={mobileNavTo} />
        )}
      </div>

      {/* Overlays / Modals */}
      {isNewProjectRoute && (
        <NewProjectModal
          onClose={() => handleCloseModal(routes.projects())}
          onCreate={p => {
            state.createProject(p);
            handleCloseModal(routes.projects());
          }}
          onCreateFromTemplate={(tid, name, color, start, end) => {
            state.createProjectFromTemplate(tid, name, color, start, end);
            handleCloseModal(routes.projects());
          }}
        />
      )}

      {isNewTaskRoute && (
        <NewTaskModal
          projectStart={project?.start || ''}
          tasks={tasks}
          tags={state.tags}
          onClose={() => handleCloseModal()}
          onCreate={task => {
            state.addTask(task);
            handleCloseModal();
          }}
        />
      )}

      {activeSelectedTask && (
        <TaskDetailPanel
          task={activeSelectedTask}
          allTasks={tasks}
          files={state.files}
          tags={state.tags}
          comments={state.taskComments}
          activity={state.taskActivity}
          parentTask={parentTask}
          onClose={() => handleCloseModal()}
          onUpdate={patch => state.updateTask(activeSelectedTask.id, patch)}
          onAddSubtask={parentId => router.push(routes.newTask(routeProjectId))}
          onNavigateToTask={taskId => router.push(routes.task(routeProjectId, taskId))}
          onToggleTaskTag={state.toggleTaskTag}
          onAddTag={state.addTag}
          onRemoveTag={state.removeTag}
          onAddComment={state.addComment}
          onDeleteComment={state.deleteComment}
          onEditComment={state.editComment}
          onToggleReaction={state.toggleReaction}
          onToggleFollower={state.toggleFollower}
          timeLogs={state.taskTimeLogs}
          onAddTimeLog={state.addTimeLog}
          onDeleteTimeLog={state.deleteTimeLog}
          currentUserId={state.currentUserId}
          customCols={state.customCols}
          onViewFile={fileId => router.push(routes.file(routeProjectId, fileId))}
          onRemoveFile={state.removeFile}
          onAddFiles={state.addFiles}
          onDuplicateTaskWithOptions={state.duplicateTaskWithOptions}
          onMoveToProject={state.moveTaskToProject}
        />
      )}

      {isShareRoute && project && (
        <ShareModal
          project={project}
          onClose={() => handleCloseModal()}
        />
      )}

      {activeViewingFile && (
        <FileViewerModal
          file={activeViewingFile}
          allFiles={state.files}
          allTasks={tasks}
          onClose={() => handleCloseModal(routes.projectFiles(routeProjectId))}
          onNavigateFile={fileId => router.push(routes.file(routeProjectId, fileId))}
        />
      )}

      {isCustomFieldsRoute && (
        <CustomFieldsModal
          columns={state.customCols}
          onAdd={state.addColumn}
          onRemove={state.removeColumn}
          onClose={() => handleCloseModal()}
        />
      )}

      {isShortcutsRoute && (
        <KeyboardShortcutsModal
          open={true}
          onClose={() => handleCloseModal()}
        />
      )}

      {isCommandRoute && (
        <CommandPalette
          open={true}
          onOpenChange={open => {
            if (!open) handleCloseModal();
          }}
          activeView={activeView}
          onNavigate={view => {
            handleCloseModal(getRouteForView(view, routeProjectId));
          }}
          projects={projects}
          onOpenProject={id => {
            state.openProject(id);
            handleCloseModal(routes.projectOverview(id));
          }}
          onNewProject={() => handleCloseModal(routes.newProject())}
          tasksByProject={state.tasksByProject}
          onOpenTask={id => {
            handleCloseModal(routes.task(routeProjectId, id));
          }}
          onNewTask={() => handleCloseModal(routes.newTask(routeProjectId))}
          onUndo={gridActions.onUndo}
          onRedo={gridActions.onRedo}
          canUndo={gridActions.canUndo}
          canRedo={gridActions.canRedo}
          onToggleTheme={() => {}}
        />
      )}

      {duplicateDialogTask && (
        <DuplicateTaskDialog
          taskName={duplicateDialogTask.name}
          hasSubtasks={Boolean(duplicateDialogTask.parentId || state.tasks.some(t => t.parentId === duplicateDialogTask.id))}
          hasComments={Boolean(state.commentsByProject[routeProjectId]?.some(c => c.taskId === duplicateDialogTask.id))}
          hasAttachments={Boolean(state.files.some(f => f.linkedTaskId === duplicateDialogTask.id))}
          onCancel={() => handleCloseModal()}
          onConfirm={opts => {
            state.duplicateTaskWithOptions(duplicateDialogTask.id, opts);
            handleCloseModal();
          }}
        />
      )}

      {state.selectedIds.size > 0 && (
        <BulkActionBar
          count={state.selectedIds.size}
          onClearSelection={() => state.setSelectedIds(new Set())}
          onBulkAssign={memberId => {
            state.selectedIds.forEach(id => state.updateTask(id, { assignee: memberId }));
          }}
          onSetPriority={priority => {
            state.selectedIds.forEach(id => state.updateTask(id, { priority }));
          }}
          onComplete={() => {
            state.selectedIds.forEach(id => state.updateTask(id, { status: 'done' }));
          }}
          onDelete={() => state.removeTasksBulk(state.selectedIds)}
          onLink={() => {}}
          onUnlink={() => {}}
          onBold={() => {}}
          onMilestone={() => {}}
          onAttachFiles={() => {}}
          onDuplicateBulk={() => state.duplicateTasksBulk(state.selectedIds)}
          onBulkSetDueDate={date => state.bulkSetDueDate(state.selectedIds, date)}
          onBulkAddTag={tagId => state.bulkAddTag(state.selectedIds, tagId)}
          onBulkRemoveTag={tagId => state.bulkRemoveTag(state.selectedIds, tagId)}
          onBulkSetStatus={status => state.bulkSetStatus(state.selectedIds, status)}
          onBulkMoveToProject={targetProjectId => state.moveTasksToProjectBulk(state.selectedIds, targetProjectId)}
          tags={state.tags}
          projects={projects}
          currentProjectId={routeProjectId}
        />
      )}
    </div>
  );
}
