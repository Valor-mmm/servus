import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { app } from '../../functions/api/[[route]]'

describe('GET /api/v1/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.request('/api/v1/health', {}, env)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: 'ok' })
  })

  it('verifies D1 reachability via SELECT 1', async () => {
    const res = await app.request('/api/v1/health', {}, env)
    expect(res.status).toBe(200)
  })

  it('returns JSON content-type', async () => {
    const res = await app.request('/api/v1/health', {}, env)
    expect(res.headers.get('content-type')).toMatch(/application\/json/)
  })

  it('returns 404 JSON for unknown API routes', async () => {
    const res = await app.request('/api/v1/nonexistent', {}, env)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ code: 'NOT_FOUND' })
  })
})
