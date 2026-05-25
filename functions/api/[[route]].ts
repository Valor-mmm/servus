import { handle } from 'hono/cloudflare-pages'
import { Hono } from 'hono'
import { healthRouter } from '../../src/health/handler'

export const app = new Hono<{ Bindings: Env }>()

app.route('/api/v1', healthRouter)

app.notFound((c) => c.json({ code: 'NOT_FOUND' }, 404))

export const onRequest = handle(app)
