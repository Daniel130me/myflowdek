# Flowdek Talent Network — Payment Provider Investigation & Architecture Report

## Executive Summary
This document fulfills **Phase 6 (Payment Provider Investigation)** of the Flowdek Talent Network specification. It evaluates payment processor options for marketplace transactions between clients (employers/project managers) and professionals (freelancers/contractors).

The investigation focuses on supporting:
1. **Local African / Nigerian Market**: NGN transactions, local bank transfer, USSD, and card processing.
2. **Global / International Market**: Multi-currency (USD, EUR, GBP) card processing and international payouts.
3. **Platform/Marketplace Financial Mechanics**: Client checkout, platform fee deduction, milestone holding, payout triggers, refunds, and dispute management.

---

## 1. Provider Evaluation & Recommendations

### Primary Recommendation: **Paystack (a Stripe Company)**
* **Primary Target Markets**: Nigeria (NGN), Ghana (GHS), Kenya (KES), South Africa (ZAR).
* **Marketplace Product**: Paystack Transfers & Subaccounts (Split Payments).
* **Why Paystack**:
  - **Market Leadership**: Best-in-class coverage for Nigerian banking rails (NIBSS, instant bank transfers, local cards).
  - **Subaccount & Split Payment System**: Supports automatically routing a percentage (or fixed fee) to Flowdek's main platform account while directing the remainder to the professional's subaccount upon release.
  - **KYC & Onboarding**: Direct verification via BVN (Bank Verification Number), NIN (National Identity Number), and business registration numbers without heavy friction.
  - **Webhook Support**: Robust, cryptographically signed webhooks (`x-paystack-signature`) for event-driven reconciliation.
  - **Sandbox Environment**: Fully featured test environment supporting simulated bank transfers, card payments, and webhook triggers.

### Secondary / Global Alternative: **Stripe Connect (Custom / Express)**
* **Primary Target Markets**: US, EU, UK, Canada, and global cross-border payouts in USD/EUR/GBP.
* **Marketplace Product**: Stripe Connect (Express Accounts with Destination Charges & Separate Charges and Transfers).
* **Why Stripe**:
  - Unmatched global multi-currency checkout and express contractor onboarding.
  - Built-in international KYC/AML identity verification across 45+ countries.
  - Flexible fee structure (`application_fee_amount`).

### Hybrid Architecture Proposal
- **For NGN / West African Transactions**: Use Paystack Subaccounts & Dedicated Virtual Accounts/Cards.
- **For International USD/Global Transactions**: Use Stripe Connect.
- **Abstraction Layer**: All frontend and service layers interact with an abstract `MarketplacePaymentProvider` interface, allowing Flowdek to route transactions based on currency and currency preference seamlessly.

---

## 2. Feature Capability Matrix

| Feature | Paystack (Nigeria / Africa) | Stripe Connect (Global) | Flowdek Status / Alignment |
| :--- | :--- | :--- | :--- |
| **Customer Checkout** | Cards, Bank Transfer, USSD, Apple Pay | Credit/Debit Cards, Apple Pay, Google Pay | ✅ Confirmed |
| **Professional Onboarding & KYC** | Bank Account + BVN/NIN lookup API | Hosted Express Onboarding | ✅ Confirmed |
| **Split Payments & Platform Fees** | Subaccount split percentage/flat fee | Destination Charges with Application Fee | ✅ Confirmed |
| **Delayed Payouts / Milestone Release** | Hold payout until milestone approval | Separate Charges & Transfers / Manual Payout | ✅ Confirmed |
| **Refunds & Chargeback Handling** | API-driven refunds & dispute dashboard | API Disputes & Radar Fraud Prevention | ✅ Confirmed |
| **Webhook Verification** | HMAC-SHA512 header verification | HMAC-SHA256 signature verification | ✅ Confirmed |
| **Sandbox Testing Environment** | Live/Test API key toggles & dummy banks | Test mode API keys & mock payment instruments | ✅ Confirmed |

---

## 3. Legal & Terminology Clarification: Is "Escrow" Accurate?

> **CRITICAL LEGAL NOTICE**:
> Flowdek **MUST NOT** use the term "Escrow" in user interfaces, terms of service, or API documentations.

### Reason:
1. **Regulatory Definition**: In Nigeria (Central Bank of Nigeria) and international jurisdictions, providing an "Escrow Service" requires a dedicated non-bank financial institution or escrow agent license.
2. **Provider-Managed Funds**: Flowdek does not hold user funds in a custom bank account or custom digital wallet. All client payments are processed directly through the payment gateway (Paystack/Stripe), where funds remain held within the provider's regulated platform balance until a milestone release signal is sent by Flowdek.
3. **Approved Terminology**:
   - Use: **"Provider-Managed Milestone Holding"**, **"Contract Milestone Funding"**, **"Protected Milestone Payments"**, or **"Funded Engagement"**.
   - Avoid: *"Escrow"*, *"Wallet"*, *"Flowdek Balance"*, *"Vault"*.

