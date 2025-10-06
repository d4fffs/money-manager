'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/db'
import toast, { Toaster } from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Cek user saat halaman dimuat
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    // Listener jika status login berubah
    const { data: listener } = supabase.auth.onAuthStateChange(async (_, session) => {
      const currentUser = session?.user
      setUser(currentUser ?? null)

      if (currentUser) {
        const exists = await checkProfileExists(currentUser)

        if (exists) {
          toast.success('Berhasil login 🎉')
          router.push('/')
        } else {
          toast.error('Akun belum terdaftar! Silakan daftar terlebih dahulu.')
          await supabase.auth.signOut()
          setUser(null)
        }
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [router])

  // 🔹 Cek apakah profil sudah ada di tabel profiles
  async function checkProfileExists(user: any) {
    const { data: existingProfile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error checking profile:', error.message)
      toast.error('Gagal memeriksa data akun. Coba lagi nanti.')
      return false
    }

    return !!existingProfile
  }

  // 🔹 Login (selalu tampilkan pilihan akun)
  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { queryParams: { prompt: 'select_account' } },
    })
    if (error) {
      console.error('Login Error:', error.message)
      toast.error(`Login gagal: ${error.message}`)
    } else {
      toast.loading('Mengalihkan ke Google...')
    }
  }

  // 🔹 Daftar (buat profil baru)
  async function handleGoogleSignup() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { queryParams: { prompt: 'select_account' } },
    })
    if (error) {
      console.error('Signup Error:', error.message)
      toast.error(`Gagal daftar: ${error.message}`)
    } else {
      toast.loading('Mengalihkan ke Google...')
    }
  }

  // 🔹 Logout
  async function handleLogout() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Logout Error:', error.message)
      toast.error(`Gagal logout: ${error.message}`)
    } else {
      setUser(null)
      toast.success('Berhasil logout 👋')
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