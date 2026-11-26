import { t } from '@/i18n'

import { apiFetch } from './projects'

interface Account {
  readonly email: string | null
}

export async function getAccount(signal: AbortSignal): Promise<Account> {
  const response = await apiFetch('/api/session', { signal })
  if (!response.ok) {
    throw new Error(t('account.checkFailed'))
  }
  return response.json() as Promise<Account>
}

export async function authenticate(email: string, password: string, passwordConfirmation?: string): Promise<Account> {
  const registering = passwordConfirmation !== undefined
  const response = await apiFetch(registering ? '/api/registration' : '/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, password_confirmation: passwordConfirmation }),
  })
  if (response.status === 401) {
    throw new Error(t('account.invalidCredentials'))
  }
  if (response.status === 422 && registering) {
    throw new Error(t('account.registrationRejected'))
  }
  if (response.status === 429) {
    throw new Error(t('account.rateLimited'))
  }
  if (!response.ok) {
    throw new Error(registering ? t('account.registerFailed') : t('account.signInFailed'))
  }
  return response.json() as Promise<Account>
}

export async function signOut(): Promise<void> {
  const response = await apiFetch('/api/session', { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(t('account.signOutFailed'))
  }
}

export async function deleteAccount(): Promise<void> {
  const response = await apiFetch('/api/account', { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(t('account.deleteFailed'))
  }
}
