import { TODAY } from './helpers';
import type { TeamMember, Project, Task, FileItem, RaidItem, Tag, Comment, TimeLog } from './types';

/* ---------------------------------- team ---------------------------------- */
export const TEAM: TeamMember[] = [
  { id: "u1", name: "Ada Coker", role: "Product Designer", color: "#FE8029" },
  { id: "u2", name: "Tunde Bakare", role: "Frontend Engineer", color: "#0891B2" },
  { id: "u3", name: "Ngozi Eze", role: "Backend Engineer", color: "#D97706" },
  { id: "u4", name: "Segun Adebayo", role: "QA Engineer", color: "#DC2626" },
  { id: "u5", name: "Wale Johnson", role: "Project Manager", color: "#16A34A" },
  { id: "u6", name: "Fatima Bello", role: "Content Strategist", color: "#7C3AED" },
  { id: "u7", name: "Chidi Okafor", role: "DevOps Engineer", color: "#DB2777" },
];
export const teamById: Record<string, TeamMember> = Object.fromEntries(TEAM.map(t => [t.id, t]));

/** Current user for My Tasks view and comment authoring */
export const CURRENT_USER_ID = 'u5';

/* ---------------------------------- projects ---------------------------------- */
export const INITIAL_PROJECTS: Record<string, Project> = {
  p1: { id: "p1", name: "Website Relaunch", color: "#FE8029", start: "2026-07-01", end: "2026-09-04", description: "Complete overhaul of corporate website with new design system, CMS integration, and performance optimization. Target: lighthouse score ≥ 90.", members: ["u1", "u2", "u3", "u4", "u5", "u6", "u7"], isFavorite: true },
  p2: { id: "p2", name: "Mobile App Launch", color: "#0891B2", start: "2026-08-03", end: "2026-10-16", description: "Build and launch native iOS and Android apps with authentication, push notifications, and offline mode.", members: ["u1", "u2", "u3", "u5"], isFavorite: false },
};

/* ---------------------------------- tags ---------------------------------- */
export const INITIAL_TAGS: Record<string, Tag[]> = {
  p1: [
    { id: "tag1", name: "Design", color: "#FE8029" },
    { id: "tag2", name: "Content", color: "#7C3AED" },
    { id: "tag3", name: "Engineering", color: "#0891B2" },
    { id: "tag4", name: "QA", color: "#DC2626" },
    { id: "tag5", name: "Infrastructure", color: "#D97706" },
  ],
  p2: [
    { id: "tag6", name: "Design", color: "#FE8029" },
    { id: "tag7", name: "iOS", color: "#0891B2" },
    { id: "tag8", name: "Android", color: "#16A34A" },
    { id: "tag9", name: "Backend", color: "#D97706" },
  ],
};

