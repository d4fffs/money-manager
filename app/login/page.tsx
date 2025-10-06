'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/db'
import toast, { Toaster } from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Cek user saat halaman dimuat
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    // Listener perubahan status login
    const { data: listener } = supabase.auth.onAuthStateChange(async (_, session) => {
      const currentUser = session?.user
      setUser(currentUser ?? null)

      if (!currentUser) return

      const isSignup = searchParams.get('mode') === 'signup'
      const exists = await checkProfileExists(currentUser)

      if (isSignup) {
        // 🔹 Jika user sedang daftar tapi profil sudah ada
        if (exists) {
          toast.error('Akun sudah terdaftar! Silakan login.')
          await supabase.auth.signOut()
          setUser(null)
          router.replace('/login')
          return
        }

        // 🔹 Jika belum ada, buat profil baru
        await createProfile(currentUser)
        toast.success('Akun berhasil dibuat 🎉 Silakan login.')
        await supabase.auth.signOut()
        setUser(null)
        router.replace('/login')
        return
      }

      // 🔹 Jika sedang login tapi profil belum ada
      if (!isSignup && !exists) {
        toast.error('Akun belum didaftarkan! Silakan daftar terlebih dahulu.')
        await supabase.auth.signOut()
        setUser(null)
        return
      }

      // 🔹 Jika login berhasil
      if (!isSignup && exists) {
        toast.success('Berhasil login 🎉')
        router.push('/')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [router, searchParams])

  // 🔹 Cek apakah profil sudah ada
  async function checkProfileExists(user: any) {
    const { data: existingProfile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error checking profile:', error.message)
      toast.error('Gagal memeriksa akun.')
      return false
    }

    return !!existingProfile
  }

  // 🔹 Buat profil baru untuk user baru
  async function createProfile(user: any) {
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: user.user_metadata?.full_name || null,
      email: user.email,
    })
    if (error) console.error('Error creating profile:', error.message)
  }

  // 🔹 Login (selalu tampilkan pilihan akun)
  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: { prompt: 'select_account' },
        redirectTo: `${window.location.origin}/login?mode=login`,
      },
    })
    if (error) toast.error(`Login gagal: ${error.message}`)
    else toast.loading('Mengalihkan ke Google...')
  }

  // 🔹 Daftar (buat profil baru)
  async function handleGoogleSignup() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: { prompt: 'select_account' },
        redirectTo: `${window.location.origin}/login?mode=signup`,
      },
    })
    if (error) toast.error(`Gagal daftar: ${error.message}`)
    else toast.loading('Mengalihkan ke Google...')
  }

  // 🔹 Logout
  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) toast.error(`Gagal logout: ${error.message}`)
    else {
      setUser(null)
      toast.success('Berhasil logout 👋')
      router.replace('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
      <Toaster position="top-center" />
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-8 text-gray-800">Masuk / Daftar</h1>

        {!user ? (
          <>
            {/* 🔹 Tombol Daftar */}
            <button
              onClick={handleGoogleSignup}
              className="w-full py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold mb-6"
            >
              Daftar dengan Google
            </button>

            {/* 🔹 Teks Penjelasan */}
            <p className="text-gray-600 mb-6">
              Sudah memiliki akun? <br />
              Login dengan tombol di bawah ini
            </p>

            {/* 🔹 Tombol Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-semibold"
            >
              Login dengan Google
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-6 text-gray-700">
              Halo, {user.user_metadata.full_name || user.email}
            </h2>
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition font-semibold"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  )
}