import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { AuthenticatedRequest } from './gateway';
import { dbEngine } from './db';
import { Logger } from './observability';

export const billingRouter = Router({ mergeParams: true });
export const globalStripeWebhookRouter = Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_stripe_webhook_secret';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia' as any,
});

// Stripe Checkout Session Endpoint
billingRouter.post('/billing/checkout', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const project = req.project;

    const publicSessionId = `cs_vcore_${crypto.randomUUID().replace(/-/g, '')}`;

    dbEngine.db.public.none(`
      INSERT INTO billing.billing_checkout_sessions (public_id, project_id, stripe_session_id, amount_cents, status)
      VALUES ('${crypto.randomUUID()}', ${project.internal_id}, '${publicSessionId}', 100, 'pending')
    `);

    let url = `http://localhost:8080/billing/success?session_id=${publicSessionId}&project_ref=${project.ref}`;

    // If live/test Stripe secret key is present, attempt real Stripe Checkout Session creation
    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('mock')) {
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'VCoreDB +25 GB Capacity Expansion Pack',
                description: '+25 GB Database, +25 GB Storage, +25 GB Bandwidth',
              },
              unit_amount: 100, // $1.00 USD
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `http://localhost:8080/billing/success?session_id={CHECKOUT_SESSION_ID}&project_ref=${project.ref}`,
        cancel_url: `http://localhost:8080/billing/cancelled?project_ref=${project.ref}`,
        metadata: {
          project_ref: project.ref,
          project_id: String(project.internal_id),
        },
      });

      url = stripeSession.url || url;
    }

    res.status(201).json({
      checkout_url: url,
      session_id: publicSessionId,
      amount: '$1.00 USD',
      expansion: '+25 GB Database, +25 GB Storage, +25 GB Bandwidth',
    });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'CHECKOUT_FAILED', message: err.message } });
  }
});

// Helper function to grant +25 GB quota expansion pack safely & idempotently
export function processQuotaExpansion(projectId: number, stripePaymentId: string, stripeSessionId: string | null, stripeEventId: string) {
  // Idempotency check: verify event has not already been processed
  const existingEvents = dbEngine.db.public.many(
    `SELECT id FROM billing.billing_webhook_events WHERE stripe_event_id = '${stripeEventId}'`
  );
  if (existingEvents.length > 0) {
    return { success: true, duplicate: true };
  }

  // Record webhook event to enforce strict idempotency
  dbEngine.db.public.none(`
    INSERT INTO billing.billing_webhook_events (public_id, stripe_event_id, event_type)
    VALUES ('${crypto.randomUUID()}', '${stripeEventId}', 'checkout.session.completed')
  `);

  // Record payment transaction
  dbEngine.db.public.none(`
    INSERT INTO billing.billing_payments (public_id, project_id, stripe_payment_id, stripe_session_id, amount_cents, currency, status, expansion_packs_granted)
    VALUES ('${crypto.randomUUID()}', ${projectId}, '${stripePaymentId}', ${stripeSessionId ? `'${stripeSessionId}'` : 'NULL'}, 100, 'usd', 'succeeded', 1)
  `);

  // Update or insert project quota
  const existingQuotas = dbEngine.db.public.many(
    `SELECT id, expansion_packs FROM billing.project_quotas WHERE project_id = ${projectId}`
  );

  if (existingQuotas.length > 0) {
    const packs = (existingQuotas[0].expansion_packs || 0) + 1;
    const newBytes = (25 + packs * 25) * 1024 * 1024 * 1024; // 25 GB + 25 GB * packs

    dbEngine.db.public.none(`
      UPDATE billing.project_quotas
      SET expansion_packs = ${packs},
          database_storage_bytes = ${newBytes},
          file_storage_bytes = ${newBytes},
          bandwidth_bytes = ${newBytes},
          updated_at = NOW()
      WHERE project_id = ${projectId}
    `);
  } else {
    const newBytes = 50 * 1024 * 1024 * 1024; // 50 GB total after 1st expansion
    dbEngine.db.public.none(`
      INSERT INTO billing.project_quotas (public_id, project_id, expansion_packs, database_storage_bytes, file_storage_bytes, bandwidth_bytes)
      VALUES ('${crypto.randomUUID()}', ${projectId}, 1, ${newBytes}, ${newBytes}, ${newBytes})
    `);
  }

  Logger.log(projectId, 'billing', 'info', `Granted +25 GB Capacity Expansion Pack for payment ${stripePaymentId}`);

  return { success: true, duplicate: false };
}

