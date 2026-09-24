import { useEffect } from 'react'
import { Footer, Header, MobileNav } from './components/Header'
import { RankToast } from './components/RankToast'
import { useCloudSync } from './lib/cloudSync'
import { match, useRoute } from './lib/router'
import { useAppliedTheme } from './lib/theme'
import { Account } from './pages/Account'
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

function Screen({ path, query }: { path: string; query: URLSearchParams }) {
  if (path === '/') return <Landing />
  if (path === '/course') return <Course categoryParam={query.get('c')} />
  if (path === '/practice') return <Practice key={query.toString()} query={query} />
  if (path === '/test') return <PlacementTest categoryParam={query.get('c')} />
  if (path === '/progress') return <Progress />
  if (path === '/account') return <Account />
  if (path === '/daily') return <TaskPage id={dailyTask().id} daily />
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
    <div className="flex min-h-screen flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
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
