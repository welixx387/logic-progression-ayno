import { Cloud, CloudOff, Eye, EyeOff, Laptop, Loader2, LogOut, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Page } from '../components/ui'
import { flushCloudSync } from '../lib/cloudSync'
import { Link } from '../lib/router'
import { displayName, useAuth } from '../store/auth'
import { solvedCount, useProgress } from '../store/progress'
import { TASKS } from '../lib/catalog'

type Mode = 'signin' | 'signup' | 'reset'

function Field({ id, label, children, hint }: { id: string; label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none transition placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20'

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={6}
        required
        className={`${inputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink"
        aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  )
}

function Benefits() {
  return (
    <div className="space-y-4">
      <p className="eyebrow">Аккаунт</p>
      <h1 className="h-display text-2xl sm:text-3xl">Прогресс на всех устройствах</h1>
      <p className="leading-relaxed text-muted">Войдите с одним и тем же email на компьютере и на телефоне — решённые задачи, опыт и серия дней будут одинаковыми везде.</p>
      <ul className="space-y-3 text-sm">
        {[
          [Laptop, 'Начали на компьютере — продолжайте с телефона.'],
          [ShieldCheck, 'Прогресс не пропадёт, если очистить браузер или сменить устройство.'],
          [Smartphone, 'То, что вы уже решили без входа, добавится в аккаунт.'],
        ].map(([Icon, text]) => {
          const I = Icon as typeof Laptop
          return (
            <li key={text as string} className="flex gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <I size={16} />
              </span>
              <span className="pt-1.5">{text as string}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function AuthForms() {
  const signIn = useAuth((s) => s.signIn)
  const signUp = useAuth((s) => s.signUp)
  const sendReset = useAuth((s) => s.sendReset)
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setNotice(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (mode === 'signup' && password !== confirm) return setError('Пароли не совпадают.')
    setPending(true)
    try {
      if (mode === 'signin') {
        const r = await signIn(email, password)
        setError(r.error)
      } else if (mode === 'signup') {
        const r = await signUp(name, email, password)
        setError(r.error)
        if (!r.error && r.needsConfirm) setNotice(`Мы отправили письмо на ${email.trim()}. Откройте его, нажмите ссылку — и войдите с этим email и паролем.`)
      } else {
        const r = await sendReset(email)
        setError(r.error)
        if (!r.error) setNotice(`Письмо со ссылкой для нового пароля отправлено на ${email.trim()}. Откройте ссылку на этом же устройстве.`)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="card p-5 sm:p-7">
      {mode !== 'reset' ? (
        <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1" role="tablist">
          {(
            [
              ['signin', 'Вход'],
              ['signup', 'Регистрация'],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`rounded-lg py-2 text-sm font-bold transition ${mode === m ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <h2 className="font-bold">Восстановление пароля</h2>
          <p className="mt-1 text-sm text-muted">Укажите email — пришлём ссылку, по которой можно задать новый пароль.</p>
        </div>
      )}

      <form onSubmit={submit} className="mt-5 space-y-4">
        {mode === 'signup' && (
          <Field id="auth-name" label="Имя" hint="Необязательно — так мы будем к вам обращаться.">
            <input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" maxLength={40} className={inputClass} />
          </Field>
        )}
        <Field id="auth-email" label="Email">
          <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className={inputClass} placeholder="you@example.com" />
        </Field>
        {mode !== 'reset' && (
          <Field id="auth-password" label="Пароль" hint={mode === 'signup' ? 'Не короче 6 символов.' : undefined}>
            <PasswordInput id="auth-password" value={password} onChange={setPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </Field>
        )}
        {mode === 'signup' && (
          <Field id="auth-confirm" label="Пароль ещё раз">
            <PasswordInput id="auth-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          </Field>
        )}

        {error && (
          <p className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm font-semibold text-bad" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-xl bg-good-soft px-3.5 py-2.5 text-sm font-semibold text-good" role="status">
            {notice}
          </p>
        )}

        <button type="submit" className="btn-primary w-full py-3" disabled={pending}>
          {pending && <Loader2 size={17} className="animate-spin" />}
          {mode === 'signin' ? 'Войти' : mode === 'signup' ? 'Зарегистрироваться' : 'Отправить ссылку'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        {mode === 'signin' && (
          <button className="font-semibold text-accent hover:underline" onClick={() => switchMode('reset')}>
            Забыли пароль?
          </button>
        )}
        {mode === 'reset' && (
          <button className="font-semibold text-accent hover:underline" onClick={() => switchMode('signin')}>
            ← Вернуться ко входу
          </button>
        )}
      </div>
    </div>
  )
}

function NewPassword() {
  const setNewPassword = useAuth((s) => s.setNewPassword)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <div className="card p-5 sm:p-7">
      <h2 className="font-bold">Новый пароль</h2>
      <p className="mt-1 text-sm text-muted">Придумайте новый пароль для входа.</p>
      <form
        className="mt-5 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setPending(true)
          const r = await setNewPassword(password)
          setPending(false)
          setError(r.error)
        }}
      >
        <Field id="new-password" label="Новый пароль" hint="Не короче 6 символов.">
          <PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        {error && (
          <p className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm font-semibold text-bad" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full py-3" disabled={pending}>
          Сохранить пароль
        </button>
      </form>
    </div>
  )
}

function Profile() {
  const user = useAuth((s) => s.user)
  const syncStatus = useAuth((s) => s.syncStatus)
  const lastSyncedAt = useAuth((s) => s.lastSyncedAt)
  const updateName = useAuth((s) => s.updateName)
  const signOut = useAuth((s) => s.signOut)
  const records = useProgress((s) => s.records)
  const xp = useProgress((s) => s.xp)
  const [name, setName] = useState(displayName(user))
  const [saved, setSaved] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const shown = displayName(user)

  return (
    <div className="card p-5 sm:p-7">
      <div className="flex items-center gap-4">
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent font-display text-xl font-semibold text-accent-ink">
          {shown.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{shown}</p>
          <p className="truncate text-sm text-muted">{user?.email}</p>
        </div>
      </div>

      <div className={`mt-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${syncStatus === 'error' ? 'bg-bad-soft text-bad' : 'bg-surface-2'}`} role="status">
        {syncStatus === 'error' ? <CloudOff size={18} /> : syncStatus === 'syncing' ? <Loader2 size={18} className="animate-spin text-accent" /> : <Cloud size={18} className="text-good" />}
        <span className="flex-1 font-semibold">
          {syncStatus === 'error'
            ? 'Не удалось сохранить — нет связи. Попробуем снова, как только появится интернет.'
            : syncStatus === 'syncing'
              ? 'Сохраняем прогресс…'
              : `Прогресс сохранён в аккаунте${lastSyncedAt ? ` · ${new Date(lastSyncedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
        </span>
        {syncStatus === 'error' && (
          <button className="btn-quiet px-2 py-1 text-bad" onClick={() => flushCloudSync()} aria-label="Повторить">
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      <p className="mt-4 text-sm text-muted">
        В аккаунте: {solvedCount(records, TASKS)} задач курса, {Object.entries(records).filter(([id, r]) => id.startsWith('g-') && r.solved).length} новых задач, {xp} XP. Чтобы
        продолжить на другом устройстве, откройте там сайт и войдите с этим же email.
      </p>

      <form
        className="mt-6 flex flex-wrap items-end gap-2 border-t border-line pt-5"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await updateName(name)
          setSaved(r.error ?? 'Имя сохранено.')
        }}
      >
        <div className="min-w-0 flex-1">
          <Field id="profile-name" label="Имя">
            <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={inputClass} />
          </Field>
        </div>
        <button type="submit" className="btn-ghost py-2.5">
          Сохранить
        </button>
      </form>
      {saved && <p className="mt-2 text-sm font-semibold text-accent">{saved}</p>}

      <div className="mt-6 border-t border-line pt-5">
        {leaving ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 p-3 text-sm">
            <span className="flex-1 font-semibold">Выйти? Прогресс останется в аккаунте, а с этого устройства сотрётся.</span>
            <button className="btn-primary px-3 py-1.5" onClick={() => signOut()}>
              Выйти
            </button>
            <button className="btn-quiet px-3 py-1.5" onClick={() => setLeaving(false)}>
              Отмена
            </button>
          </div>
        ) : (
          <button className="btn-quiet text-muted" onClick={() => setLeaving(true)}>
            <LogOut size={16} /> Выйти из аккаунта
          </button>
        )}
      </div>
    </div>
  )
}

export function Account() {
  const status = useAuth((s) => s.status)
  const recovery = useAuth((s) => s.recovery)

  if (status === 'off') {
    return (
      <Page className="py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,460px)] lg:items-start lg:gap-14">
          <Benefits />
          <div className="order-first space-y-4 lg:order-none">
            <div className="card animate-fade-up p-5 sm:p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-warn-soft text-warn">
                <CloudOff size={20} />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold">Вход скоро заработает</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Владелец сайта ещё не подключил хранилище аккаунтов. Пока прогресс хранится в этом браузере — ничего не потеряется. Перенести его на другое устройство можно
                через файл в разделе{' '}
                <Link to="/progress" className="font-semibold text-accent hover:underline">
                  «Прогресс»
                </Link>
                .
              </p>
            </div>
            <details className="card group animate-fade-up p-5 sm:p-6" style={{ animationDelay: '90ms' }}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
                Для владельца сайта: как включить вход
                <span className="text-muted transition group-open:rotate-180">▾</span>
              </summary>
              <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-muted">
                <li>
                  Откройте проект сайта на <b className="text-ink">vercel.com</b> → вкладка <b className="text-ink">Storage</b> → <b className="text-ink">Create Database</b> →{' '}
                  <b className="text-ink">Supabase</b>. Выберите бесплатный план и создайте базу.
                </li>
                <li>
                  Подключите её к этому проекту (<b className="text-ink">Connect Project</b>) — Vercel сам добавит все ключи.
                </li>
                <li>
                  Откройте <b className="text-ink">Deployments</b> → последнюю сборку → <b className="text-ink">⋯ → Redeploy</b>.
                </li>
              </ol>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Всё остальное сайт сделает сам: при сборке создаст таблицу для прогресса, а регистрация будет работать сразу, без писем с подтверждением.
              </p>
            </details>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page className="py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,440px)] lg:items-start lg:gap-14">
        <Benefits />
        <div className="order-first lg:order-none">
          {status === 'loading' ? (
            <div className="card flex items-center justify-center gap-3 p-10 text-muted">
              <Loader2 size={20} className="animate-spin text-accent" /> Проверяем вход…
            </div>
          ) : status === 'authed' ? (
            recovery ? (
              <NewPassword />
            ) : (
              <Profile />
            )
          ) : (
            <AuthForms />
          )}
        </div>
      </div>
    </Page>
  )
}
