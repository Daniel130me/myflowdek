/**
 * Canonical route definitions and helper utilities for Flowdek.
 */

export const routes = {
  // Auth routes
  login: () => '/login',
  resetPassword: () => '/reset-password',
  onboarding: () => '/onboarding',

  // Top-level product routes
  projects: () => '/projects',
  newProject: () => '/projects/new',
  myTasks: () => '/my-tasks',
  inbox: () => '/inbox',
  goals: () => '/goals',
  automations: () => '/automations',
  forms: () => '/forms',
  approvals: () => '/approvals',
  budgets: () => '/budgets',
  timesheets: () => '/timesheets',
  ai: () => '/ai',
  shortcuts: () => '/shortcuts',
  command: () => '/command',
  settings: () => '/settings',

  // Project workspace routes
  projectOverview: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/overview`,
  projectTasks: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/tasks`,
  projectBoard: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/board`,
  projectTimeline: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/timeline`,
  projectSheet: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/sheet`,
  projectCalendar: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/calendar`,
  projectRaid: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/raid`,
  projectFiles: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/files`,
  projectDocuments: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/documents`,
  projectTeam: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/team`,
  projectReports: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/reports`,
  projectDependencies: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/dependencies`,
  projectAutomations: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/automations`,
  projectForms: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/forms`,
  projectApprovals: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/approvals`,
  projectBudgets: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/budgets`,
  projectShare: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/share`,
  projectCustomFields: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/settings/custom-fields`,

  // Resource overlays / detail routes
  newTask: (projectId: string) => `/projects/${encodeURIComponent(projectId)}/tasks/new`,
  task: (projectId: string, taskId: string) => `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
  taskDuplicate: (projectId: string, taskId: string) => `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/duplicate`,
  file: (projectId: string, fileId: string) => `/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}`,
};

export function getRouteForView(viewId: string, projectId?: string): string {
  switch (viewId) {
    case 'projects':
      return routes.projects();
    case 'mytasks':
    case 'my-tasks':
      return routes.myTasks();
    case 'inbox':
      return routes.inbox();
    case 'goals':
      return routes.goals();
    case 'automations':
      return routes.automations();
    case 'forms':
      return routes.forms();
    case 'approvals':
      return routes.approvals();
    case 'budget':
    case 'budgets':
      return routes.budgets();
    case 'timesheets':
      return routes.timesheets();
    case 'ai':
      return routes.ai();
    case 'shortcuts':
      return routes.shortcuts();
    case 'command':
      return routes.command();
    case 'settings':
      return routes.settings();
    case 'dashboard':
    case 'overview':
      return projectId ? routes.projectOverview(projectId) : routes.projects();
    case 'tasks':
      return projectId ? routes.projectTasks(projectId) : routes.projects();
    case 'board':
      return projectId ? routes.projectBoard(projectId) : routes.projects();
    case 'timeline':
      return projectId ? routes.projectTimeline(projectId) : routes.projects();
    case 'sheet':
      return projectId ? routes.projectSheet(projectId) : routes.projects();
    case 'calendar':
      return projectId ? routes.projectCalendar(projectId) : routes.projects();
    case 'raid':
      return projectId ? routes.projectRaid(projectId) : routes.projects();
    case 'files':
      return projectId ? routes.projectFiles(projectId) : routes.projects();
    case 'documents':
      return projectId ? routes.projectDocuments(projectId) : routes.projects();
    case 'team':
      return projectId ? routes.projectTeam(projectId) : routes.projects();
    case 'reports':
      return projectId ? routes.projectReports(projectId) : routes.projects();
    case 'deps':
    case 'dependencies':
      return projectId ? routes.projectDependencies(projectId) : routes.projects();
    default:
      return routes.projects();
  }
}

export function getViewFromPathname(pathname: string): string {
  if (pathname.startsWith('/my-tasks')) return 'mytasks';
  if (pathname.startsWith('/inbox')) return 'inbox';
  if (pathname.startsWith('/goals')) return 'goals';
  if (pathname.startsWith('/automations')) return 'automations';
  if (pathname.startsWith('/forms')) return 'forms';
  if (pathname.startsWith('/approvals')) return 'approvals';
  if (pathname.startsWith('/budgets')) return 'budget';
  if (pathname.startsWith('/timesheets')) return 'timesheets';
  if (pathname.startsWith('/ai')) return 'ai';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/projects')) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 1) return 'projects'; // /projects
    if (parts.length >= 3) {
      const sub = parts[2];
      if (sub === 'overview') return 'dashboard';
      if (sub === 'deps') return 'deps';
      return sub;
    }
  }
  return 'projects';
}
