import { z } from 'zod';

export const connectPaymentAccountSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required'),
  bankCode: z.string().min(2, 'Bank code is required'),
  accountNumber: z.string().min(10, 'Account number must be at least 10 digits').max(12),
  currency: z.string().default('NGN'),
  provider: z.enum(['PAYSTACK', 'STRIPE']).default('PAYSTACK'),
});

export const initializePaymentSchema = z.object({
  milestoneId: z.string().optional(),
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().default('NGN'),
});

export const releasePaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
});

export const requestRefundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  reason: z.string().min(5, 'Reason must be at least 5 characters long'),
});

export type ConnectPaymentAccountInput = z.infer<typeof connectPaymentAccountSchema>;
export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
export type ReleasePaymentInput = z.infer<typeof releasePaymentSchema>;
export type RequestRefundInput = z.infer<typeof requestRefundSchema>;
