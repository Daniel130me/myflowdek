import { NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { getDocumentTemplate } from '@/server/documents/template.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    await requireAuthenticatedUser();
    const { templateId } = await params;
    return NextResponse.json({ template: await getDocumentTemplate(templateId) });
  } catch (error) {
    return authErrorResponse(error);
  }
}