/* ---------------------------------- tasks ---------------------------------- */
export const initialTasks: Record<string, Task[]> = {
  p1: [
    { id: "t1", projectId: "p1", name: "Stakeholder discovery interviews", description: "Conduct 1-on-1 interviews with key stakeholders to understand business goals, pain points, and expectations for the website relaunch. Document findings in a shared brief.", status: "done", assignee: "u5", start: "2026-07-01", duration: 5, dueDate: "2026-07-06", progress: 100, priority: "medium", deps: [], tags: ["tag2"], createdAt: "2026-06-28" },
    { id: "t2", projectId: "p1", name: "Competitive audit", description: "Review 8\u201310 competitor and aspirational websites. Analyze UX patterns, content strategy, visual design, and performance benchmarks. Create a comparison matrix.", status: "done", assignee: "u1", start: "2026-07-01", duration: 4, dueDate: "2026-07-05", progress: 100, priority: "low", deps: [], tags: ["tag1"], createdAt: "2026-06-28" },
    { id: "t3", projectId: "p1", name: "Information architecture", description: "Define the site map, primary navigation structure, and content hierarchy. Produce wireframe-level IA documentation and validate with stakeholders.", status: "done", assignee: "u1", start: "2026-07-06", duration: 6, dueDate: "2026-07-12", progress: 100, priority: "high", deps: ["t1", "t2"], tags: ["tag1"], createdAt: "2026-07-01" },
    { id: "t4", projectId: "p1", name: "Content inventory & copywriting", description: "Audit all existing website content, identify gaps, and draft new copy for key pages including Homepage, About, Services, and Contact.", status: "in_progress", assignee: "u6", start: "2026-07-08", duration: 10, dueDate: "2026-07-18", progress: 60, priority: "medium", deps: ["t2"], tags: ["tag2"], createdAt: "2026-07-03" },
    { id: "t5", projectId: "p1", name: "Homepage wireframes", description: "Create low-fidelity wireframes for the homepage hero, feature sections, testimonials, and CTA blocks. Iterate based on internal review feedback.", status: "done", assignee: "u1", start: "2026-07-13", duration: 5, dueDate: "2026-07-18", progress: 100, priority: "high", deps: ["t3"], tags: ["tag1"], createdAt: "2026-07-06" },
    { id: "t6", projectId: "p1", name: "Visual design system", description: "Build a comprehensive design system including color tokens, typography scale, spacing system, component variants, and interaction guidelines.", status: "in_progress", assignee: "u1", start: "2026-07-18", duration: 9, dueDate: "2026-07-27", progress: 70, priority: "urgent", deps: ["t5"], tags: ["tag1"], createdAt: "2026-07-10" },
    { id: "t6a", projectId: "p1", name: "Color tokens & palette", description: "Define primary, secondary, neutral, and semantic color tokens with light/dark variants.", status: "done", assignee: "u1", start: "2026-07-18", duration: 2, dueDate: "2026-07-20", progress: 100, priority: "high", deps: [], parentId: "t6", tags: ["tag1"], createdAt: "2026-07-15" },
    { id: "t6b", projectId: "p1", name: "Typography scale", description: "Establish type scale (h1\u2013h6, body, caption) with font weights and line heights.", status: "done", assignee: "u1", start: "2026-07-20", duration: 2, dueDate: "2026-07-22", progress: 100, priority: "high", deps: [], parentId: "t6", tags: ["tag1"], createdAt: "2026-07-17" },
    { id: "t6c", projectId: "p1", name: "Component variants", description: "Design button, input, card, and modal variants with all interactive states.", status: "in_progress", assignee: "u1", start: "2026-07-22", duration: 4, dueDate: "2026-07-26", progress: 40, priority: "high", deps: ["t6a", "t6b"], parentId: "t6", tags: ["tag1"], createdAt: "2026-07-19" },
    { id: "t7", projectId: "p1", name: "Design review with stakeholders", description: "Present the visual design system and key page mockups to stakeholders. Collect feedback, document decisions, and plan revision cycle.", status: "in_progress", assignee: "u5", start: "2026-07-24", duration: 3, dueDate: "2026-07-27", progress: 40, priority: "high", deps: ["t6"], createdAt: "2026-07-18" },
    { id: "t8", projectId: "p1", name: "Component library build", description: "Implement the approved design system as reusable UI components: buttons, inputs, cards, modals, navigation, and data display elements.", status: "backlog", assignee: "u2", start: "2026-07-29", duration: 10, dueDate: "2026-08-08", progress: 0, priority: "high", deps: ["t6"], tags: ["tag3"], createdAt: "2026-07-20" },
    { id: "t8a", projectId: "p1", name: "Primitives (Button, Input, Select)", description: "Build foundational form and action components with all variants.", status: "backlog", assignee: "u2", start: "2026-07-29", duration: 4, dueDate: "2026-08-02", progress: 0, priority: "high", deps: [], parentId: "t8", tags: ["tag3"], createdAt: "2026-07-21" },
    { id: "t8b", projectId: "p1", name: "Layout components (Card, Modal, Sheet)", description: "Build container and overlay components.", status: "backlog", assignee: "u2", start: "2026-08-02", duration: 3, dueDate: "2026-08-05", progress: 0, priority: "medium", deps: ["t8a"], parentId: "t8", tags: ["tag3"], createdAt: "2026-07-22" },
    { id: "t8c", projectId: "p1", name: "Data display (Table, Badge, Tooltip)", description: "Build data presentation components.", status: "backlog", assignee: "u2", start: "2026-08-05", duration: 3, dueDate: "2026-08-08", progress: 0, priority: "medium", deps: ["t8a"], parentId: "t8", tags: ["tag3"], createdAt: "2026-07-23" },
    { id: "t9", projectId: "p1", name: "Homepage front-end build", description: "Build the responsive homepage using the component library. Includes hero section, feature grid, testimonials carousel, and footer.", status: "backlog", assignee: "u2", start: "2026-08-05", duration: 8, dueDate: "2026-08-13", progress: 0, priority: "high", deps: ["t8"], tags: ["tag3"], createdAt: "2026-07-24" },
    { id: "t9a", projectId: "p1", name: "Hero section", description: "Build responsive hero with heading, subtext, CTA buttons, and background.", status: "backlog", assignee: "u2", start: "2026-08-05", duration: 3, dueDate: "2026-08-08", progress: 0, priority: "high", deps: [], parentId: "t9", tags: ["tag3"], createdAt: "2026-07-25" },
    { id: "t9b", projectId: "p1", name: "Feature grid & testimonials", description: "Build the features grid and testimonial carousel sections.", status: "backlog", assignee: "u2", start: "2026-08-08", duration: 3, dueDate: "2026-08-11", progress: 0, priority: "medium", deps: ["t9a"], parentId: "t9", tags: ["tag3"], createdAt: "2026-07-26" },
    { id: "t9c", projectId: "p1", name: "Footer & global layout", description: "Build footer links, newsletter signup, and page wrapper.", status: "backlog", assignee: "u2", start: "2026-08-11", duration: 2, dueDate: "2026-08-13", progress: 0, priority: "low", deps: [], parentId: "t9", tags: ["tag3"], createdAt: "2026-07-27" },
    { id: "t10", projectId: "p1", name: "CMS integration", description: "Integrate the headless CMS for dynamic content: blog posts, case studies, and team profiles. Set up content models and preview functionality.", status: "backlog", assignee: "u3", start: "2026-08-05", duration: 9, dueDate: "2026-08-14", progress: 0, priority: "medium", deps: ["t8"], tags: ["tag3", "tag5"], createdAt: "2026-07-28" },
    { id: "t11", projectId: "p1", name: "Interior page templates", description: "Build reusable page templates for About, Services, Case Studies, and Contact pages using the component library and CMS data.", status: "backlog", assignee: "u2", start: "2026-08-13", duration: 7, dueDate: "2026-08-20", progress: 0, priority: "medium", deps: ["t9"], tags: ["tag3", "tag2"], createdAt: "2026-07-29" },
    { id: "t12", projectId: "p1", name: "Performance & SEO pass", description: "Optimize Core Web Vitals (LCP, FID, CLS), implement structured data, meta tags, Open Graph, XML sitemap, and ensure lighthouse score \u2265 90.", status: "backlog", assignee: "u3", start: "2026-08-20", duration: 5, dueDate: "2026-08-25", progress: 0, priority: "medium", deps: ["t10", "t11"], tags: ["tag3", "tag5"], createdAt: "2026-07-30" },
    { id: "t13", projectId: "p1", name: "QA & cross-browser testing", description: "Execute full QA across Chrome, Firefox, Safari, Edge, and mobile devices. Test responsive layouts, form submissions, accessibility (WCAG 2.1 AA), and integrations.", status: "backlog", assignee: "u4", start: "2026-08-25", duration: 6, dueDate: "2026-08-31", progress: 0, priority: "urgent", deps: ["t12"], tags: ["tag4"], createdAt: "2026-07-31" },
    { id: "t13a", projectId: "p1", name: "Functional testing", description: "Test all user flows: navigation, forms, CMS content rendering, search.", status: "backlog", assignee: "u4", start: "2026-08-25", duration: 2, dueDate: "2026-08-27", progress: 0, priority: "high", deps: [], parentId: "t13", tags: ["tag4"], createdAt: "2026-08-01" },
    { id: "t13b", projectId: "p1", name: "Cross-browser & accessibility", description: "Verify rendering on Chrome, Firefox, Safari, Edge. Run WCAG 2.1 AA audit.", status: "backlog", assignee: "u4", start: "2026-08-27", duration: 3, dueDate: "2026-08-30", progress: 0, priority: "high", deps: ["t13a"], parentId: "t13", tags: ["tag4"], createdAt: "2026-08-02" },
    { id: "t14", projectId: "p1", name: "Staging sign-off", description: "Deploy to staging environment, run final stakeholder walkthrough, and obtain written sign-off on all deliverables before production release.", status: "backlog", assignee: "u5", start: "2026-08-31", duration: 2, dueDate: "2026-09-02", progress: 0, priority: "high", deps: ["t13"], createdAt: "2026-08-03" },
    { id: "t15", projectId: "p1", name: "Production launch", description: "Deploy to production, configure DNS, set up CDN, verify SSL, test live site functionality, and prepare rollback plan.", status: "backlog", assignee: "u7", start: "2026-09-02", duration: 2, dueDate: "2026-09-04", progress: 0, priority: "urgent", deps: ["t14"], tags: ["tag5"], createdAt: "2026-08-04" },
    { id: "t16", projectId: "p1", name: "Post-launch monitoring", description: "Monitor site uptime, performance metrics, error rates, and user analytics for the first 72 hours. Triage and hotfix any critical issues.", status: "backlog", assignee: "u7", start: "2026-09-04", duration: 3, dueDate: "2026-09-07", progress: 0, priority: "medium", deps: ["t15"], tags: ["tag5"], createdAt: "2026-08-05" },
  ],
  p2: [
    { id: "m1", projectId: "p2", name: "Define MVP feature set", description: "Collaborate with product, design, and engineering to define the minimum viable feature set. Prioritize using RICE scoring and align with business KPIs.", status: "in_progress", assignee: "u5", start: "2026-08-03", duration: 6, dueDate: "2026-08-09", progress: 35, priority: "high", deps: [], createdAt: "2026-08-01" },
    { id: "m2", projectId: "p2", name: "Native app UX flows", description: "Design end-to-end user flows for the mobile app including onboarding, core feature interactions, notifications, and settings. Produce Figma prototypes for usability testing.", status: "backlog", assignee: "u1", start: "2026-08-10", duration: 8, dueDate: "2026-08-18", progress: 0, priority: "high", deps: ["m1"], tags: ["tag6"], createdAt: "2026-08-02" },
    { id: "m2a", projectId: "p2", name: "Onboarding flow", description: "Design the welcome, sign-up, and first-run experience screens.", status: "backlog", assignee: "u1", start: "2026-08-10", duration: 3, dueDate: "2026-08-13", progress: 0, priority: "high", deps: [], parentId: "m2", tags: ["tag6"], createdAt: "2026-08-03" },
    { id: "m2b", projectId: "p2", name: "Core feature screens", description: "Design the primary app screens for the MVP feature set.", status: "backlog", assignee: "u1", start: "2026-08-13", duration: 3, dueDate: "2026-08-16", progress: 0, priority: "high", deps: ["m2a"], parentId: "m2", tags: ["tag6"], createdAt: "2026-08-04" },
    { id: "m3", projectId: "p2", name: "iOS build setup", description: "Initialize the Xcode project, configure code signing, set up CI/CD with Fastlane, integrate navigation library, and establish the base app architecture.", status: "backlog", assignee: "u2", start: "2026-08-19", duration: 5, dueDate: "2026-08-24", progress: 0, priority: "medium", deps: ["m2"], tags: ["tag7"], createdAt: "2026-08-05" },
    { id: "m4", projectId: "p2", name: "Android build setup", description: "Initialize the Android Studio project, configure Gradle, set up CI/CD with GitHub Actions, integrate Jetpack Navigation, and establish the base app architecture.", status: "backlog", assignee: "u3", start: "2026-08-19", duration: 5, dueDate: "2026-08-24", progress: 0, priority: "medium", deps: ["m2"], tags: ["tag8"], createdAt: "2026-08-06" },
    { id: "m5", projectId: "p2", name: "Push notification service", description: "Build a cross-platform push notification service using Firebase Cloud Messaging. Support topic-based and user-targeted notifications with deep linking.", status: "backlog", assignee: "u3", start: "2026-08-26", duration: 6, dueDate: "2026-09-01", progress: 0, priority: "medium", deps: ["m4"], tags: ["tag9"], createdAt: "2026-08-07" },
    { id: "m6", projectId: "p2", name: "App store submission", description: "Prepare App Store and Play Store listings: screenshots, descriptions, privacy policies, and content ratings. Submit for review and manage approval process.", status: "backlog", assignee: "u5", start: "2026-10-05", duration: 4, dueDate: "2026-10-09", progress: 0, priority: "urgent", deps: ["m3", "m4"], createdAt: "2026-08-08" },
  ],
};

