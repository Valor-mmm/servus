import { Hono } from 'hono'

export const healthRouter = new Hono<{ Bindings: Env }>()

healthRouter.get('/health', async (c) => {
  await c.env.DB.prepare('SELECT 1').run()
  return c.json({ status: 'ok' })
})
