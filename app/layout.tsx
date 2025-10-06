import './globals.css'
import ToasterClient from '@/components/ToasterClient'
import { supabase } from '@/lib/db'
import UserMenu from '@/components/UserMenu'

export const metadata = {
  title: 'Money Manager',
  description: 'Manage allowance 25–25 with weekly limit',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html lang="id">
      <body className="bg-gradient-to-br from-slate-50 to-gray-100 min-h-screen">
        <div className="min-h-screen">
          <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-6xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                      Money Manager
                    </h1>
                    {user && (
                      <p className="text-sm text-gray-500 mt-1">
                        Halo, {user.user_metadata.full_name || user.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Komponen user menu di kanan */}
                <UserMenu />
              </div>
            </div>
          </header>

          <main>{children}</main>
        </div>
        <ToasterClient />
      </body>
    </html>
  )
}