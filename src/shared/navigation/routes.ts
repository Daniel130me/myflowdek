/**
 * Canonical route definitions and helper utilities for Flowdek.
 */

export const routes = {
  // Auth routes
  login: () => '/login',
  forgotPassword: () => '/forgot-password',
  resetPassword: () => '/reset-password',
  onboarding: () => '/onboarding',

  // Public legal pages (linked from the auth layouts; no session required)
  terms: () => '/legal/terms',
  privacy: () => '/legal/privacy',

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
  talentDirectory: () => '/talent',
  talentInvitations: () => '/talent/invitations',
  talentOpportunities: () => '/talent/opportunities',
  talentOpportunity: (opportunityId: string) => `/talent/opportunities/${encodeURIComponent(opportunityId)}`,
  talentEngagements: () => '/talent/engagements',
  talentEngagement: (engagementId: string) => `/talent/engagements/${encodeURIComponent(engagementId)}`,
  talentProfessional: (slug: string) => `/talent/professionals/${encodeURIComponent(slug)}`,
  talentProfile: () => '/talent/profile',
  editTalentProfile: () => '/talent/profile/edit',

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
  // `taskId` threads the parent for "Add subtask" (audit Table 5.1): the
  // new-task modal reads the `parent` query param and pre-selects it.
  newTask: (projectId: string, taskId?: string) =>
    `/projects/${encodeURIComponent(projectId)}/tasks/new${taskId ? `?parent=${encodeURIComponent(taskId)}` : ''}`,
  task: (projectId: string, taskId: string) => `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
  taskDuplicate: (projectId: string, taskId: string) => `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/duplicate`,
  file: (projectId: string, fileId: string) => `/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}`,
};

/**
 * Sections whose path can carry a resource-id tail that belongs to a
 * specific project: /projects/:id/tasks/:taskId and /projects/:id/files/:fileId
 * (plus /duplicate). Switching projects while such a tail is present would
 * address the OLD project's resource under the NEW project's route — a
 * guaranteed 404 (audit Table 5.1) — so those tails collapse to the
 * section root. `new` is a form overlay, not a stored resource, and is
 * safe to keep.
 */
const RESOURCE_ID_SECTIONS = new Set(['tasks', 'files']);

export function replaceProjectInPath(pathname: string, projectId: string): string {
  const parts = pathname.split('/').filter(Boolean);
  // Not inside a project workspace (or malformed): land on the new
  // project's overview.
  if (parts[0] !== 'projects' || parts.length < 2 || !parts[1]) {
    return routes.projectOverview(projectId);
  }

  const section = parts[2];
  if (!section) {
    return routes.projectOverview(projectId);
  }

  // Collapse a resource-id tail (/tasks/<id>, /tasks/<id>/duplicate,
  // /files/<id>) to the section root; keep safe tails (section roots,
  // overlays like /tasks/new, /settings/custom-fields) so switching stays
  // context-preserving wherever it cannot 404.
  const hasResourceIdTail = parts.length > 3 && RESOURCE_ID_SECTIONS.has(section) && parts[3] !== 'new';
  if (hasResourceIdTail) {
    return `/${['projects', encodeURIComponent(projectId), section].join('/')}`;
  }

  parts[1] = encodeURIComponent(projectId);
  return `/${parts.join('/')}`;
}

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
    case 'talent':
      return routes.talentDirectory();
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
  if (pathname.startsWith('/talent')) return 'talent';
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
