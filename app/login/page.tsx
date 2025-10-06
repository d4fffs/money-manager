'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/db'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) {
        router.push('/')  // jika sudah login, redirect ke halaman utama
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [router])

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    })
    if (error) console.error('Auth Error:', error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-6">Masuk</h1>
        <button
          onClick={handleGoogleLogin}
          className="w-full py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
        >
          Login dengan Google
        </button>
      </div>
    </div>
  )
}