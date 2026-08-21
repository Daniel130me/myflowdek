import type { SkillCategory } from '@prisma/client';

export const PROFESSIONAL_ROLES = [
  'Backend Engineer',
  'Frontend Engineer',
  'Full-Stack Engineer',
  'UI/UX Designer',
  'Product Designer',
  'Project Manager',
  'DevOps Engineer',
  'Cloud Engineer',
  'Data Analyst',
  'QA Engineer',
  'Cybersecurity Specialist',
  'Technical Writer',
  'Digital Marketer',
  'Business Analyst',
] as const;

export const PROFESSIONAL_SKILLS: ReadonlyArray<{
  name: string;
  category: SkillCategory;
}> = [
  { name: 'JavaScript', category: 'SOFTWARE_DEVELOPMENT' },
  { name: 'TypeScript', category: 'SOFTWARE_DEVELOPMENT' },
  { name: 'React', category: 'SOFTWARE_DEVELOPMENT' },
  { name: 'Next.js', category: 'SOFTWARE_DEVELOPMENT' },
  { name: 'Node.js', category: 'SOFTWARE_DEVELOPMENT' },
  { name: 'Python', category: 'SOFTWARE_DEVELOPMENT' },
  { name: 'PostgreSQL', category: 'SOFTWARE_DEVELOPMENT' },
  { name: 'API Design', category: 'SOFTWARE_DEVELOPMENT' },
  { name: 'User Research', category: 'DESIGN' },
  { name: 'Interaction Design', category: 'DESIGN' },
  { name: 'Prototyping', category: 'DESIGN' },
  { name: 'Design Systems', category: 'DESIGN' },
  { name: 'Agile Delivery', category: 'PROJECT_MANAGEMENT' },
  { name: 'Risk Management', category: 'PROJECT_MANAGEMENT' },
  { name: 'Stakeholder Management', category: 'PROJECT_MANAGEMENT' },
  { name: 'AWS', category: 'CLOUD_DEVOPS' },
  { name: 'Google Cloud', category: 'CLOUD_DEVOPS' },
  { name: 'Docker', category: 'CLOUD_DEVOPS' },
  { name: 'CI/CD', category: 'CLOUD_DEVOPS' },
  { name: 'Data Visualization', category: 'DATA' },
  { name: 'SQL Analytics', category: 'DATA' },
  { name: 'Search Engine Optimization', category: 'MARKETING' },
  { name: 'Content Strategy', category: 'MARKETING' },
  { name: 'Requirements Analysis', category: 'BUSINESS' },
  { name: 'Process Mapping', category: 'BUSINESS' },
  { name: 'Technical Documentation', category: 'WRITING' },
  { name: 'Test Automation', category: 'QUALITY_ASSURANCE' },
  { name: 'Manual Testing', category: 'QUALITY_ASSURANCE' },
  { name: 'Application Security', category: 'SECURITY' },
  { name: 'Cloud Security', category: 'SECURITY' },
];

export function toTaxonomySlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