/* ---------------------------------- comments ---------------------------------- */
export const initialComments: Record<string, Comment[]> = {
  p1: [
    { id: "c1", taskId: "t1", authorId: "u5", text: "Completed 6 stakeholder interviews. Key themes: mobile-first is critical, accessibility is non-negotiable, and the current site\u2019s navigation is confusing for first-time visitors.", createdAt: "2026-07-05T14:30:00" },
    { id: "c2", taskId: "t1", authorId: "u1", text: "Great findings! The mobile-first insight aligns with our analytics data \u2014 68% of traffic comes from mobile devices.", createdAt: "2026-07-05T15:45:00" },
    { id: "c3", taskId: "t6", authorId: "u1", text: "Color tokens are finalized. Moving on to typography scale tomorrow.", createdAt: "2026-07-20T11:00:00" },
    { id: "c4", taskId: "t6", authorId: "u5", text: "Can we review the component variants together on Thursday? I want to make sure they align with the stakeholder feedback from the wireframe review.", createdAt: "2026-07-22T09:15:00" },
    { id: "c5", taskId: "t4", authorId: "u6", text: "Draft copy for Homepage and About page is ready for review. Still working on Services and Contact.", createdAt: "2026-07-14T16:00:00" },
    { id: "c6", taskId: "t4", authorId: "u5", text: "Looks solid! Can you add a stronger CTA on the homepage hero section? The current one feels a bit passive.", createdAt: "2026-07-14T17:20:00" },
    { id: "c7", taskId: "t7", authorId: "u5", text: "Stakeholder review scheduled for Friday at 2pm. Please have the design system presentation deck ready by Thursday EOD.", createdAt: "2026-07-23T10:00:00" },
  ],
  p2: [
    { id: "c8", taskId: "m1", authorId: "u5", text: "Initial RICE scoring done. Top 3 features: user authentication, push notifications, and offline mode. Need to validate with engineering on feasibility.", createdAt: "2026-08-06T14:00:00" },
    { id: "c9", taskId: "m1", authorId: "u2", text: "Push notifications and offline mode are both feasible within the timeline. Auth might need a phased approach depending on the provider we choose.", createdAt: "2026-08-06T16:30:00" },
  ],
};

