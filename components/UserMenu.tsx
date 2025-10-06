'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/db'

export default function UserMenu() {
  const [user, setUser] = useState<any>(null)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    // Ambil user aktif
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition"
      >
        <img
          src={user.user_metadata?.avatar_url}
          alt="profile"
          className="w-8 h-8 rounded-full"
        />
        <span className="text-sm font-medium text-gray-700">
          {user.user_metadata?.full_name || user.email}
        </span>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 shadow-lg rounded-xl p-3 z-50">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={user.user_metadata?.avatar_url}
              alt="profile"
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-semibold text-gray-800">
                {user.user_metadata?.full_name}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {user.user_metadata?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}