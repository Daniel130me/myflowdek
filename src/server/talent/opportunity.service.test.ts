import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { db } from '@/server/db/client';
import {
  createTalentProposalSchema,
  upsertTalentOpportunitySchema,
} from './opportunity.schemas';
import {
  acceptTalentProposal,
  cancelTaskOpportunity,
  closeTaskOpportunity,
  getOpportunityById,
  getTaskOpportunity,
  listOwnProposals,
  listProposalsForOpportunity,
  listPublishedOpportunities,
  publishTaskOpportunity,
  rejectTalentProposal,
  shortlistTalentProposal,
  submitTalentProposal,
  unpublishTaskOpportunity,
  updateTalentProposal,
  upsertTaskOpportunity,
  withdrawTalentProposal,
} from './opportunity.service';

test('upsertTalentOpportunitySchema validates title length, description, and budget bounds', () => {
  // Title too short
  assert.equal(
    upsertTalentOpportunitySchema.safeParse({
      title: 'ab',
      description: 'Valid description that is longer than twenty characters.',
    }).success,
    false,
  );

  // Description too short
  assert.equal(
    upsertTalentOpportunitySchema.safeParse({
      title: 'Valid Title Here',
      description: 'Too short',
    }).success,
    false,
  );

  // Max budget less than min budget
  assert.equal(
    upsertTalentOpportunitySchema.safeParse({
      title: 'Valid Title Here',
      description: 'Valid description that is longer than twenty characters.',
      minimumBudget: 500,
      maximumBudget: 200,
    }).success,
    false,
  );

  // Valid schema
  assert.equal(
    upsertTalentOpportunitySchema.safeParse({
      title: 'Senior Next.js Developer Needed',
      description: 'We need an experienced full-stack engineer to build a high performance feature.',
      budgetType: 'FIXED',
      minimumBudget: 500,
      maximumBudget: 1500,
      currency: 'USD',
      expectedDuration: '2 weeks',
      requiredSkills: [
        { skillId: 'skill-1', minimumProficiency: 'ADVANCED', isRequired: true },
      ],
    }).success,
    true,
  );
});

test('createTalentProposalSchema validates positive price and cover message', () => {
  assert.equal(
    createTalentProposalSchema.safeParse({
      proposedPrice: 0,
      currency: 'USD',
      estimatedDuration: '1 week',
      coverMessage: 'Valid cover message longer than twenty characters.',
    }).success,
    false,
  );

  assert.equal(
    createTalentProposalSchema.safeParse({
      proposedPrice: 1200,
      currency: 'USD',
      estimatedDuration: '1 week',
      coverMessage: 'Short',
    }).success,
    false,
  );

  assert.equal(
    createTalentProposalSchema.safeParse({
      proposedPrice: 1200,
      currency: 'USD',
      estimatedDuration: '1 week',
      coverMessage: 'I have 7+ years of experience delivering full-stack Next.js applications and can start immediately.',
    }).success,
    true,
  );
});

test('task opportunity routes enforce authentication and task capabilities', () => {
  const oppRoute = readFileSync('src/app/api/tasks/[taskId]/opportunity/route.ts', 'utf8');
  const publishRoute = readFileSync('src/app/api/tasks/[taskId]/opportunity/publish/route.ts', 'utf8');
  const unpublishRoute = readFileSync('src/app/api/tasks/[taskId]/opportunity/unpublish/route.ts', 'utf8');
  const closeRoute = readFileSync('src/app/api/tasks/[taskId]/opportunity/close/route.ts', 'utf8');
  const cancelRoute = readFileSync('src/app/api/tasks/[taskId]/opportunity/cancel/route.ts', 'utf8');

  assert.match(oppRoute, /requireTaskProjectCapability\(user\.id, taskId, 'VIEW_PROJECT'\)/);
  assert.match(oppRoute, /requireTaskProjectCapability\(user\.id, taskId, 'EDIT_TASK'\)/);
  assert.match(publishRoute, /requireTaskProjectCapability\(user\.id, taskId, 'EDIT_TASK'\)/);
  assert.match(unpublishRoute, /requireTaskProjectCapability\(user\.id, taskId, 'EDIT_TASK'\)/);
  assert.match(closeRoute, /requireTaskProjectCapability\(user\.id, taskId, 'EDIT_TASK'\)/);
  assert.match(cancelRoute, /requireTaskProjectCapability\(user\.id, taskId, 'EDIT_TASK'\)/);
});

