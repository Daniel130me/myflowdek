import crypto from 'crypto';

export function isPaymentSandboxEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.PAYMENTS_SANDBOX_ENABLED === 'true';
}

export interface InitializeCheckoutInput {
  engagementId: string;
  milestoneId?: string;
  amount: number; // Major units (e.g. NGN 50000 or USD 100)
  currency: string;
  clientEmail: string;
  clientName?: string;
  callbackUrl?: string;
}

export interface PayoutTransferInput {
  engagementPaymentId: string;
  recipientAccountCode: string;
  amount: number;
  currency: string;
  reason: string;
}

export interface MarketplacePaymentProvider {
  createProfessionalAccount(input: {
    userId: string;
    accountNumber: string;
    bankCode: string;
    bankName: string;
    businessName: string;
  }): Promise<{ accountCode: string; accountNumberMasked: string }>;

  initializeCheckout(input: InitializeCheckoutInput): Promise<{
    checkoutUrl: string;
    transactionReference: string;
  }>;

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;

  releasePayout(input: PayoutTransferInput): Promise<{
    transferReference: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
  }>;

  processRefund(input: { providerReference: string; amount?: number }): Promise<{
    refundReference: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
  }>;
}

export class PaystackPaymentProvider implements MarketplacePaymentProvider {
  private secretKey: string;
  private webhookSecret: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    this.webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET || this.secretKey;
  }

  private hasConfiguredSecret() {
    return Boolean(this.secretKey && !this.secretKey.includes('placeholder'));
  }

  async createProfessionalAccount(input: {
    userId: string;
    accountNumber: string;
    bankCode: string;
    bankName: string;
    businessName: string;
  }): Promise<{ accountCode: string; accountNumberMasked: string }> {
    const masked = `******${input.accountNumber.slice(-4)}`;

    // In live mode with API key, call Paystack /transferrecipient endpoint
    if (this.hasConfiguredSecret()) {
      const response = await fetch('https://api.paystack.co/transferrecipient', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'nuban',
            name: input.businessName,
            account_number: input.accountNumber,
            bank_code: input.bankCode,
            currency: 'NGN',
          }),
      });
      const data = await response.json();
      if (!response.ok || !data.status || !data.data?.recipient_code) {
        throw new Error(data.message || 'Paystack could not create the transfer recipient.');
      }
      return { accountCode: data.data.recipient_code, accountNumberMasked: masked };
    }

    if (!isPaymentSandboxEnabled()) {
      throw new Error('Paystack is not configured and payment sandbox mode is disabled.');
    }

    const mockRecipientCode = `RCP_${crypto.randomBytes(8).toString('hex')}`;
    return {
      accountCode: mockRecipientCode,
      accountNumberMasked: masked,
    };
  }

  async initializeCheckout(input: InitializeCheckoutInput): Promise<{
    checkoutUrl: string;
    transactionReference: string;
  }> {
    const reference = `FLW_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (this.hasConfiguredSecret()) {
      const amountInKobo = Math.round(input.amount * 100);
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: input.clientEmail,
            amount: amountInKobo,
            currency: input.currency || 'NGN',
            reference,
            callback_url: input.callbackUrl,
            metadata: {
              engagementId: input.engagementId,
              milestoneId: input.milestoneId,
            },
          }),
      });
      const data = await response.json();
      if (!response.ok || !data.status || !data.data?.authorization_url) {
        throw new Error(data.message || 'Paystack could not initialize checkout.');
      }
      return { checkoutUrl: data.data.authorization_url, transactionReference: reference };
    }

    if (!isPaymentSandboxEnabled()) {
      throw new Error('Paystack is not configured and payment sandbox mode is disabled.');
    }

    return {
      checkoutUrl: `/talent/engagements/${input.engagementId}?payment_ref=${reference}&funded=true`,
      transactionReference: reference,
    };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    if (!this.webhookSecret || this.webhookSecret.includes('placeholder')) {
      return isPaymentSandboxEnabled() && signatureHeader === 'flowdek-sandbox';
    }

    const hash = crypto
      .createHmac('sha512', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return hash === signatureHeader;
  }

  async releasePayout(input: PayoutTransferInput): Promise<{
    transferReference: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
  }> {
    const transferCode = `TRF_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (this.hasConfiguredSecret()) {
      const amountInKobo = Math.round(input.amount * 100);
      const response = await fetch('https://api.paystack.co/transfer', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source: 'balance',
            amount: amountInKobo,
            recipient: input.recipientAccountCode,
            reason: input.reason,
            reference: transferCode,
          }),
      });
      const data = await response.json();
      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Paystack could not initiate the payout.');
      }
      return {
        transferReference: data.data?.transfer_code || transferCode,
        status: data.data?.status === 'success' ? 'SUCCESS' : 'PENDING',
      };
    }

    if (!isPaymentSandboxEnabled()) {
      throw new Error('Paystack is not configured and payment sandbox mode is disabled.');
    }

    return {
      transferReference: transferCode,
      status: 'SUCCESS',
    };
  }

  async processRefund(input: { providerReference: string; amount?: number }): Promise<{
    refundReference: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
  }> {
    if (this.hasConfiguredSecret()) {
      const response = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: input.providerReference,
          amount: input.amount == null ? undefined : Math.round(input.amount * 100),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Paystack could not initiate the refund.');
      }
      return {
        refundReference: String(data.data?.id || data.data?.transaction?.reference || input.providerReference),
        status: data.data?.status === 'processed' ? 'APPROVED' : 'PENDING',
      };
    }

    if (!isPaymentSandboxEnabled()) {
      throw new Error('Paystack is not configured and payment sandbox mode is disabled.');
    }

    return { refundReference: `RFD_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`, status: 'APPROVED' };
  }
}

export const defaultPaymentProvider = new PaystackPaymentProvider();