---

## 4. Proposed Payment Flow Architecture

```
Client                             Flowdek Server                           Paystack / Gateway
  │                                      │                                          │
  ├─ 1. Click "Fund Milestone" ─────────►│                                          │
  │                                      ├─ 2. Create Pending Transaction (DB) ────►│
  │                                      │    (Server calculates fee & total)       ├─ 3. Initialize Checkout
  │◄─────────────────────────────────────┴──────────────────────────────────────────┤
  │  4. Render Gateway Checkout Modal/Page                                          │
  │                                                                                 │
  ├─ 5. Complete Payment (Card / Bank Transfer) ───────────────────────────────────►│
  │                                                                                 ├─ 6. Webhook: charge.success
  │                                      │◄─────────────────────────────────────────┤
  │                                      ├─ 7. Verify Webhook Signature             │
  │                                      ├─ 8. Mark Payment Status = FUNDED         │
  │                                      ├─ 9. Activate Milestone Work             │
  │                                      │                                          │
  │  ... Work Completed & Approved ...   │                                          │
  │                                      │                                          │
  ├─ 10. Client Approves Milestone ─────►│                                          │
  │                                      ├─ 11. Trigger Payout/Transfer ───────────►│
  │                                      │     (Amount less platform fee)           ├─ 12. Transfer to Contractor Account
  │                                      │◄─────────────────────────────────────────┤
  │                                      ├─ 13. Webhook: transfer.success           │
  │                                      └─ 14. Mark Payment Status = RELEASED      │
```

---

## 5. Interface Abstraction (`MarketplacePaymentProvider`)

To ensure modularity and multi-provider capability, Phase 7 will implement the following provider abstraction:

```typescript
export interface InitializePaymentInput {
  engagementId: string;
  milestoneId?: string;
  amount: number; // In minor units (e.g. kobo or cents)
  currency: string; // ISO 4217, e.g. 'NGN', 'USD'
  clientEmail: string;
  metadata?: Record<string, any>;
}

export interface PayoutInput {
  engagementId: string;
  milestoneId?: string;
  recipientAccountCode: string;
  amount: number;
  currency: string;
  reason: string;
}

export interface MarketplacePaymentProvider {
  /**
   * Onboards a professional contractor account (subaccount or express account)
   */
  createProfessionalAccount(input: {
    userId: string;
    accountNumber: string;
    bankCode: string;
    businessName: string;
  }): Promise<{ accountCode: string }>;

  /**
   * Initializes a checkout session for funding a contract or milestone
   */
  initializeCheckout(input: InitializePaymentInput): Promise<{
    checkoutUrl: string;
    transactionReference: string;
  }>;

  /**
   * Verifies incoming webhook signatures cryptographically
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;

  /**
   * Releases funds / initiates transfer to professional after client approval
   */
  releasePayout(input: PayoutInput): Promise<{
    transferReference: string;
    status: 'pending' | 'success' | 'failed';
  }>;

  /**
   * Refunds payment back to client in case of dispute cancellation
   */
  processRefund(transactionReference: string, amount?: number): Promise<boolean>;
}
```

---

## 6. Environment Variables Required

Declare in `.env.example`:

```env
# Paystack Integration
PAYSTACK_SECRET_KEY=paystack_secret_key_placeholder
PAYSTACK_PUBLIC_KEY=paystack_public_key_placeholder
PAYSTACK_WEBHOOK_SECRET=paystack_webhook_secret_placeholder

# Stripe Integration (Optional Global Multi-currency)
STRIPE_SECRET_KEY=stripe_secret_key_placeholder
STRIPE_WEBHOOK_SECRET=stripe_webhook_secret_placeholder

# Flowdek Marketplace Settings
PLATFORM_FEE_PERCENTAGE=10.0
DEFAULT_CURRENCY=NGN
```

---

## 7. Operational & Regulatory Risks & Mitigation

1. **Risk: Unverified Webhook Spoofing**
   - *Mitigation*: Webhook handler MUST check `x-paystack-signature` using HMAC-SHA512 with `PAYSTACK_WEBHOOK_SECRET`. Raw request body must be parsed prior to signature validation.

2. **Risk: Double Release / Replay Attacks**
   - *Mitigation*: Database transaction with unique constraint on `PaymentWebhookEvent.providerEventId` and atomic checks on `EngagementPayment.status === 'FUNDED'`.

3. **Risk: Currency & Precision Rounding**
   - *Mitigation*: All money values stored in minor units (integers representing Kobo / Cents) in the database and API payloads.
