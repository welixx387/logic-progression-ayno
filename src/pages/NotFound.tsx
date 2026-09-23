import { Page } from '../components/ui'
import { Link } from '../lib/router'

export function NotFound() {
  return (
    <Page className="py-24 text-center">
      <p className="font-display text-6xl font-semibold text-accent">404</p>
      <h1 className="h-display mt-4 text-2xl">Такой страницы нет</h1>
      <p className="mt-2 text-muted">Возможно, ссылка устарела. Вернитесь к курсу — задачи ждут.</p>
      <Link to="/course" className="btn-primary mt-6">
        К курсу
      </Link>
    </Page>
  )
}
