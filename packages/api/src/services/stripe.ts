import Stripe from 'stripe';
import { Env } from '../types';

// Initialize Stripe client
export function getStripeClient(env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

// Create a customer
export async function createCustomer(
  stripe: Stripe,
  email: string,
  name: string,
  orgId: string
): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email,
    name,
    metadata: {
      org_id: orgId,
    },
  });
}

// Create a checkout session for subscription
export async function createCheckoutSession(
  stripe: Stripe,
  customerId: string,
  orgId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'SMSGuard Pro',
            description: 'SMS Pumping Prevention Service - Base subscription',
          },
          unit_amount: 10000, // $100.00
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      org_id: orgId,
    },
    subscription_data: {
      metadata: {
        org_id: orgId,
      },
    },
  });
}

// Create a billing portal session
export async function createBillingPortalSession(
  stripe: Stripe,
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// Get subscription details
export async function getSubscription(
  stripe: Stripe,
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

// Cancel subscription
export async function cancelSubscription(
  stripe: Stripe,
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.cancel(subscriptionId);
}

// Create usage record for metered billing (savings share)
export async function createUsageRecord(
  stripe: Stripe,
  subscriptionItemId: string,
  quantity: number, // cents of savings share fee
  timestamp: number
): Promise<Stripe.UsageRecord> {
  return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp,
    action: 'set',
  });
}

// Create invoice for additional charges
export async function createInvoice(
  stripe: Stripe,
  customerId: string,
  amount: number,
  description: string
): Promise<Stripe.Invoice> {
  // Create invoice item
  await stripe.invoiceItems.create({
    customer: customerId,
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    description,
  });

  // Create and finalize invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true,
  });

  return stripe.invoices.finalizeInvoice(invoice.id);
}

// Handle webhook events
export async function handleWebhook(
  stripe: Stripe,
  body: string,
  signature: string,
  webhookSecret: string
): Promise<Stripe.Event> {
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

// Process subscription events
export async function processSubscriptionEvent(
  db: D1Database,
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata.org_id;

      if (orgId) {
        await db.prepare(`
          UPDATE organizations
          SET stripe_subscription_id = ?,
              plan = 'pro',
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(subscription.id, orgId).run();
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata.org_id;

      if (orgId) {
        await db.prepare(`
          UPDATE organizations
          SET stripe_subscription_id = NULL,
              plan = 'trial',
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(orgId).run();
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      // Log successful payment
      console.log(`Invoice paid: ${invoice.id}, amount: ${invoice.amount_paid}`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      // Handle failed payment - could send email notification
      console.log(`Invoice payment failed: ${invoice.id}`);
      break;
    }
  }
}

// Calculate monthly invoice with savings share
export async function calculateMonthlyBilling(
  db: D1Database,
  orgId: string,
  month: string // YYYY-MM
): Promise<{
  baseFee: number;
  blockedCount: number;
  avgSmsCost: number;
  savings: number;
  savingsShare: number;
  total: number;
}> {
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  // Get blocked count with high confidence (score >= 71)
  const stats = await db.prepare(`
    SELECT COUNT(*) as blocked
    FROM sms_checks
    WHERE org_id = ?
    AND decision = 'block'
    AND fraud_score >= 71
    AND created_at BETWEEN ? AND ?
  `).bind(orgId, startDate, endDate).first<{ blocked: number }>();

  // Get org's average SMS cost
  const org = await db.prepare(
    'SELECT avg_sms_cost FROM organizations WHERE id = ?'
  ).bind(orgId).first<{ avg_sms_cost: number }>();

  const baseFee = 100;
  const blockedCount = stats?.blocked ?? 0;
  const avgSmsCost = org?.avg_sms_cost ?? 0.08;
  const savings = blockedCount * avgSmsCost;
  const savingsShare = savings * 0.15;
  const total = baseFee + savingsShare;

  return {
    baseFee,
    blockedCount,
    avgSmsCost,
    savings,
    savingsShare,
    total,
  };
}
