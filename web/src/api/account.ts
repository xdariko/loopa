import { apiFetch } from './projects'

interface Account {
  readonly email: string | null
}

export async function getAccount(signal: AbortSignal): Promise<Account> {
  const response = await apiFetch('/api/session', { signal })
  if (!response.ok) {
    throw new Error('Не удалось проверить, выполнен ли вход.')
  }
  return response.json() as Promise<Account>
}

export async function authenticate(
  email: string,
  password: string,
  passwordConfirmation?: string,
): Promise<Account> {
  const registering = passwordConfirmation !== undefined
  const response = await apiFetch(registering ? '/api/registration' : '/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, password_confirmation: passwordConfirmation }),
  })
  if (response.status === 401) {
    throw new Error('Неверный адрес электронной почты или пароль.')
  }
  if (response.status === 422 && registering) {
    throw new Error('Проверьте адрес и пароль. Возможно, аккаунт с таким адресом уже существует.')
  }
  if (response.status === 429) {
    throw new Error('Слишком много попыток. Попробуйте через несколько минут.')
  }
  if (!response.ok) {
    throw new Error(registering ? 'Не удалось создать аккаунт.' : 'Не удалось войти.')
  }
  return response.json() as Promise<Account>
}

export async function signOut(): Promise<void> {
  const response = await apiFetch('/api/session', { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Не удалось выйти из аккаунта.')
  }
}
