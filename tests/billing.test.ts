import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createGatewayApp } from '../server/gateway';

describe('Stripe Billing & Quota Expansion Engine', () => {
  const app = createGatewayApp();
  const apiKey = 'vcore_anon_default_key';

  it('should create Stripe Checkout Session for $1.00 USD', async () => {
    const res = await request(app)
      .post('/api/v1/projects/proj_default/billing/checkout')
      .set('x-vcore-api-key', apiKey);

    expect(res.status).toBe(201);
    expect(res.body.checkout_url).toBeDefined();
    expect(res.body.amount).toBe('$1.00 USD');
  });

  it('should process Stripe webhook event idempotently and grant +25 GB pack', async () => {
    const eventId = `evt_test_${Date.now()}`;
    const paymentId = `pi_test_${Date.now()}`;

    // 1st Webhook delivery
    const res1 = await request(app)
      .post('/api/billing/stripe/webhook')
      .send({
        id: eventId,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session',
            payment_intent: paymentId,
            metadata: {
              project_ref: 'proj_default',
              project_id: '1',
            },
          },
        },
      });

    expect(res1.status).toBe(200);
    expect(res1.body.received).toBe(true);

    // Fetch billing history to verify 1 pack granted
    const history1 = await request(app)
      .get('/api/v1/projects/proj_default/billing/history')
      .set('x-vcore-api-key', apiKey);

    expect(history1.status).toBe(200);
    expect(history1.body.expansion_packs_count).toBe(1);
    expect(history1.body.capacity_gb).toBe(50); // 25 GB + 25 GB
    expect(history1.body.total_paid_usd).toBe(1.0);

    // 2nd Webhook delivery (duplicate event - idempotency check)
    const res2 = await request(app)
      .post('/api/billing/stripe/webhook')
      .send({
        id: eventId,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_session',
            payment_intent: paymentId,
            metadata: {
              project_ref: 'proj_default',
              project_id: '1',
            },
          },
        },
      });

    expect(res2.status).toBe(200);

    // Verify pack count remained 1 (no duplicate pack added)
    const history2 = await request(app)
      .get('/api/v1/projects/proj_default/billing/history')
      .set('x-vcore-api-key', apiKey);

    expect(history2.body.expansion_packs_count).toBe(1);
    expect(history2.body.capacity_gb).toBe(50);
  });
});
