import { redirect } from 'next/navigation'
import { auth, loginProviders } from '@/auth'
import LoginForm from '@/components/auth/LoginForm'
import './login.css'

export const metadata = {
  title: 'Sign in — AI Toolbox',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  if (session?.user) redirect('/')

  const sp = await searchParams
  let callbackUrl = '/'
  if (typeof sp.callbackUrl === 'string' && sp.callbackUrl.startsWith('/') && !sp.callbackUrl.startsWith('//')) {
    callbackUrl = sp.callbackUrl
  }

  return <LoginForm providers={loginProviders()} callbackUrl={callbackUrl} />
}