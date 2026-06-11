import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import AdminInvite from './pages/AdminInvite'
import Onboarding from './pages/Onboarding'
import ResetPassword from './pages/ResetPassword'

const ADMIN_EMAIL = 'robel.maroc@gmail.com'

function AppWithOnboarding({ session }) {
  const key = `ortho_onboarded_${session.user.id}`
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem(key))

  if (!onboarded) {
    return <Onboarding session={session} onDone={() => setOnboarded(true)} />
  }
  return <Dashboard session={session} />
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'sans-serif', color:'#0C447C' }}>
      Chargement...
    </div>
  )

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  return (
    <Routes>
      <Route path="/" element={session ? <AppWithOnboarding session={session} /> : <Landing />} />
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />

      {/* Page reset mot de passe — accessible sans session (lien email) */}
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Page admin */}
      <Route
        path="/admin"
        element={
          !session
            ? <Navigate to="/login" />
            : isAdmin
              ? <AdminInvite session={session} />
              : <Navigate to="/" />
        }
      />

      <Route
        path="/*"
        element={session ? <AppWithOnboarding session={session} /> : <Navigate to="/login" />}
      />
    </Routes>
  )
}