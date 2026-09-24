import { useEffect } from 'react'
import { payloadOf, useProgress } from '../store/progress'
import { pullProgress, pushProgress, subscribeProgress } from './cloud'

const PUSH_DELAY_MS = 1200

let flush: () => Promise<void> = async () => undefined
let stop: () => void = () => undefined

/** Немедленно сохраняет несохранённые изменения в аккаунт (например, перед выходом). */
export function flushCloudSync() {
  return flush()
}

/** Останавливает синхронизацию сразу (при выходе — до очистки устройства). */
export function stopCloudSync() {
  stop()
}

/**
 * Синхронизирует прогресс с аккаунтом, пока пользователь вошёл.
 *
 * Каждое сохранение устроено как «скачать — объединить — записать»: сначала
 * берём то, что лежит в облаке (вдруг там решения с телефона), объединяем с
 * тем, что на этом устройстве, и записываем результат. Поэтому ни одно
 * устройство не затирает прогресс другого. Правки с других устройств
 * приходят сразу через realtime-подписку.
 */
export function useCloudSync(userId: string | null, onStatus: (status: 'syncing' | 'synced' | 'error') => void) {
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastPushed: string | null = null
    let queue: Promise<void> = Promise.resolve()

    const sync = async () => {
      if (cancelled) return
      onStatus('syncing')
      try {
        const remote = await pullProgress(userId)
        if (cancelled) return
        if (remote) useProgress.getState().mergeRemote(remote)
        const payload = payloadOf(useProgress.getState())
        const json = JSON.stringify(payload)
        if (json !== lastPushed) {
          await pushProgress(userId, payload)
          lastPushed = json
        }
        if (!cancelled) onStatus('synced')
      } catch {
        if (!cancelled) onStatus('error')
      }
    }
    // Сохранения идут строго друг за другом.
    const run = () => (queue = queue.then(sync))
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(run, PUSH_DELAY_MS)
    }

    run()

    const unsubscribeStore = useProgress.subscribe((s, prev) => {
      if (s.records !== prev.records || s.seen !== prev.seen || s.placements !== prev.placements || s.days !== prev.days) schedule()
    })
    const unsubscribeRemote = subscribeProgress(userId, (remote) => {
      useProgress.getState().mergeRemote(remote)
    })
    // Уходя со вкладки, сохраняем; возвращаясь — подтягиваем то, что решено на других устройствах.
    const onHide = () => {
      clearTimeout(timer)
      run()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('online', schedule)
    flush = () => {
      clearTimeout(timer)
      return run()
    }
    stop = () => {
      cancelled = true
      clearTimeout(timer)
    }

    return () => {
      cancelled = true
      clearTimeout(timer)
      unsubscribeStore()
      unsubscribeRemote()
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('online', schedule)
      flush = async () => undefined
      stop = () => undefined
    }
  }, [userId, onStatus])
}