/* ---------------------------------- files ---------------------------------- */
export const initialFiles: Record<string, FileItem[]> = {
  p1: [
    { id: "f1", projectId: "p1", name: "Brand-Guidelines.pdf", size: 2400000, uploadedBy: "u1", uploadedAt: "2026-07-05", linkedTaskId: "t6", thumbnailUrl: "/thumbnails/pdf-brand-guidelines.png" },
    { id: "f2", projectId: "p1", name: "Homepage-Wireframes.fig", size: 5100000, uploadedBy: "u1", uploadedAt: "2026-07-14", linkedTaskId: "t5", thumbnailUrl: "/thumbnails/fig-wireframes.png" },
    { id: "f3", projectId: "p1", name: "Content-Audit.xlsx", size: 340000, uploadedBy: "u6", uploadedAt: "2026-07-09", linkedTaskId: "t4", thumbnailUrl: "/thumbnails/xlsx-audit.png" },
    { id: "f4", projectId: "p1", name: "Stakeholder-Interview-Notes.docx", size: 210000, uploadedBy: "u5", uploadedAt: "2026-07-02", linkedTaskId: "t1", thumbnailUrl: "/thumbnails/docx-notes.png" },
    { id: "f6", projectId: "p1", name: "Design-System.fig", size: 8700000, uploadedBy: "u1", uploadedAt: "2026-07-20", linkedTaskId: "t6", thumbnailUrl: "/thumbnails/fig-design-system.png" },
    { id: "f7", projectId: "p1", name: "IA-Sitemap.fig", size: 1200000, uploadedBy: "u1", uploadedAt: "2026-07-07", linkedTaskId: "t3", thumbnailUrl: "/thumbnails/fig-sitemap.png" },
    { id: "f8", projectId: "p1", name: "Homepage-Mockup.png", size: 3200000, uploadedBy: "u2", uploadedAt: "2026-08-08", linkedTaskId: "t9", thumbnailUrl: "/thumbnails/png-homepage-mockup.png" },
    { id: "f9", projectId: "p1", name: "QA-Checklist.xlsx", size: 180000, uploadedBy: "u4", uploadedAt: "2026-08-25", linkedTaskId: "t13", thumbnailUrl: "/thumbnails/xlsx-qa-checklist.png" },
  ],
  p2: [
    { id: "f5", projectId: "p2", name: "MVP-Feature-Spec.docx", size: 180000, uploadedBy: "u5", uploadedAt: "2026-08-04", linkedTaskId: "m1", thumbnailUrl: "/thumbnails/docx-mvp-spec.png" },
  ],
};
/* ---------------------------------- RAID ---------------------------------- */
export const initialRaid: Record<string, RaidItem[]> = {
  p1: [
    { id: "r1", type: "risk", description: "Vendor delay on CMS licensing could push dev start", owner: "u3", impact: "high", status: "open", dateRaised: "2026-07-10" },
    { id: "r2", type: "issue", description: "Legacy homepage analytics tracking is undocumented", owner: "u2", impact: "medium", status: "open", dateRaised: "2026-07-15" },
    { id: "r3", type: "assumption", description: "Client supplies final brand photography by Aug 1", owner: "u5", impact: "medium", status: "open", dateRaised: "2026-07-08" },
    { id: "r4", type: "dependency", description: "Design system sign-off required before component build starts", owner: "u1", impact: "high", status: "mitigated", dateRaised: "2026-07-12" },
    { id: "r5", type: "risk", description: "QA window may compress if design review overruns", owner: "u4", impact: "medium", status: "open", dateRaised: "2026-07-20" },
  ],
  p2: [
    { id: "r6", type: "assumption", description: "App store review turnaround assumed at 3-5 days", owner: "u5", impact: "low", status: "open", dateRaised: "2026-08-05" },
  ],
};

