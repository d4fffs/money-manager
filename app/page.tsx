'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/db'
import AllowanceCard from '@/components/AllowanceCard'
import AddExpenseForm from '@/components/AddExpenseForm'
import Link from 'next/link'
import toast from 'react-hot-toast'

// Component modal saldo reusable
function SaldoModal({
  title,
  value,
  onChange,
  onClose,
  onSubmit,
  loading,
  btnColor = 'yellow',
}: {
  title: string
  value: string
  onChange: (v: string) => void
  onClose: () => void
  onSubmit: () => void
  loading: boolean
  btnColor?: 'yellow' | 'green'
}) {
  const colorClass =
    btnColor === 'green' ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-[90%] max-w-md">
        <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
        <input
          type="number"
          placeholder="Masukkan jumlah saldo (Rp)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
          >
            Batal
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white font-semibold transition disabled:opacity-50 ${colorClass}`}
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
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
    fetchData().then(() => {
      setGlobalLoading(false)
      setTimeout(() => setShowWelcomePopup(true), 500)
    })
  }, [])

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

        const { error } = await supabase.from('allowances').insert([
          {
            period_start: start.toISOString().split('T')[0],
            period_end: end.toISOString().split('T')[0],
            total_amount: Number(newSaldo),
            remaining_amount: Number(newSaldo),
          },
        ])
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

  async function addWeeklyPeriod() {
    if (!weeklyLimit || isNaN(Number(weeklyLimit))) {
      toast.error('Masukkan limit mingguan yang valid')
      return
    }

    if (!allowance) {
      toast.error('Tambahkan saldo utama terlebih dahulu!')
      return
    }

    setLoading(true)
    try {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(startDate.getDate() + 6)

      const startStr = startDate.toISOString().split('T')[0]
      const endStr = endDate.toISOString().split('T')[0]

      const { data: existingPeriods, error: periodError } = await supabase
        .from('weekly_periods')
        .select('*')
        .eq('allowance_id', allowance.id)
        .or(`start_date.lte.${endStr},end_date.gte.${startStr}`)

      if (periodError) throw periodError
      if (existingPeriods && existingPeriods.length > 0) {
        toast.error('Gagal: sudah ada periode mingguan yang overlap!')
        setLoading(false)
        return
      }

      const { error } = await supabase.from('weekly_periods').insert([
        {
          allowance_id: allowance.id,
          start_date: startStr,
          end_date: endStr,
          weekly_limit: Number(weeklyLimit),
        },
      ])

      if (error) throw error

      toast.success('Periode mingguan berhasil dibuat!')
      setWeeklyLimit('')
      setShowWeeklyModal(false)
    } catch (err: any) {
      console.error(err)
      toast.error('Gagal membuat periode mingguan!')
    } finally {
      setLoading(false)
    }
  }

  async function validateWeeklyExpense(amount: number) {
    if (!allowance) {
      toast.error('Belum ada periode aktif!')
      return false
    }

    const today = new Date().toISOString().split('T')[0]

    const { data: weekData } = await supabase
      .from('weekly_periods')
      .select('*')
      .eq('allowance_id', allowance.id)
      .lte('start_date', today)
      .gte('end_date', today)
      .limit(1)
      .single()

    if (!weekData) return true

    const totalSpent = expenses
      .filter((e) => e.date >= weekData.start_date && e.date <= weekData.end_date)
      .reduce((s, e) => s + Number(e.amount), 0)

    if (totalSpent + amount > Number(weekData.weekly_limit)) {
      toast.error(
        `Pengeluaran gagal: melebihi limit mingguan (${Number(
          weekData.weekly_limit
        ).toLocaleString()})!`
      )
      return false
    }

    return true
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 md:p-8 relative">
      {/* Loading fullscreen */}
      {globalLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
      )}

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

        {/* Popup welcome */}
        {showWelcomePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-[90%] max-w-md text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Selamat datang!</h3>
              <p className="text-gray-600 mb-6">
                Berikut adalah cara menggunakan aplikasi ini:
                <br />1. Masukkan Saldo yang anda miliki.
                <br />2. Tetapkan limit mingguan sesuai keinginan anda.
                <br />3. Masukkan setiap pengeluaran yang anda lakukan, tidak boleh melebihi limit mingguan (ANDA HARUS HEMAT).
                <br />4. Anda bisa melihat semua riwayat limit mingguan beserta detail pengeluaran di bagian kanan bawah.
              </p>
              <button
                onClick={() => setShowWelcomePopup(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Modal Saldo */}
        {showTambahModal && (
          <SaldoModal
            title="Tambah Saldo"
            value={newSaldo}
            onChange={setNewSaldo}
            onClose={() => setShowTambahModal(false)}
            onSubmit={tambahSaldo}
            loading={loading}
            btnColor="green"
          />
        )}

        {showEditModal && (
          <SaldoModal
            title="Edit Saldo"
            value={newSaldo}
            onChange={setNewSaldo}
            onClose={() => setShowEditModal(false)}
            onSubmit={editSaldo}
            loading={loading}
            btnColor="yellow"
          />
        )}

        {/* Modal tambah periode mingguan */}
        {showWeeklyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-[90%] max-w-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Tambah Periode Mingguan</h3>
              <input
                type="number"
                placeholder="Masukkan limit mingguan (Rp)"
                value={weeklyLimit}
                onChange={(e) => setWeeklyLimit(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowWeeklyModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                >
                  Batal
                </button>
                <button
                  onClick={addWeeklyPeriod}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form & Ringkasan */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Tambah Pengeluaran</h2>
            <AddExpenseForm
              onAdded={fetchData}
              validateExpense={validateWeeklyExpense}
            />
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