test('Phase 4 full opportunity lifecycle, proposal submission, review, and award flow', async () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const manager = await db.user.create({
    data: { email: `opp-manager-${runId}@example.com`, name: 'Opportunity Manager' },
  });
  const talentUser1 = await db.user.create({
    data: { email: `opp-talent1-${runId}@example.com`, name: 'Talent Alpha' },
  });
  const talentUser2 = await db.user.create({
    data: { email: `opp-talent2-${runId}@example.com`, name: 'Talent Beta' },
  });

  const skill = await db.skill.findFirstOrThrow({ where: { isActive: true }, orderBy: { id: 'asc' } });
  const workspace = await db.workspace.create({
    data: {
      name: 'Phase 4 Test Workspace',
      slug: `phase-4-ws-${runId}`,
      members: { create: { userId: manager.id, role: 'OWNER' } },
    },
  });
  const project = await db.project.create({
    data: {
      name: 'Phase 4 Project',
      ownerId: manager.id,
      workspaceId: workspace.id,
      members: { create: { userId: manager.id, role: 'OWNER' } },
    },
  });
  const task = await db.task.create({
    data: { projectId: project.id, name: 'Build Payment Gateway Integration', createdById: manager.id },
  });

  // Profiles for applicants and manager
  const managerProfile = await db.professionalProfile.create({
    data: {
      userId: manager.id,
      slug: `manager-profile-${runId}`,
      professionalTitle: 'Engineering Director',
      status: 'PUBLISHED',
      visibility: 'FLOWDEK_USERS',
    },
  });
  const profile1 = await db.professionalProfile.create({
    data: {
      userId: talentUser1.id,
      slug: `talent-alpha-${runId}`,
      professionalTitle: 'Senior Payments Architect',
      status: 'PUBLISHED',
      visibility: 'FLOWDEK_USERS',
    },
  });
  const profile2 = await db.professionalProfile.create({
    data: {
      userId: talentUser2.id,
      slug: `talent-beta-${runId}`,
      professionalTitle: 'Full Stack Engineer',
      status: 'PUBLISHED',
      visibility: 'FLOWDEK_USERS',
    },
  });

  try {
    // 1. Create Draft Opportunity
    const draft = await upsertTaskOpportunity(task.id, manager.id, {
      title: 'Build Payment Gateway Integration',
      description: 'Integrate compliant Stripe / marketplace payment endpoints with webhook verification.',
      deliverablesSummary: '1. Stripe Connect flow\n2. Escrow-free payout webhooks\n3. E2E tests',
      budgetType: 'FIXED',
      minimumBudget: 800,
      maximumBudget: 1500,
      currency: 'USD',
      expectedDuration: '1-2 weeks',
      requiredSkills: [{ skillId: skill.id, minimumProficiency: 'EXPERT', isRequired: true }],
    });

    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.title, 'Build Payment Gateway Integration');
    assert.equal(draft.requiredSkills.length, 1);

    // 2. Publish Opportunity
    const published = await publishTaskOpportunity(task.id, manager.id);
    assert.equal(published.status, 'PUBLISHED');
    assert.ok(published.publishedAt);

    // 3. Search in Directory
    const searchResult = await listPublishedOpportunities({ search: 'Stripe' });
    assert.ok(searchResult.opportunities.some((o) => o.id === published.id));

    // 4. Manager cannot apply to their own opportunity
    await assert.rejects(
      () =>
        submitTalentProposal(published.id, manager.id, {
          proposedPrice: 1000,
          currency: 'USD',
          estimatedDuration: '1 week',
          coverMessage: 'I am the manager and I am trying to apply to my own task.',
        }),
      /cannot submit a proposal to your own opportunity/i,
    );

    // 5. Submit proposals from talent 1 and talent 2
    const proposal1 = await submitTalentProposal(published.id, talentUser1.id, {
      proposedPrice: 1200,
      currency: 'USD',
      estimatedDuration: '5 business days',
      coverMessage: 'I have extensive experience with payment integrations and webhook architectures.',
    });
    assert.equal(proposal1.status, 'SUBMITTED');
    assert.equal(proposal1.proposedPrice, '1200');

    const proposal2 = await submitTalentProposal(published.id, talentUser2.id, {
      proposedPrice: 950,
      currency: 'USD',
      estimatedDuration: '7 business days',
      coverMessage: 'I can deliver this cleanly and include full automated integration test suites.',
    });
    assert.equal(proposal2.status, 'SUBMITTED');

    // 6. Check proposals list for manager
    const managerProposals = await listProposalsForOpportunity(published.id);
    assert.equal(managerProposals.length, 2);

    // 7. Check talent's own proposals
    const ownProposals1 = await listOwnProposals(talentUser1.id);
    assert.equal(ownProposals1.length, 1);
    assert.equal(ownProposals1[0].id, proposal1.id);

    // 8. Shortlist talent 1
    const shortlisted1 = await shortlistTalentProposal(proposal1.id, manager.id);
    assert.equal(shortlisted1.status, 'SHORTLISTED');

    // 9. Accept talent 1 proposal (Atomic Award Flow)
    const accepted1 = await acceptTalentProposal(proposal1.id, manager.id);
    assert.equal(accepted1.status, 'ACCEPTED');

    // 10. Verify Proposal 2 is automatically REJECTED and Opportunity is AWARDED
    const [oppRecord, rejectedProp2] = await Promise.all([
      db.talentOpportunity.findUniqueOrThrow({ where: { id: published.id } }),
      db.talentProposal.findUniqueOrThrow({ where: { id: proposal2.id } }),
    ]);

    assert.equal(oppRecord.status, 'AWARDED');
    assert.ok(oppRecord.closedAt);
    assert.equal(rejectedProp2.status, 'REJECTED');
  } finally {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({
      where: { id: { in: [manager.id, talentUser1.id, talentUser2.id] } },
    });
  }
});