// Global Stripe Webhook Endpoint
globalStripeWebhookRouter.post('/api/billing/stripe/webhook', (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    let event: any = req.body;

    // Signature verification if real secret is configured
    if (process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.includes('mock') && sig) {
      try {
        const rawPayload = (req as any).rawBody || req.body;
        event = stripe.webhooks.constructEvent(rawPayload, sig, STRIPE_WEBHOOK_SECRET);
      } catch (err: any) {
        return res.status(400).send(`Webhook Signature Verification Error: ${err.message}`);
      }
    }

    const eventType = event.type || 'checkout.session.completed';
    const eventId = event.id || `evt_${crypto.randomUUID().replace(/-/g, '')}`;

    if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded') {
      const session = event.data?.object || event;
      const projectRef = session.metadata?.project_ref || 'proj_default';
      const projectId = session.metadata?.project_id ? parseInt(session.metadata.project_id, 10) : 1;
      const paymentId = session.payment_intent || session.id || `pi_${crypto.randomUUID().replace(/-/g, '')}`;

      processQuotaExpansion(projectId, paymentId, session.id || null, eventId);
    }

    res.json({ received: true });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'WEBHOOK_FAILED', message: err.message } });
  }
});

// Payment History & Billing Status API
billingRouter.get('/billing/history', (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.project.internal_id;

    const payments = dbEngine.db.public.many(
      `SELECT public_id as id, stripe_payment_id, amount_cents, currency, status, expansion_packs_granted, created_at
       FROM billing.billing_payments WHERE project_id = ${projectId} ORDER BY created_at DESC`
    );

    const quotas = dbEngine.db.public.many(
      `SELECT expansion_packs, database_storage_bytes, file_storage_bytes, bandwidth_bytes FROM billing.project_quotas WHERE project_id = ${projectId}`
    );

    const q = quotas[0] || { expansion_packs: 0, database_storage_bytes: 26843545600 };
    const packsCount = q.expansion_packs || 0;
    const totalPaidUsd = packsCount * 1.0;

    res.json({
      plan: 'VCoreDB Free Tier',
      capacity_gb: 25 + packsCount * 25,
      expansion_packs_count: packsCount,
      total_paid_usd: totalPaidUsd,
      payments,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'HISTORY_FETCH_FAILED', message: err.message } });
  }
});

// Admin Billing View API
billingRouter.get('/billing/admin/summary', (req: AuthenticatedRequest, res: Response) => {
  try {
    const payments = dbEngine.db.public.many(
      `SELECT p.public_id as id, pr.name as project_name, p.stripe_payment_id, p.amount_cents, p.status, p.created_at
       FROM billing.billing_payments p
       JOIN core.projects pr ON p.project_id = pr.id
       ORDER BY p.created_at DESC`
    );

    const totalPacks = dbEngine.db.public.many(
      `SELECT SUM(expansion_packs) as total_packs FROM billing.project_quotas`
    )[0]?.total_packs || 0;

    res.json({
      summary: {
        total_revenue_usd: parseInt(String(totalPacks), 10) * 1.0,
        expansion_packs_sold: parseInt(String(totalPacks), 10),
        payments_count: payments.length,
      },
      transactions: payments,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'ADMIN_SUMMARY_FAILED', message: err.message } });
  }
});
