import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { requireProjectCapability } from '@/server/auth/authorization';
import {
  createProjectDocumentFromTemplate,
  listProjectDocuments,
  removeProjectDocumentReference,
} from '../project-document.service';
import { getDocumentTemplate, listDocumentTemplates } from '../template.service';
import { seedDocumentTemplates } from '../template-seed.service';
import type { IDocumentProviderAdapter } from '../providers';

const prisma = new PrismaClient();
const runId = Date.now().toString(36);
const workspaceSlug = `documents-test-${runId}`;
let ownerId = '';
let outsiderId = '';
let projectId = '';
let templateId = '';

const provider: IDocumentProviderAdapter = {
  provider: 'GOOGLE_DRIVE',
  async createDocument(_connection, input) {
    return { providerFileId: `doc-${runId}`, providerWebUrl: `https://docs.google.com/document/d/doc-${runId}/edit`, mimeType: 'application/vnd.google-apps.document' };
  },
  async createSpreadsheet(_connection, input) {
    return { providerFileId: `sheet-${runId}`, providerWebUrl: `https://docs.google.com/spreadsheets/d/sheet-${runId}/edit`, mimeType: 'application/vnd.google-apps.spreadsheet' };
  },
};

before(async () => {
  const owner = await prisma.user.create({ data: { email: `documents-owner-${runId}@flowdek.test`, name: 'Documents Owner', passwordHash: 'hash' } });
  const outsider = await prisma.user.create({ data: { email: `documents-outsider-${runId}@flowdek.test`, name: 'Outsider', passwordHash: 'hash' } });
  ownerId = owner.id; outsiderId = outsider.id;
  const workspace = await prisma.workspace.create({ data: { name: 'Documents Test', slug: workspaceSlug, members: { create: { userId: owner.id, role: 'OWNER' } } } });
  const project = await prisma.project.create({ data: { name: 'Website Redesign', description: 'Modernize the customer experience', ownerId: owner.id, workspaceId: workspace.id, members: { create: { userId: owner.id, role: 'OWNER' } } } });
  projectId = project.id;
  await prisma.storageConnection.create({ data: { userId: owner.id, provider: 'GOOGLE_DRIVE', providerEmail: owner.email, encryptedAccessToken: 'not-used-by-injected-provider' } });
  await seedDocumentTemplates();
  templateId = (await prisma.documentTemplate.findUniqueOrThrow({ where: { slug: 'project-charter' }, select: { id: true } })).id;
});

after(async () => {
  await prisma.workspace.deleteMany({ where: { slug: workspaceSlug } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, outsiderId].filter(Boolean) } } });
  await prisma.$disconnect();
});

describe('template queries and idempotent seed', () => {
  test('lists and filters published templates by phase', async () => {
    const all = await listDocumentTemplates();
    const initiation = await listDocumentTemplates({ phase: 'INITIATION' });
    assert.equal(all.length, 36);
    assert.ok(initiation.length > 0);
    assert.ok(initiation.every((item) => item.phase === 'INITIATION'));
  });

  test('retrieves a template by stable slug or id', async () => {
    const bySlug = await getDocumentTemplate('project-charter');
    const byId = await getDocumentTemplate(bySlug.id);
    assert.equal(bySlug.id, byId.id);
    assert.equal(bySlug.name, 'Project Charter');
  });

  test('seeding twice updates in place without duplicates', async () => {
    const beforeCount = await prisma.documentTemplate.count();
    assert.equal(await seedDocumentTemplates(), 36);
    assert.equal(await seedDocumentTemplates(), 36);
    assert.equal(await prisma.documentTemplate.count(), beforeCount);
  });
});

describe('project document lifecycle', () => {
  test('creates a provider-native document and persists metadata only', async () => {
    const document = await createProjectDocumentFromTemplate(projectId, ownerId, { templateId }, () => provider);
    assert.equal(document.providerWebUrl, `https://docs.google.com/document/d/doc-${runId}/edit`);
    const persisted = await prisma.projectDocument.findUniqueOrThrow({ where: { id: document.id } });
    assert.equal(persisted.projectId, projectId);
    assert.equal(persisted.providerFileId, `doc-${runId}`);
    assert.equal(persisted.storageProvider, 'GOOGLE_DRIVE');
    assert.equal((persisted as Record<string, unknown>).content, undefined);
    assert.equal((await listProjectDocuments(projectId))[0]?.id, document.id);
  });

  test('removes only the Flowdek reference', async () => {
    const document = await createProjectDocumentFromTemplate(projectId, ownerId, { templateId, name: 'Removable Charter' }, () => provider);
    await removeProjectDocumentReference(projectId, document.id, ownerId, 'OWNER');
    assert.equal(await prisma.projectDocument.findUnique({ where: { id: document.id } }), null);
  });

  test('rejects creation when the caller has no connected Google Drive', async () => {
    await assert.rejects(
      () => createProjectDocumentFromTemplate(projectId, outsiderId, { templateId }, () => provider),
      /Connect Google Drive/,
    );
  });

  test('does not persist a reference when provider creation fails', async () => {
    const countBefore = await prisma.projectDocument.count({ where: { projectId } });
    const failingProvider: IDocumentProviderAdapter = {
      ...provider,
      async createDocument() { throw new Error('Google API unavailable'); },
    };
    await assert.rejects(() => createProjectDocumentFromTemplate(projectId, ownerId, { templateId }, () => failingProvider), /Google API unavailable/);
    assert.equal(await prisma.projectDocument.count({ where: { projectId } }), countBefore);
  });

  test('project authorization blocks a non-member', async () => {
    await assert.rejects(() => requireProjectCapability(outsiderId, projectId, 'VIEW_PROJECT'), /do not have access/i);
  });
});