/* ---------------------------------- time logs ---------------------------------- */
export const initialTimeLogs: Record<string, TimeLog[]> = {
  p1: [
    { id: "tl1", taskId: "t1", userId: "u5", minutes: 240, note: "Stakeholder interviews", loggedAt: "2026-07-03T10:00:00" },
    { id: "tl2", taskId: "t1", userId: "u5", minutes: 180, note: "Interview synthesis", loggedAt: "2026-07-04T14:00:00" },
    { id: "tl3", taskId: "t2", userId: "u1", minutes: 300, note: "Competitive analysis", loggedAt: "2026-07-02T09:00:00" },
    { id: "tl4", taskId: "t4", userId: "u6", minutes: 420, note: "Copywriting draft", loggedAt: "2026-07-10T11:00:00" },
    { id: "tl5", taskId: "t6", userId: "u1", minutes: 360, note: "Design system colors & tokens", loggedAt: "2026-07-18T09:00:00" },
    { id: "tl6", taskId: "t6", userId: "u1", minutes: 240, note: "Typography scale work", loggedAt: "2026-07-20T10:00:00" },
    { id: "tl7", taskId: "t6c", userId: "u1", minutes: 180, note: "Component variants WIP", loggedAt: "2026-07-22T13:00:00" },
    { id: "tl8", taskId: "t7", userId: "u5", minutes: 120, note: "Review preparation", loggedAt: "2026-07-24T09:00:00" },
  ],
  p2: [
    { id: "tl9", taskId: "m1", userId: "u5", minutes: 180, note: "RICE scoring workshop", loggedAt: "2026-08-04T10:00:00" },
    { id: "tl10", taskId: "m1", userId: "u5", minutes: 90, note: "Feature prioritization review", loggedAt: "2026-08-06T14:00:00" },
  ],
};

/* ---------------------------------- capacity (hours/week per member) ---------------------------------- */
export const MEMBER_CAPACITY: Record<string, number> = {
  u1: 40, u2: 40, u3: 40, u4: 40, u5: 40, u6: 30, u7: 40,
};