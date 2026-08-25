import { z } from 'zod';

export const connectPaymentAccountSchema = z.object({
  bankName: z.string().trim().min(2, 'Bank name is required').max(120),
  bankCode: z.string().trim().regex(/^\d{2,10}$/, 'Bank code must contain only digits'),
  accountNumber: z.string().trim().regex(/^\d{10}$/, 'Account number must contain exactly 10 digits'),
  currency: z.literal('NGN').default('NGN'),
  provider: z.literal('PAYSTACK').default('PAYSTACK'),
}).strict();

export const initializePaymentSchema = z.object({
  milestoneId: z.string().trim().min(1).optional(),
  // Kept for backward-compatible clients, but the service validates it
  // against the engagement or milestone amount calculated on the server.
  amount: z.number().positive('Amount must be greater than 0').optional(),
  currency: z.literal('NGN').default('NGN'),
}).strict();

export const releasePaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
});

export const requestRefundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters long').max(1000),
}).strict();

export type ConnectPaymentAccountInput = z.infer<typeof connectPaymentAccountSchema>;
export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
export type ReleasePaymentInput = z.infer<typeof releasePaymentSchema>;
export type RequestRefundInput = z.infer<typeof requestRefundSchema>;
