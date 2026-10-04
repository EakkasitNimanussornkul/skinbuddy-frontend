import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../api/index', () => ({
  apiClient: { get: vi.fn() },
}))

import { apiClient } from '../../api/index'
import { fetchMyRole } from '../../api/accountApi'
import { useAdmin, resetAdminState } from '../../composables/useAdmin'
import { useAuthStore } from '../../stores/auth'

const signIn = (token = 'token-1') => useAuthStore().setAuth(token, { id: 'u-1', skin_type: 'OSPW' })
const answersRole = (role: unknown) => vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'u-1', role } })

describe('src/composables/useAdmin.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
    resetAdminState()
  })

  describe('fetchMyRole()', () => {
    it('reads the role from GET /auth/me through apiClient', async () => {
      answersRole('admin')

      await expect(fetchMyRole()).resolves.toBe('admin')
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
    })

    it('reads an answer with no role as null rather than as a normal user', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'u-1' } })

      await expect(fetchMyRole()).resolves.toBeNull()
    })
  })

  describe('useAdmin()', () => {
    it('is an admin once the role for the current login reads admin', async () => {
      signIn()
      answersRole('admin')
      const { isAdmin, ensureRole } = useAdmin()

      expect(isAdmin.value).toBe(false)
      await expect(ensureRole()).resolves.toBe(true)
      expect(isAdmin.value).toBe(true)
    })

    it('is not an admin for a normal user', async () => {
      signIn()
      answersRole('user')
      const { isAdmin, ensureRole } = useAdmin()

      await expect(ensureRole()).resolves.toBe(false)
      expect(isAdmin.value).toBe(false)
    })

    it('answers false for a signed-out visitor without asking the backend', async () => {
      const { isAdmin, ensureRole } = useAdmin()

      await expect(ensureRole()).resolves.toBe(false)
      expect(isAdmin.value).toBe(false)
      expect(apiClient.get).not.toHaveBeenCalled()
    })

    it('asks once per login, sharing one request between callers and components', async () => {
      signIn()
      answersRole('admin')

      await Promise.all([useAdmin().ensureRole(), useAdmin().ensureRole()])
      await useAdmin().ensureRole()

      expect(apiClient.get).toHaveBeenCalledTimes(1)
      expect(useAdmin().isAdmin.value).toBe(true)
    })

    it('forgets the role when the login changes, and asks again for the new one', async () => {
      signIn('token-admin')
      answersRole('admin')
      const { isAdmin, ensureRole } = useAdmin()
      await ensureRole()
      expect(isAdmin.value).toBe(true)

      signIn('token-other')
      expect(isAdmin.value).toBe(false)

      answersRole('user')
      await expect(ensureRole()).resolves.toBe(false)
      expect(apiClient.get).toHaveBeenCalledTimes(2)
    })

    it('stops being an admin the moment the session is cleared', async () => {
      signIn()
      answersRole('admin')
      const { isAdmin, ensureRole } = useAdmin()
      await ensureRole()

      useAuthStore().clearSession()

      expect(isAdmin.value).toBe(false)
    })

    it('answers null, not false, when the role could not be read, and asks again next time', async () => {
      signIn()
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network Error'))
      const { isAdmin, ensureRole } = useAdmin()

      await expect(ensureRole()).resolves.toBeNull()
      expect(isAdmin.value).toBe(false)

      answersRole('admin')
      await expect(ensureRole()).resolves.toBe(true)
    })

    it('drops an answer that arrives after the login it was asked for has changed', async () => {
      signIn('token-old')
      let finish: (value: unknown) => void = () => {}
      vi.mocked(apiClient.get).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
      const { isAdmin, ensureRole } = useAdmin()

      const asked = ensureRole()
      signIn('token-new')
      finish({ data: { role: 'admin' } })

      await expect(asked).resolves.toBeNull()
      expect(isAdmin.value).toBe(false)
    })

    it('does not ask the backend after signing out, which would send /auth/me with no login', async () => {
      signIn()
      answersRole('admin')
      const { ensureRole } = useAdmin()
      await ensureRole()

      useAuthStore().clearSession()

      await expect(ensureRole()).resolves.toBe(false)
      expect(apiClient.get).toHaveBeenCalledTimes(1)
    })
  })
})
