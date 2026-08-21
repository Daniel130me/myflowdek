import { db } from '@/server/db/client';
import { ServiceError } from '@/server/http/errors';
import { ModerateProfileInput, SubmitReportInput } from './moderation.schemas';

export class ModerationService {
  /**
   * Checks if the Talent Network feature flag is enabled
   */
  isTalentNetworkEnabled(): boolean {
    const flag = process.env.TALENT_NETWORK_ENABLED;
    if (flag === undefined || flag === null) return true; // Enabled by default unless explicitly set to false
    return flag.toLowerCase() !== 'false';
  }

  /**
   * Enforces feature flag requirement across Talent APIs
   */
  assertTalentNetworkEnabled() {
    if (!this.isTalentNetworkEnabled()) {
      throw new ServiceError('The Talent Network feature is currently disabled.', 503);
    }
  }

  /**
   * Submits a community report against a profile, opportunity, proposal, or engagement
   */
  async submitReport(reporterUserId: string, input: SubmitReportInput) {
    this.assertTalentNetworkEnabled();

    const report = await db.auditLog.create({
      data: {
        userId: reporterUserId,
        action: 'talent_network_report_created',
        meta: {
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
          details: input.details || null,
          reportedAt: new Date().toISOString(),
        },
      },
    });

    return { id: report.id, message: 'Report submitted for review by moderation team' };
  }

  /**
   * Admin action to suspend, reinstate, or delete a professional profile
   */
  async moderateProfessionalProfile(adminUserId: string, input: ModerateProfileInput) {
    this.assertTalentNetworkEnabled();

    // Verify admin privileges
    const adminUser = await db.user.findUnique({
      where: { id: adminUserId },
      select: { platformRole: true },
    });

    if (adminUser?.platformRole !== 'SUPER_ADMIN') {
      throw new ServiceError('Only Flowdek platform administrators can perform profile moderation', 403);
    }

    const profile = await db.professionalProfile.findUnique({
      where: { id: input.profileId },
    });

    if (!profile) {
      throw new ServiceError('Professional profile not found', 404);
    }

    let updatedStatus: 'PUBLISHED' | 'DRAFT' | 'SUSPENDED' = 'SUSPENDED';
    if (input.action === 'REINSTATE') updatedStatus = 'PUBLISHED';
    if (input.action === 'SUSPEND') updatedStatus = 'SUSPENDED';

    const updatedProfile = await db.$transaction(async (tx) => {
      const res = await tx.professionalProfile.update({
        where: { id: input.profileId },
        data: { status: updatedStatus },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: `talent_profile_moderated_${input.action.toLowerCase()}`,
          meta: {
            profileId: input.profileId,
            action: input.action,
            reason: input.reason,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return res;
    });

    return { profile: updatedProfile, message: `Profile successfully ${input.action.toLowerCase()}ed` };
  }
}

export const moderationService = new ModerationService();
