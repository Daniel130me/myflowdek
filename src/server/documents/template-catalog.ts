import type { DocumentTemplateDefinition, GoogleDocumentContent, GoogleSheetContent } from './types';

const projectFields = [
  { type: 'field' as const, label: 'Project Name', value: '{{project.name}}' },
  { type: 'field' as const, label: 'Project Manager', value: '{{project.manager.name}} ({{project.manager.email}})' },
  { type: 'field' as const, label: 'Project Dates', value: '{{project.startDate}} to {{project.endDate}}' },
  { type: 'field' as const, label: 'Workspace', value: '{{workspace.name}}' },
  { type: 'field' as const, label: 'Prepared On', value: '{{currentDate}}' },
];

function documentContent(
  title: string,
  sections: Array<[string, string]>,
  bullets: string[] = [],
): GoogleDocumentContent {
  return {
    sections: [
      { type: 'heading', text: title },
      ...projectFields,
      ...sections.map(([heading, body]) => ({ type: 'section' as const, heading, body })),
      ...(bullets.length ? [{ type: 'bullets' as const, heading: 'Completion Checklist', items: bullets }] : []),
    ],
  };
}

function sheetContent(name: string, columns: string[], rows: string[][] = []): GoogleSheetContent {
  return { sheets: [{ name, columns, rows }] };
}

