import { describe, it, expect } from 'vitest'

import { readApiProblem } from '../../api/apiProblem'

const failed = (status: number, data: unknown) => ({ response: { status, data } })

describe('src/api/apiProblem.ts', () => {
  describe('readApiProblem()', () => {
    it('reads a route error as its status and detail text, with no code and no field problems', () => {
      expect(readApiProblem(failed(403, { detail: 'Admin access required' }))).toEqual({
        status: 403,
        detail: 'Admin access required',
        code: null,
        details: null,
        fields: [],
      })
    })

    it('reads a database-function error with its code and the details exactly as sent', () => {
      const problem = readApiProblem(
        failed(422, { detail: 'unknown ingredient_id', code: 'SBUNK', details: ['id-1', 'id-2'] }),
      )

      expect(problem.code).toBe('SBUNK')
      expect(problem.detail).toBe('unknown ingredient_id')
      expect(problem.details).toEqual(['id-1', 'id-2'])
    })

    it('turns a Pydantic 422 list into field problems named by their path below the body', () => {
      const problem = readApiProblem(
        failed(422, {
          detail: [
            { loc: ['body', 'ingredients', 2, 'new_name'], msg: 'String should have at most 120 characters', type: 'string_too_long' },
            { loc: ['body', 'sources', 0, 'url'], msg: 'Value error, must be an http(s) URL', type: 'value_error' },
          ],
        }),
      )

      expect(problem.detail).toBeNull()
      expect(problem.fields).toEqual([
        { field: 'ingredients.2.new_name', message: 'String should have at most 120 characters' },
        { field: 'sources.0.url', message: 'Must be an http(s) URL' },
      ])
    })

    it('skips list entries that are not field problems rather than inventing a message', () => {
      const problem = readApiProblem(failed(422, { detail: [null, 'text', { loc: ['body', 'name'] }, { loc: ['body', 'brand'], msg: 'Field required' }] }))

      expect(problem.fields).toEqual([{ field: 'brand', message: 'Field required' }])
    })

    it('reports no status at all when no answer arrived, which is not the same as a server error', () => {
      expect(readApiProblem(new Error('Network Error'))).toEqual({
        status: null,
        detail: null,
        code: null,
        details: null,
        fields: [],
      })
    })

    it('reads an answer with no body, or a text body, without throwing', () => {
      expect(readApiProblem(failed(500, undefined)).status).toBe(500)
      expect(readApiProblem(failed(502, '<html>Bad gateway</html>')).detail).toBeNull()
      expect(readApiProblem(null).status).toBeNull()
    })
  })
})
