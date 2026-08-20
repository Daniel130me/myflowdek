import type { ProjectRole } from '@prisma/client';
import { db } from '@/server/db/client';
import { AuthError } from '@/server/auth/authorization';
import { audit } from '@/server/audit/log';
import { getFileProviderAdapter } from '@/server/storage/providers';
import { getDocumentProviderAdapter } from './providers';
import type { IDocumentProviderAdapter } from './providers';
import type { GoogleDocumentContent, GoogleSheetContent, StructuredTemplateContent } from './types';
import { resolveTemplateVariables } from './template-resolver';
import type { CreateProjectDocumentInput } from './schemas';

const managerRoles: ProjectRole[] = ['OWNER', 'ADMIN'];

const documentSelect = {
  id: true,
  projectId: true,
  name: true,
  storageProvider: true,
  storageConnectionId: true,
  providerFileId: true,
  providerWebUrl: true,
  mimeType: true,
  thumbnailUrl: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, email: true, avatarColor: true } },
  template: {
    select: { id: true, slug: true, name: true, phase: true, documentType: true },
  },
} as const;

export function listProjectDocuments(projectId: string) {
  return db.projectDocument.findMany({
    where: { projectId },
    select: documentSelect,
    orderBy: { createdAt: 'desc' },
  });
}

function isSheetContent(content: StructuredTemplateContent): content is GoogleSheetContent {
  return 'sheets' in content;
}

function isDocumentContent(content: StructuredTemplateContent): content is GoogleDocumentContent {
  return 'sections' in content;
}

export type DocumentProviderFactory = (provider: 'GOOGLE_DRIVE') => IDocumentProviderAdapter;

/** Create a provider-native document, then persist metadata only after success. */
export async function createProjectDocumentFromTemplate(
  projectId: string,
  userId: string,
  input: CreateProjectDocumentInput,
  providerFactory: DocumentProviderFactory = getDocumentProviderAdapter,
) {
  const [project, template, connection] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      select: {
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        workspace: { select: { name: true } },
        owner: { select: { name: true, email: true } },
      },
    }),
    db.documentTemplate.findFirst({
      where: { id: input.templateId, isPublished: true },
      select: { id: true, name: true, documentType: true, content: true },
    }),
    db.storageConnection.findUnique({
      where: { userId_provider: { userId, provider: 'GOOGLE_DRIVE' } },
    }),
  ]);

  if (!project) throw new AuthError('Project not found', 404);
  if (!template) throw new AuthError('Document template not found', 404);
  if (!connection) {
    throw new AuthError('Connect Google Drive to create this document.', 409);
  }

  const resolvedContent = resolveTemplateVariables(
    template.content as unknown as StructuredTemplateContent,
    {
      project: {
        name: project.name,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        manager: project.owner,
      },
      workspace: project.workspace,
    },
  );
  const name = input.name?.trim() || `${template.name} - ${project.name}`;
  const provider = providerFactory('GOOGLE_DRIVE');

  let created;
  if (template.documentType === 'GOOGLE_SHEET') {
    if (!isSheetContent(resolvedContent)) throw new AuthError('Spreadsheet template content is invalid', 500);
    created = await provider.createSpreadsheet(connection, { name, content: resolvedContent });
  } else {
    if (!isDocumentContent(resolvedContent)) throw new AuthError('Document template content is invalid', 500);
    created = await provider.createDocument(connection, { name, content: resolvedContent });
  }

  const document = await db.projectDocument.create({
    data: {
      projectId,
      templateId: template.id,
      createdById: userId,
      name,
      storageProvider: 'GOOGLE_DRIVE',
      storageConnectionId: connection.id,
      providerFileId: created.providerFileId,
      providerWebUrl: created.providerWebUrl,
      mimeType: created.mimeType,
      thumbnailUrl: created.thumbnailUrl ?? null,
    },
    select: documentSelect,
  });

  await audit({
    userId,
    action: 'project_document_created',
    meta: { projectId, projectDocumentId: document.id, templateId: template.id },
  });
  return document;
}

function canManageDocument(createdById: string, userId: string, role: ProjectRole): boolean {
  return createdById === userId || managerRoles.includes(role);
}

export async function renameProjectDocumentReference(
  projectId: string,
  documentId: string,
  userId: string,
  role: ProjectRole,
  name: string,
) {
  const document = await db.projectDocument.findFirst({
    where: { id: documentId, projectId },
    select: { id: true, createdById: true },
  });
  if (!document) throw new AuthError('Project document not found', 404);
  if (!canManageDocument(document.createdById, userId, role)) {
    throw new AuthError('You can only rename documents you created', 403);
  }
  return db.projectDocument.update({
    where: { id: document.id },
    data: { name },
    select: documentSelect,
  });
}

/** Remove only Flowdek metadata; the provider file is intentionally untouched. */
export async function removeProjectDocumentReference(
  projectId: string,
  documentId: string,
  userId: string,
  role: ProjectRole,
) {
  const document = await db.projectDocument.findFirst({
    where: { id: documentId, projectId },
    select: { id: true, createdById: true, providerFileId: true },
  });
  if (!document) throw new AuthError('Project document not found', 404);
  if (!canManageDocument(document.createdById, userId, role)) {
    throw new AuthError('You can only remove documents you created', 403);
  }

  await db.projectDocument.delete({ where: { id: document.id } });
  await audit({
    userId,
    action: 'project_document_reference_removed',
    meta: { projectId, projectDocumentId: document.id, providerFileId: document.providerFileId },
  });
}

export async function shareProjectDocument(
  projectId: string,
  documentId: string,
  userId: string,
  role: ProjectRole,
  targetEmail: string,
  permissionRole: 'reader' | 'writer',
) {
  const document = await db.projectDocument.findFirst({
    where: { id: documentId, projectId },
    select: {
      createdById: true,
      storageProvider: true,
      providerFileId: true,
      project: { select: { workspaceId: true } },
    },
  });
  if (!document) throw new AuthError('Project document not found', 404);
  if (!canManageDocument(document.createdById, userId, role)) {
    throw new AuthError('Only the document creator or a project manager can share it', 403);
  }

  const email = targetEmail.toLowerCase();
  const recipient = await db.user.findFirst({
    where: {
      email,
      OR: [
        { memberships: { some: { projectId } } },
        { workspaces: { some: { workspaceId: document.project.workspaceId } } },
      ],
    },
    select: { id: true },
  });
  if (!recipient) {
    throw new AuthError('The recipient must be a member of this project or workspace', 400);
  }

  const connection = await db.storageConnection.findUnique({
    where: { userId_provider: { userId, provider: document.storageProvider } },
  });
  if (!connection) throw new AuthError('Connect your own Google Drive before sharing documents.', 409);

  await getFileProviderAdapter(document.storageProvider).shareFile(
    connection,
    document.providerFileId,
    { email, role: permissionRole },
  );
}