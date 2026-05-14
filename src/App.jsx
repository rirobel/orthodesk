import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'

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
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif',color:'#0C447C'}}>
      Chargement...
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={session ? <Dashboard session={session} /> : <Landing />} />
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
      <Route path="/*" element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} />
    </Routes>
  )
}