const realContent: Record<string, GoogleDocumentContent | GoogleSheetContent> = {
  'project-charter': documentContent('Project Charter', [
    ['Project Purpose', '{{project.description}}'],
    ['Objectives and Success Criteria', 'Define measurable business outcomes and how success will be assessed.'],
    ['High-Level Scope', 'Describe what is included, what is excluded, and the principal deliverables.'],
    ['Milestones', 'List the major decision points and target completion dates.'],
    ['Stakeholders and Governance', 'Identify the sponsor, decision makers, project manager, and escalation path.'],
    ['Risks, Assumptions, and Constraints', 'Record the conditions that could affect delivery and the assumptions requiring validation.'],
    ['Authorization', 'Document sponsor approval and the authority granted to the project manager.'],
  ], ['Purpose approved', 'Scope boundaries agreed', 'Sponsor authorization recorded']),
  'business-case': documentContent('Business Case', [
    ['Executive Summary', 'Summarize the opportunity, recommended investment, and expected outcome.'],
    ['Problem or Opportunity', '{{project.description}}'],
    ['Options Considered', 'Compare the viable options, including a do-nothing baseline.'],
    ['Benefits', 'List measurable financial and non-financial benefits with accountable owners.'],
    ['Costs and Funding', 'Estimate implementation and operating costs and identify the funding source.'],
    ['Risks and Sensitivities', 'Document key uncertainties and how changes affect the recommendation.'],
    ['Recommendation', 'State the preferred option and the decision required.'],
  ]),
  'stakeholder-register': sheetContent('Stakeholder Register', ['ID', 'Stakeholder', 'Role', 'Organization', 'Influence', 'Interest', 'Expectations', 'Engagement Strategy', 'Owner', 'Status'], [['S-001', 'Project Sponsor', 'Sponsor', '{{workspace.name}}', 'High', 'High', 'Business outcomes', 'Manage closely', '{{project.manager.name}}', 'Active']]),
  'project-management-plan': documentContent('Project Management Plan', [
    ['Management Approach', 'Describe the delivery method, governance cadence, and decision rights.'],
    ['Scope Baseline', 'Reference approved scope, WBS, deliverables, and acceptance criteria.'],
    ['Schedule and Cost Baselines', 'Summarize approved dates, budget, tolerances, and reporting rules.'],
    ['Quality and Resource Management', 'Define standards, roles, staffing, and performance expectations.'],
    ['Communication and Stakeholder Engagement', 'Describe audiences, channels, frequency, and accountable owners.'],
    ['Risk, Issue, and Change Control', 'Explain identification, escalation, approval, and tracking procedures.'],
    ['Procurement and Closure', 'Document sourcing approach, transition, acceptance, and closure requirements.'],
  ]),
  'scope-statement': documentContent('Project Scope Statement', [
    ['Scope Description', '{{project.description}}'],
    ['Objectives', 'List specific, measurable objectives linked to business outcomes.'],
    ['Deliverables', 'Describe each accepted output and its owner.'],
    ['In Scope', 'List the products, teams, locations, and processes included.'],
    ['Out of Scope', 'State exclusions explicitly to prevent scope ambiguity.'],
    ['Acceptance Criteria', 'Define the evidence and approver required for acceptance.'],
    ['Constraints and Assumptions', 'Record fixed limits and assumptions that must remain true.'],
  ]),
  'wbs-dictionary': sheetContent('WBS Dictionary', ['WBS ID', 'Work Package', 'Description', 'Deliverable', 'Owner', 'Acceptance Criteria', 'Dependencies', 'Estimate', 'Status'], [['1.0', 'Project Management', 'Coordinate delivery and governance', 'Approved management records', '{{project.manager.name}}', 'Sponsor acceptance', '', '', 'Planned']]),
  'project-budget': sheetContent('Cost Baseline', ['Cost ID', 'Category', 'Description', 'Owner', 'Planned Cost', 'Contingency', 'Approved Baseline', 'Actual Cost', 'Variance', 'Status'], [['C-001', 'Labor', 'Project team effort', '{{project.manager.name}}', '', '', '', '', '', 'Planned']]),
  'communication-management-plan': documentContent('Communication Management Plan', [
    ['Communication Objectives', 'Define how communications will support decisions, alignment, and adoption.'],
    ['Audience Analysis', 'Describe stakeholder information needs, influence, and preferred channels.'],
    ['Cadence and Channels', 'Document meetings, written updates, repositories, and frequency.'],
    ['Roles and Responsibilities', 'Assign authors, reviewers, approvers, and distribution owners.'],
    ['Escalation and Confidentiality', 'Define urgent escalation paths and information-handling requirements.'],
    ['Effectiveness Measures', 'Explain how feedback, attendance, and comprehension will be monitored.'],
  ]),
  'risk-register': sheetContent('Risk Register', ['ID', 'Risk', 'Category', 'Cause', 'Probability', 'Impact', 'Score', 'Owner', 'Response', 'Due Date', 'Status'], [['R-001', 'Describe the uncertain event', 'Delivery', '', 'Medium', 'High', '', '{{project.manager.name}}', 'Mitigate', '', 'Open']]),
  'project-status-report': documentContent('Project Status Report', [
    ['Overall Status', 'Report schedule, scope, cost, quality, and resource health using agreed indicators.'],
    ['Executive Summary', 'Summarize progress, decisions needed, and the most important change since the last report.'],
    ['Accomplishments', 'List completed deliverables and milestones for the reporting period.'],
    ['Upcoming Work', 'List the next priorities, owners, and expected completion dates.'],
    ['Risks and Issues', 'Highlight material exposures, impact, response, and escalation status.'],
    ['Budget and Schedule', 'Compare actual performance with the approved baselines.'],
    ['Decisions and Support Required', 'State the decision, owner, deadline, and consequence of delay.'],
  ]),
  'issue-log': sheetContent('Issue Log', ['ID', 'Issue', 'Date Raised', 'Impact', 'Priority', 'Owner', 'Action', 'Target Date', 'Status', 'Resolution'], [['I-001', 'Describe the current issue', '{{currentDate}}', 'High', 'High', '{{project.manager.name}}', '', '', 'Open', '']]),
  'change-request-form': documentContent('Change Request Form', [
    ['Requested Change', 'Describe the proposed change clearly and identify the requester.'],
    ['Business Justification', 'Explain why the change is needed and the expected benefit.'],
    ['Impact Assessment', 'Assess scope, schedule, cost, quality, resource, risk, and contractual impacts.'],
    ['Alternatives Considered', 'Document other options and the consequence of rejection.'],
    ['Implementation Plan', 'Describe activities, owner, timing, rollback, and communication needs.'],
    ['Decision', 'Record approval, rejection, deferral, conditions, and decision authority.'],
  ]),
  'lessons-learned': documentContent('Lessons Learned', [
    ['Context', 'Summarize the project stage, outcome, and conditions in which the lesson arose.'],
    ['What Worked Well', 'Capture practices that should be repeated and the evidence supporting them.'],
    ['What Could Improve', 'Describe gaps without assigning blame and identify contributing causes.'],
    ['Recommendations', 'Translate observations into specific actions, owners, and target dates.'],
    ['Knowledge Transfer', 'Identify teams, repositories, standards, or future projects that should receive the lesson.'],
  ]),
  'project-closure-report': documentContent('Project Closure Report', [
    ['Closure Summary', 'State why the project is closing and whether its objectives were achieved.'],
    ['Deliverables and Acceptance', 'List final deliverables, acceptance evidence, and outstanding exceptions.'],
    ['Performance Against Baselines', 'Compare scope, schedule, cost, quality, and benefits with approved targets.'],
    ['Outstanding Actions', 'Record transferred risks, issues, contracts, support, and operational ownership.'],
    ['Financial and Contract Closure', 'Confirm final costs, invoices, assets, and procurement closure.'],
    ['Lessons and Recommendations', 'Summarize reusable insights and recommended follow-up.'],
    ['Formal Approval', 'Record sponsor approval and the effective closure date.'],
  ]),
  'final-deliverable-acceptance-form': documentContent('Final Deliverable Acceptance Form', [
    ['Deliverable Identification', 'List the deliverable, version, delivery date, and accountable owner.'],
    ['Acceptance Criteria', 'Reference the approved criteria and evidence for each requirement.'],
    ['Verification Results', 'Record review, testing, defects, waivers, and final disposition.'],
    ['Exceptions and Follow-Up', 'List accepted exceptions, corrective owners, and deadlines.'],
    ['Acceptance Decision', 'Record accepted, conditionally accepted, or rejected with rationale.'],
    ['Sign-Off', 'Capture approver names, roles, dates, and comments.'],
  ]),
};

