import * as request from 'supertest';

const ORDER_URL = 'http://localhost:3001';
const PAYMENT_URL = 'http://localhost:3002';

const POLL_INTERVAL = 2000;
const TIMEOUT = 60000;

async function pollUntil(
  url: string,
  token: string,
  targetState: string,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request(ORDER_URL)
      .get(url)
      .set('Authorization', `Bearer ${token}`);
    if (res.body?.estado === targetState) return res.body as Record<string, unknown>;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }
  throw new Error(`Timed out waiting for estado=${targetState} at ${url}`);
}

describe('Full EDA Order Flow (e2e)', () => {
  let token: string;
  let pedidoId: string;

  beforeAll(() => {
    // Give services time to connect to LocalStack
  }, 15000);

  it('1. POST /auth/login returns JWT', async () => {
    const res = await request(ORDER_URL)
      .post('/auth/login')
      .send({ email: 'asistente@test.com', password: 'test123' });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    token = res.body.accessToken as string;
  });

  it('2. POST /boletas/vincular links boleta', async () => {
    const res = await request(ORDER_URL)
      .post('/boletas/vincular')
      .set('Authorization', `Bearer ${token}`)
      .send({ codigoQR: 'QR-ASISTENTE-001' });

    expect([200, 201, 400]).toContain(res.status); // 400 if already linked
  });

  it('3. POST /orders returns 202 with numeroPedido', async () => {
    // Get tienda ID first
    const tiendasRes = await request(ORDER_URL)
      .get('/tiendas')
      .set('Authorization', `Bearer ${token}`);
    expect(tiendasRes.status).toBe(200);
    const tiendaId = tiendasRes.body[0]?.id as string;

    const menuRes = await request(ORDER_URL)
      .get(`/tiendas/${tiendaId}/menu`)
      .set('Authorization', `Bearer ${token}`);
    expect(menuRes.status).toBe(200);
    const productoId = menuRes.body[0]?.id as string;

    const res = await request(ORDER_URL)
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ productoId, cantidad: 1 }],
        zona: 'C',
        fila: '8',
        asiento: '14',
      });

    expect(res.status).toBe(202);
    expect(res.body.numeroPedido).toBeDefined();
    pedidoId = res.body.pedidoId as string ?? res.body.numeroPedido as string;
  }, 10000);

  it('4. Poll GET /orders/:id until ENTREGADO (60s timeout)', async () => {
    if (!pedidoId) pending();

    // First find pedido ID from numeroPedido
    const misRes = await request(ORDER_URL)
      .get('/orders/mis-pedidos')
      .set('Authorization', `Bearer ${token}`);
    const pedido = (misRes.body as Array<{ numeroPedido: string; id: string }>)
      .find((p) => p.numeroPedido === pedidoId || p.id === pedidoId);
    const id = pedido?.id ?? pedidoId;

    const finalPedido = await pollUntil(`/orders/${id}`, token, 'ENTREGADO', TIMEOUT);
    expect(finalPedido.estado).toBe('ENTREGADO');
  }, TIMEOUT + 5000);

  it('5. Assert POST /webhook/mp with invalid signature returns 401', async () => {
    const res = await request(PAYMENT_URL)
      .post('/webhook/mp')
      .set('x-signature', 'ts=1,v1=invalidsig')
      .send({ type: 'payment' });

    expect(res.status).toBe(401);
  });

  it('6. Assert POST /webhook/stripe with invalid signature returns 401', async () => {
    const res = await request(PAYMENT_URL)
      .post('/webhook/stripe')
      .set('stripe-signature', 'invalid-signature')
      .send({ type: 'payment_intent.succeeded' });

    expect(res.status).toBe(401);
  });

  it('7. GET /health/metrics returns KR metrics', async () => {
    const res = await request(ORDER_URL).get('/health/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('KR1');
    expect(res.text).toContain('KR2');
    expect(res.text).toContain('KR3');
  });
});
