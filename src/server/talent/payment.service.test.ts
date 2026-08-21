import assert from 'node:assert/strict';
import test from 'node:test';
import { connectPaymentAccountSchema, initializePaymentSchema, requestRefundSchema } from './payment.schemas';
import { db } from '@/server/db/client';
import { paymentService } from './payment.service';

test('connectPaymentAccountSchema validates bank details and masked output', () => {
  // Invalid account number length
  assert.equal(
    connectPaymentAccountSchema.safeParse({
      bankName: 'Access Bank',
      bankCode: '044',
      accountNumber: '123',
      currency: 'NGN',
    }).success,
    false
  );

  // Valid account details
  assert.equal(
    connectPaymentAccountSchema.safeParse({
      bankName: 'Access Bank',
      bankCode: '044',
      accountNumber: '0123456789',
      currency: 'NGN',
    }).success,
    true
  );
});

test('initializePaymentSchema validates positive amounts and supported currency', () => {
  assert.equal(
    initializePaymentSchema.safeParse({
      amount: 0,
      currency: 'NGN',
    }).success,
    false
  );

  assert.equal(
    initializePaymentSchema.safeParse({
      amount: 50000,
      currency: 'NGN',
    }).success,
    true
  );
});

test('requestRefundSchema validates non-empty reason and positive refund amount', () => {
  assert.equal(
    requestRefundSchema.safeParse({
      paymentId: 'pay-123',
      reason: 'Short',
    }).success,
    true
  );

  assert.equal(
    requestRefundSchema.safeParse({
      paymentId: '',
      reason: '123',
    }).success,
    false
  );
});

test('Phase 7 Payment lifecycle: initialize, simulate webhook funding, payout account, and milestone release', async () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const clientUser = await db.user.create({
    data: { email: `pay-client-${runId}@example.com`, name: 'Payment Client' },
  });
  const proUser = await db.user.create({
    data: { email: `pay-pro-${runId}@example.com`, name: 'Payment Pro' },
  });

  const proProfile = await db.professionalProfile.create({
    data: {
      userId: proUser.id,
      slug: `pro-slug-${runId}`,
      professionalTitle: 'Full Stack Contractor',
      status: 'PUBLISHED',
      visibility: 'FLOWDEK_USERS',
    },
  });

  const workspace = await db.workspace.create({
    data: {
      name: 'Payment Test Workspace',
      slug: `pay-ws-${runId}`,
      members: { create: { userId: clientUser.id, role: 'OWNER' } },
    },
  });
  const project = await db.project.create({
    data: {
      name: 'Payment Project',
      ownerId: clientUser.id,
      workspaceId: workspace.id,
      members: { create: { userId: clientUser.id, role: 'OWNER' } },
    },
  });
  const task = await db.task.create({
    data: { projectId: project.id, name: 'Payment Integration Task', createdById: clientUser.id },
  });

  const engagement = await db.engagement.create({
    data: {
      taskId: task.id,
      clientUserId: clientUser.id,
      professionalProfileId: proProfile.id,
      title: 'Payment Integration Contract',
      scopeDescription: 'Build Paystack marketplace payment flow with milestone protection.',
      agreedPrice: 100000,
      currency: 'NGN',
      status: 'ACTIVE',
    },
  });

  const milestone = await db.engagementMilestone.create({
    data: {
      engagementId: engagement.id,
      title: 'Milestone 1: Webhook and Payout Integration',
      amount: 50000,
      status: 'PENDING',
    },
  });

  try {
    // 1. Pro connects bank payout account
    const payoutAccount = await paymentService.saveProfessionalPaymentAccount(proUser.id, {
      provider: 'PAYSTACK',
      bankName: 'GTBank',
      bankCode: '058',
      accountNumber: '0123456789',
      currency: 'NGN',
    });

    assert.equal(payoutAccount.bankName, 'GTBank');
    assert.equal(payoutAccount.accountNumberMasked, '******6789');

    // 2. Client initializes milestone funding
    const initResult = await paymentService.initializeEngagementPayment(clientUser.id, engagement.id, {
      milestoneId: milestone.id,
      amount: 50000,
      currency: 'NGN',
    });

    assert.ok(initResult.payment.id);
    assert.equal(initResult.payment.state, 'FUNDING_PENDING');

    // 3. Simulate webhook funding event (Idempotent webhook handling)
    const webhookPayload = {
      event: 'charge.success',
      data: {
        id: `evt-${runId}`,
        reference: initResult.transactionReference,
        status: 'success',
      },
    };

    const webhookResult = await paymentService.handleWebhookEvent(
      JSON.stringify(webhookPayload),
      'test-signature',
      webhookPayload
    );

    assert.equal(webhookResult.status, 'success');

    // Repeat webhook call to verify idempotency
    const repeatResult = await paymentService.handleWebhookEvent(
      JSON.stringify(webhookPayload),
      'test-signature',
      webhookPayload
    );
    assert.equal(repeatResult.status, 'already_processed');

    // 4. Verify payment state updated to FUNDED
    const fundedPayment = await db.engagementPayment.findUniqueOrThrow({
      where: { id: initResult.payment.id },
    });
    assert.equal(fundedPayment.state, 'FUNDED');
    assert.equal(fundedPayment.amount.toString(), '50000');
    assert.equal(fundedPayment.platformFee.toString(), '5000'); // 10%
    assert.equal(fundedPayment.netAmount.toString(), '45000'); // 90%

    // 5. Client releases milestone payment to professional
    const releasedPayment = await paymentService.releaseMilestonePayment(clientUser.id, initResult.payment.id);
    assert.equal(releasedPayment.state, 'RELEASED');
    assert.ok(releasedPayment.releasedAt);

    // 6. Check created ProfessionalPayout record
    const payoutRecord = await db.professionalPayout.findFirstOrThrow({
      where: { engagementPaymentId: initResult.payment.id },
    });
    assert.equal(payoutRecord.amount.toString(), '45000');
    assert.equal(payoutRecord.status, 'SUCCESS');
  } finally {
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({
      where: { id: { in: [clientUser.id, proUser.id] } },
    });
  }
});
