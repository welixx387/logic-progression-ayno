import { useEffect } from 'react'
import { Footer, Header, MobileNav } from './components/Header'
import { RankToast } from './components/RankToast'
import { useCloudSync } from './lib/cloudSync'
import { isCategory } from './content/categories'
import { MODULE_BY_ID } from './content/modules'
import { match, navigate, useRoute } from './lib/router'
import { useAppliedTheme } from './lib/theme'
import { Account } from './pages/Account'
import { CategoryPage } from './pages/CategoryPage'
import { Course } from './pages/Course'
import { Landing } from './pages/Landing'
import { ModulePage } from './pages/ModulePage'
import { NotFound } from './pages/NotFound'
import { PlacementTest } from './pages/PlacementTest'
import { Practice } from './pages/Practice'
import { Progress } from './pages/Progress'
import { TaskPage } from './pages/TaskPage'
import { useAuth } from './store/auth'
import { dailyTask } from './store/progress'
import type { CategoryId, ModuleId } from './types'

/** Перенаправление со старых адресов на новые. */
function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, true), [to])
  return null
}

/** Направление из старых ссылок вида ?c=… или ?m=тема. */
function categoryFrom(query: URLSearchParams): CategoryId {
  const c = query.get('c')
  if (isCategory(c)) return c
  const m = (query.get('m') ?? '').split(',')[0]
  return m in MODULE_BY_ID ? MODULE_BY_ID[m as ModuleId].category : 'logic'
}

function Screen({ path, query }: { path: string; query: URLSearchParams }) {
  if (path === '/') return <Landing />
  if (path === '/course') return isCategory(query.get('c')) ? <Redirect to={`/c/${query.get('c')}`} /> : <Course />
  if (path === '/practice') {
    const rest = new URLSearchParams(query)
    rest.delete('c')
    return <Redirect to={`/c/${categoryFrom(query)}/practice${rest.toString() ? `?${rest}` : ''}`} />
  }
  if (path === '/test') return <Redirect to={`/c/${categoryFrom(query)}/test`} />
  if (path === '/progress') return <Progress />
  if (path === '/account') return <Account />
  if (path === '/daily') return <TaskPage id={dailyTask().id} daily />
  const cat = match('/c/:id', path) ?? match('/c/:id/:section', path)
  if (cat && isCategory(cat.id)) {
    const c = cat.id
    if (!cat.section) return <CategoryPage category={c} />
    if (cat.section === 'practice') return <Practice key={query.toString()} query={query} category={c} />
    if (cat.section === 'test') return <PlacementTest category={c} />
    if (cat.section === 'daily') return <TaskPage id={dailyTask(new Date(), c).id} daily />
  }
  const mod = match('/module/:id', path)
  if (mod) return <ModulePage id={mod.id} levelParam={query.get('l')} />
  const task = match('/task/:id', path)
  if (task) return <TaskPage id={task.id} />
  return <NotFound />
}

export default function App() {
  const { path, query } = useRoute()
  const theme = useAppliedTheme()
  const authStatus = useAuth((s) => s.status)
  const userId = useAuth((s) => s.user?.id ?? null)
  const setSync = useAuth((s) => s.setSync)
  useEffect(() => useAuth.getState().init(), [])
  useCloudSync(authStatus === 'authed' ? userId : null, setSync)
  return (
    <div className="flex min-h-screen flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <Header path={path} theme={theme} />
      <main className="flex-1">
        {/* Ключ по адресу: при переходе новая страница плавно появляется. */}
        <div key={path} className="animate-page">
          <Screen path={path} query={query} />
        </div>
      </main>
      <RankToast />
      <Footer />
      <MobileNav path={path} />
    </div>
  )
}
