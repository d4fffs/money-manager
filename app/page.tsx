'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/db'
import { useRouter } from 'next/navigation'
import AllowanceCard from '@/components/AllowanceCard'
import AddExpenseForm from '@/components/AddExpenseForm'
import Link from 'next/link'
import toast from 'react-hot-toast'

// 🔒 Proteksi halaman (cek login)
export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [allowance, setAllowance] = useState<any>(null)
  const [remaining, setRemaining] = useState(0)
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [globalLoading, setGlobalLoading] = useState(true)

  // Modal states
  const [showTambahModal, setShowTambahModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showWeeklyModal, setShowWeeklyModal] = useState(false)
  const [showWelcomePopup, setShowWelcomePopup] = useState(false)

  // Form inputs
  const [newSaldo, setNewSaldo] = useState('')
  const [weeklyLimit, setWeeklyLimit] = useState('')

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/login')
      } else {
        setUser(data.user)
        fetchData().then(() => {
          setGlobalLoading(false)
          setTimeout(() => setShowWelcomePopup(true), 500)
        })
      }
    }
    checkUser()
  }, [router])

  async function fetchData() {
    const { data: a, error: allowanceError } = await supabase
      .from('allowances')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (allowanceError) {
      console.error(allowanceError)
      return
    }

    setAllowance(a)

    if (a) {
      const { data: ex, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('allowance_id', a.id)
        .order('date', { ascending: false })

      if (expenseError) console.error(expenseError)

      setExpenses(ex || [])
      const totalSpent = (ex || []).reduce((s, row) => s + Number(row.amount), 0)
      setRemaining(Number(a.remaining_amount ?? Number(a.total_amount) - totalSpent))
    }
  }

  // Tambah saldo
  async function tambahSaldo() {
    if (!newSaldo || isNaN(Number(newSaldo))) {
      toast.error('Masukkan nominal saldo yang valid')
      return
    }

    setLoading(true)
    try {
      if (allowance) {
        const { error } = await supabase
          .from('allowances')
          .update({
            total_amount: allowance.total_amount + Number(newSaldo),
            remaining_amount: allowance.remaining_amount + Number(newSaldo),
          })
          .eq('id', allowance.id)

        if (error) throw error
        toast.success('Saldo berhasil ditambahkan!')
      } else {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 25)
        const end = new Date(start)
        end.setMonth(start.getMonth() + 1)
        end.setDate(24)

        const { error } = await supabase.from('allowances').insert([{
          period_start: start.toISOString().split('T')[0],
          period_end: end.toISOString().split('T')[0],
          total_amount: Number(newSaldo),
          remaining_amount: Number(newSaldo),
        }])
        if (error) throw error
        toast.success('Saldo baru berhasil dibuat!')
      }

      setShowTambahModal(false)
      setNewSaldo('')
      fetchData()
    } catch (err: any) {
      console.error(err)
      toast.error('Gagal menambahkan saldo!')
    } finally {
      setLoading(false)
    }
  }

  // Edit saldo
  async function editSaldo() {
    if (!newSaldo || isNaN(Number(newSaldo))) {
      toast.error('Masukkan nominal saldo yang valid')
      return
    }

    if (!allowance) {
      toast.error('Belum ada saldo untuk diedit!')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('allowances')
        .update({
          total_amount: Number(newSaldo),
          remaining_amount: Number(newSaldo),
        })
        .eq('id', allowance.id)

      if (error) throw error
      toast.success('Saldo berhasil diedit!')

      setShowEditModal(false)
      setNewSaldo('')
      fetchData()
    } catch (err: any) {
      console.error(err)
      toast.error('Gagal mengedit saldo!')
    } finally {
      setLoading(false)
    }
  }

  // Proteksi sementara loading user
  if (!user || globalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">
        Loading...
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 md:p-8 relative">
      {/* Tombol logout di kanan atas */}

      <div className="max-w-6xl mx-auto opacity-80">
        <AllowanceCard allowance={allowance} remaining={remaining} />

        <div className="mt-6 flex flex-col md:flex-row items-center gap-4">
          <button
            onClick={() => setShowTambahModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all"
          >
            ➕ Tambah Saldo
          </button>

          <button
            onClick={() => setShowEditModal(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all"
          >
            ✏️ Edit Saldo
          </button>

          <button
            onClick={() => setShowWeeklyModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all"
          >
            🔵 Tambah Limit Mingguan
          </button>
        </div>

        {/* Komponen lainnya tetap sama */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tambah Pengeluaran</h2>
            <AddExpenseForm onAdded={fetchData} validateExpense={() => true} />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Ringkasan</h2>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-5 border border-red-100">
                <p className="text-sm text-gray-600 mb-1">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-gray-800">
                  Rp {expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                <p className="text-sm text-gray-600 mb-1">Sisa Saldo</p>
                <p className="text-2xl font-bold text-green-700">
                  Rp {remaining.toLocaleString()}
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <Link href="/history" className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition">
                      <svg
                        className="w-5 h-5 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Riwayat Periode</p>
                      <p className="text-indigo-600 font-semibold group-hover:text-indigo-700 transition">
                        Lihat semua transaksi →
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}