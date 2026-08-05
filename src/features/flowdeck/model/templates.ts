import { addDays } from './helpers';
import type { Task, ProjectTemplate, CustomColumn } from './types';

function uid(): string {
  return 't' + Math.random().toString(36).slice(2, 8);
}

function task(name: string, start: string, duration: number, deps: string[] = [], opts: Partial<Task> = {}): Task {
  return {
    id: uid(), name, status: 'backlog', assignee: 'u5', start, duration,
    progress: 0, priority: 'medium', deps, createdAt: new Date().toISOString(), ...opts,
  };
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl-website',
    name: 'Website Build',
    description: 'End-to-end website project with discovery, design, development, and launch phases.',
    icon: '🌐',
    color: '#FE8029',
    taskCount: 12,
    tags: [
      { name: 'Design', color: '#FE8029' },
      { name: 'Engineering', color: '#0891B2' },
      { name: 'Content', color: '#7C3AED' },
      { name: 'QA', color: '#DC2626' },
    ],
    customCols: [
      { key: 'client_review', label: 'Client Review', type: 'select', options: ['Pending', 'Approved', 'Revision Needed'] },
      { key: 'budget_hours', label: 'Budget Hours', type: 'number' },
    ],
    generateTasks: (pid, start) => {
      const d = (offset: number) => addDays(start, offset).toISOString().slice(0, 10);
      const t1 = uid(), t2 = uid(), t3 = uid(), t4 = uid(), t5 = uid(), t6 = uid();
      const t7 = uid(), t8 = uid(), t9 = uid(), t10 = uid(), t11 = uid(), t12 = uid();
      return [
        task('Stakeholder discovery', d(0), 5, [], { id: t1, priority: 'high', assignee: 'u5' }),
        task('Competitive audit', d(0), 4, [], { id: t2, assignee: 'u1' }),
        task('Information architecture', d(5), 5, [t1, t2], { id: t3, priority: 'high', assignee: 'u1' }),
        task('Content inventory & copywriting', d(5), 8, [t2], { id: t4, assignee: 'u6' }),
        task('Wireframes', d(10), 5, [t3], { id: t5, priority: 'high', assignee: 'u1' }),
        task('Visual design system', d(15), 8, [t5], { id: t6, priority: 'urgent', assignee: 'u1' }),
        task('Component library', d(23), 10, [t6], { id: t7, priority: 'high', assignee: 'u2' }),
        task('Front-end pages build', d(33), 12, [t7], { id: t8, priority: 'high', assignee: 'u2' }),
        task('CMS integration', d(33), 8, [t7], { id: t9, assignee: 'u3' }),
        task('SEO & performance', d(45), 5, [t8, t9], { id: t10, assignee: 'u3' }),
        task('QA & testing', d(50), 5, [t10], { id: t11, priority: 'high', assignee: 'u4' }),
        task('Launch', d(55), 2, [t11], { id: t12, priority: 'urgent', assignee: 'u7' }),
      ];
    },
  },
  {
    id: 'tpl-sprint',
    name: 'Agile Sprint',
    description: 'Two-week sprint with backlog grooming, daily standups, development, and retro.',
    icon: '🏃',
    color: '#0891B2',
    taskCount: 8,
    tags: [
      { name: 'Sprint Goal', color: '#0891B2' },
      { name: 'Bug', color: '#DC2626' },
      { name: 'Enhancement', color: '#16A34A' },
    ],
    customCols: [
      { key: 'sprint_points', label: 'Sprint Points', type: 'number' },
      { key: 'bug_severity', label: 'Bug Severity', type: 'select', options: ['P1 - Critical', 'P2 - Major', 'P3 - Minor', 'P4 - Trivial'] },
    ],
    generateTasks: (pid, start) => {
      const d = (offset: number) => addDays(start, offset).toISOString().slice(0, 10);
      const t1 = uid(), t2 = uid(), t3 = uid(), t4 = uid(), t5 = uid(), t6 = uid(), t7 = uid(), t8 = uid();
      return [
        task('Sprint planning & backlog grooming', d(0), 1, [], { id: t1, priority: 'high', assignee: 'u5', storyPoints: 0 }),
        task('Define sprint goal & acceptance criteria', d(0), 1, [t1], { id: t2, priority: 'high', assignee: 'u5', storyPoints: 0 }),
        task('Development - feature work', d(1), 7, [t2], { id: t3, priority: 'high', assignee: 'u2', storyPoints: 13 }),
        task('Development - bug fixes', d(1), 5, [], { id: t4, priority: 'medium', assignee: 'u3', storyPoints: 5 }),
        task('Code review & pair programming', d(3), 6, [t3], { id: t5, assignee: 'u2', storyPoints: 3 }),
        task('QA testing & regression', d(8), 3, [t3, t4, t5], { id: t6, priority: 'high', assignee: 'u4', storyPoints: 3 }),
        task('Sprint demo & stakeholder review', d(9), 1, [t6], { id: t7, priority: 'high', assignee: 'u5', storyPoints: 0 }),
        task('Sprint retrospective', d(10), 1, [t7], { id: t8, assignee: 'u5', storyPoints: 0 }),
      ];
    },
  },
  {
    id: 'tpl-product-launch',
    name: 'Product Launch',
    description: 'Go-to-market plan with marketing, sales enablement, and launch coordination.',
    icon: '🚀',
    color: '#16A34A',
    taskCount: 10,
    tags: [
      { name: 'Marketing', color: '#16A34A' },
      { name: 'Sales', color: '#D97706' },
      { name: 'Legal', color: '#DC2626' },
    ],
    customCols: [
      { key: 'channel', label: 'Channel', type: 'select', options: ['Email', 'Social', 'Blog', 'PR', 'Paid Ads'] },
      { key: 'launch_date_confirmed', label: 'Launch Date Confirmed', type: 'date' },
    ],
    generateTasks: (pid, start) => {
      const d = (offset: number) => addDays(start, offset).toISOString().slice(0, 10);
      const t1 = uid(), t2 = uid(), t3 = uid(), t4 = uid(), t5 = uid(), t6 = uid(), t7 = uid(), t8 = uid(), t9 = uid(), t10 = uid();
      return [
        task('Market research & positioning', d(0), 7, [], { id: t1, priority: 'high', assignee: 'u5' }),
        task('Competitive positioning document', d(7), 5, [t1], { id: t2, assignee: 'u6' }),
        task('Messaging & value proposition', d(7), 5, [t1], { id: t3, priority: 'high', assignee: 'u6' }),
        task('Launch landing page copy', d(12), 4, [t2, t3], { id: t4, assignee: 'u6' }),
        task('Email campaign sequence', d(12), 5, [t3], { id: t5, assignee: 'u6' }),
        task('Sales enablement materials', d(16), 6, [t2], { id: t6, assignee: 'u5' }),
        task('Press release & PR outreach', d(16), 5, [t3], { id: t7, assignee: 'u6' }),
        task('Social media content calendar', d(12), 8, [t3], { id: t8, assignee: 'u6' }),
        task('Legal & compliance review', d(17), 4, [t4, t5, t6, t7, t8], { id: t9, priority: 'high', assignee: 'u5' }),
        task('Launch day coordination', d(21), 1, [t9], { id: t10, priority: 'urgent', assignee: 'u5' }),
      ];
    },
  },
  {
    id: 'tpl-event',
    name: 'Event Planning',
    description: 'Plan and execute an event from venue booking to post-event follow-up.',
    icon: '🎪',
    color: '#7C3AED',
    taskCount: 10,
    tags: [
      { name: 'Logistics', color: '#7C3AED' },
      { name: 'Speakers', color: '#0891B2' },
      { name: 'Marketing', color: '#D97706' },
    ],
    customCols: [
      { key: 'budget_item', label: 'Budget Item', type: 'text' },
      { key: 'vendor', label: 'Vendor', type: 'text' },
    ],
    generateTasks: (pid, start) => {
      const d = (offset: number) => addDays(start, offset).toISOString().slice(0, 10);
      const t1 = uid(), t2 = uid(), t3 = uid(), t4 = uid(), t5 = uid(), t6 = uid(), t7 = uid(), t8 = uid(), t9 = uid(), t10 = uid();
      return [
        task('Define event goals & budget', d(0), 3, [], { id: t1, priority: 'high', assignee: 'u5' }),
        task('Venue research & booking', d(3), 5, [t1], { id: t2, priority: 'high', assignee: 'u5' }),
        task('Speaker outreach & invitations', d(3), 10, [t1], { id: t3, priority: 'medium', assignee: 'u6' }),
        task('Event website & registration', d(8), 7, [t2], { id: t4, assignee: 'u2' }),
        task('Marketing & promotion plan', d(8), 10, [t1], { id: t5, assignee: 'u6' }),
        task('Sponsorship & partnerships', d(8), 12, [t1], { id: t6, assignee: 'u5' }),
        task('AV & technical setup', d(18), 5, [t2], { id: t7, assignee: 'u3' }),
        task('Catering & logistics', d(18), 5, [t2], { id: t8, assignee: 'u5' }),
        task('Rehearsal & run-through', d(25), 1, [t3, t7, t8], { id: t9, priority: 'high', assignee: 'u5' }),
        task('Post-event follow-up & survey', d(26), 5, [t9], { id: t10, assignee: 'u6' }),
      ];
    },
  },
];