const sheetColumns: Record<string, string[]> = {
  'requirements-traceability-matrix': ['Requirement ID', 'Requirement', 'Source', 'Priority', 'Deliverable', 'Test Case', 'Owner', 'Status'],
  'team-timesheet': ['Date', 'Team Member', 'Task', 'Category', 'Hours', 'Billable', 'Notes', 'Approval Status'],
  'change-log': ['Change ID', 'Title', 'Requester', 'Date Raised', 'Impact', 'Decision', 'Decision Date', 'Owner', 'Status'],
  'quality-control-checklist': ['Check ID', 'Deliverable', 'Quality Criterion', 'Method', 'Owner', 'Result', 'Evidence', 'Status'],
};

const metadata: Array<Omit<DocumentTemplateDefinition, 'content' | 'tags' | 'version'> & { tags?: string[] }> = [
  { slug: 'business-case', name: 'Business Case', description: 'Evaluate the investment rationale, options, benefits, costs, and risks.', phase: 'INITIATION', documentType: 'GOOGLE_DOC' },
  { slug: 'feasibility-study', name: 'Feasibility Study', description: 'Assess technical, operational, financial, legal, and schedule viability.', phase: 'INITIATION', documentType: 'GOOGLE_DOC' },
  { slug: 'project-charter', name: 'Project Charter', description: 'Authorize the project and establish objectives, scope, governance, and authority.', phase: 'INITIATION', documentType: 'GOOGLE_DOC' },
  { slug: 'stakeholder-register', name: 'Stakeholder Register', description: 'Track stakeholder influence, expectations, ownership, and engagement strategy.', phase: 'INITIATION', documentType: 'GOOGLE_SHEET' },
  { slug: 'project-management-plan', name: 'Project Management Plan', description: 'Integrate the project baselines, governance, controls, and delivery approach.', phase: 'PLANNING', documentType: 'GOOGLE_DOC' },
  { slug: 'scope-management-plan', name: 'Scope Management Plan', description: 'Define how scope will be established, validated, and controlled.', phase: 'PLANNING', documentType: 'GOOGLE_DOC' },
  { slug: 'scope-statement', name: 'Scope Statement', description: 'Document objectives, deliverables, boundaries, criteria, and constraints.', phase: 'PLANNING', documentType: 'GOOGLE_DOC' },
  { slug: 'work-breakdown-structure', name: 'Work Breakdown Structure', description: 'Organize project deliverables into manageable work packages.', phase: 'PLANNING', documentType: 'FLOWDEK_GENERATED' },
  { slug: 'wbs-dictionary', name: 'WBS Dictionary', description: 'Define each work package, owner, deliverable, estimate, and acceptance criteria.', phase: 'PLANNING', documentType: 'GOOGLE_SHEET' },
  { slug: 'schedule-management-plan', name: 'Schedule Management Plan', description: 'Set scheduling methods, units, tolerances, updates, and controls.', phase: 'PLANNING', documentType: 'GOOGLE_DOC' },
  { slug: 'project-schedule-gantt-chart', name: 'Project Schedule / Gantt Chart', description: 'Create a timeline-oriented view of tasks, dates, milestones, and dependencies.', phase: 'PLANNING', documentType: 'FLOWDEK_GENERATED' },
  { slug: 'cost-management-plan', name: 'Cost Management Plan', description: 'Define estimating, budgeting, control, thresholds, and reporting rules.', phase: 'PLANNING', documentType: 'GOOGLE_DOC' },
  { slug: 'project-budget', name: 'Project Budget / Cost Baseline', description: 'Plan and track approved costs, contingency, actuals, and variance.', phase: 'PLANNING', documentType: 'GOOGLE_SHEET' },
  { slug: 'quality-management-plan', name: 'Quality Management Plan', description: 'Define applicable standards, assurance, control, metrics, and ownership.', phase: 'PLANNING', documentType: 'GOOGLE_DOC' },
  { slug: 'resource-management-plan', name: 'Resource Management Plan', description: 'Plan roles, staffing, acquisition, development, and team performance.', phase: 'PLANNING', documentType: 'GOOGLE_DOC' },
  { slug: 'resource-breakdown-structure', name: 'Resource Breakdown Structure', description: 'Organize project resources by category, skill, team, and responsibility.', phase: 'PLANNING', documentType: 'FLOWDEK_GENERATED' },
  { slug: 'communication-management-plan', name: 'Communication Management Plan', description: 'Plan audiences, messages, channels, cadence, ownership, and escalation.', phase: 'PLANNING', documentType: 'GOOGLE_DOC' },
  { slug: 'risk-management-plan', name: 'Risk Management Plan', description: 'Define risk methods, categories, thresholds, roles, review, and reporting.', phase: 'PLANNING', documentType: 'GOOGLE_DOC' },
  { slug: 'risk-register', name: 'Risk Register', description: 'Identify, assess, assign, respond to, and monitor project risks.', phase: 'PLANNING', documentType: 'GOOGLE_SHEET' },
  { slug: 'procurement-management-plan', name: 'Procurement Management Plan', description: 'Plan make-or-buy decisions, sourcing, contracts, controls, and closure.', phase: 'PLANNING', documentType: 'GOOGLE_DOC' },
  { slug: 'vendor-contract-statement-of-work', name: 'Vendor Contract / Statement of Work', description: 'Define supplier scope, deliverables, obligations, acceptance, and commercial terms.', phase: 'PLANNING', documentType: 'GOOGLE_DOC' },
  { slug: 'stakeholder-engagement-plan', name: 'Stakeholder Engagement Plan', description: 'Plan targeted actions to build and sustain stakeholder support.', phase: 'PLANNING', documentType: 'GOOGLE_DOC' },
  { slug: 'requirements-traceability-matrix', name: 'Requirements Traceability Matrix', description: 'Trace requirements from source through delivery and verification.', phase: 'PLANNING', documentType: 'GOOGLE_SHEET' },
  { slug: 'project-status-report', name: 'Project Status Report', description: 'Communicate delivery health, progress, forecasts, risks, and decisions.', phase: 'EXECUTION_MONITORING', documentType: 'GOOGLE_DOC' },
  { slug: 'team-timesheet', name: 'Team Timesheet', description: 'Capture time by team member, task, category, and approval status.', phase: 'EXECUTION_MONITORING', documentType: 'GOOGLE_SHEET' },
  { slug: 'resource-histogram', name: 'Resource Histogram', description: 'Visualize planned resource demand and capacity over time.', phase: 'EXECUTION_MONITORING', documentType: 'FLOWDEK_GENERATED' },
  { slug: 'issue-log', name: 'Issue Log', description: 'Track current problems, impact, priority, actions, owners, and resolution.', phase: 'EXECUTION_MONITORING', documentType: 'GOOGLE_SHEET' },
  { slug: 'change-management-plan', name: 'Change Management Plan', description: 'Define how project changes will be assessed, approved, implemented, and communicated.', phase: 'EXECUTION_MONITORING', documentType: 'GOOGLE_DOC' },
  { slug: 'change-request-form', name: 'Change Request Form', description: 'Capture a proposed change, justification, impact assessment, and decision.', phase: 'EXECUTION_MONITORING', documentType: 'GOOGLE_DOC' },
  { slug: 'change-log', name: 'Change Log', description: 'Track requested changes, impact, decisions, ownership, and status.', phase: 'EXECUTION_MONITORING', documentType: 'GOOGLE_SHEET' },
  { slug: 'risk-audit-report', name: 'Risk Audit Report', description: 'Evaluate risk practices, response effectiveness, ownership, and residual exposure.', phase: 'EXECUTION_MONITORING', documentType: 'GOOGLE_DOC' },
  { slug: 'quality-control-checklist', name: 'Quality Control Checklist', description: 'Record deliverable inspections, results, evidence, and corrective status.', phase: 'EXECUTION_MONITORING', documentType: 'GOOGLE_SHEET' },
  { slug: 'project-closure-report', name: 'Project Closure Report', description: 'Confirm completion, acceptance, performance, transitions, and formal closure.', phase: 'CLOSING', documentType: 'GOOGLE_DOC' },
  { slug: 'lessons-learned', name: 'Lessons Learned Document', description: 'Capture evidence-based practices, gaps, causes, and reusable recommendations.', phase: 'CLOSING', documentType: 'GOOGLE_DOC' },
  { slug: 'final-deliverable-acceptance-form', name: 'Final Deliverable Acceptance Form', description: 'Document verification, exceptions, acceptance decision, and sign-off.', phase: 'CLOSING', documentType: 'GOOGLE_DOC' },
  { slug: 'post-project-evaluation', name: 'Post-Project Evaluation', description: 'Assess outcomes, benefits, stakeholder satisfaction, and improvement opportunities.', phase: 'CLOSING', documentType: 'GOOGLE_DOC' },
];

function defaultContent(slug: string, name: string, description: string, documentType: DocumentTemplateDefinition['documentType']) {
  if (documentType === 'GOOGLE_SHEET') {
    return sheetContent(name.slice(0, 80), sheetColumns[slug] ?? ['ID', 'Item', 'Description', 'Owner', 'Due Date', 'Status', 'Notes']);
  }
  return documentContent(name, [
    ['Purpose', description],
    ['Project Context', '{{project.description}}'],
    ['Working Content', 'Add the project-specific analysis, decisions, evidence, and accountable owners here.'],
    ['Review and Approval', 'Record reviewers, approval criteria, decisions, and dates.'],
  ]);
}

export const DOCUMENT_TEMPLATE_CATALOG: DocumentTemplateDefinition[] = metadata.map((item) => ({
  ...item,
  content: realContent[item.slug] ?? defaultContent(item.slug, item.name, item.description, item.documentType),
  tags: item.tags ?? [item.phase.toLowerCase().replace('_', '-'), item.documentType.toLowerCase().replace('_', '-')],
  version: 1,
}));