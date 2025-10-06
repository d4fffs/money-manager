'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/db'
import { useRouter } from 'next/navigation'
import AllowanceCard from '@/components/AllowanceCard'
import AddExpenseForm from '@/components/AddExpenseForm'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [allowance, setAllowance] = useState<any>(null)
  const [remaining, setRemaining] = useState(0)
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [globalLoading, setGlobalLoading] = useState(true)
  const [activePeriod, setActivePeriod] = useState<any>(null)
  const [weeklySpent, setWeeklySpent] = useState(0)

  // Modal states
  const [showTambahModal, setShowTambahModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showWeeklyModal, setShowWeeklyModal] = useState(false)

  // Form inputs
  const [newSaldo, setNewSaldo] = useState('')
  const [periodName, setPeriodName] = useState('')
  const [weeklyLimit, setWeeklyLimit] = useState('')

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/login')
      } else {
        setUser(data.user)
        await fetchData()
        setGlobalLoading(false)
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

    // Ambil periode mingguan aktif
    const today = new Date().toISOString().split('T')[0]
    const { data: wp, error: wpError } = await supabase
      .from('weekly_periods')
      .select('*')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (wpError && wpError.code !== 'PGRST116') console.error(wpError)
    setActivePeriod(wp || null)

    // Hitung pengeluaran dalam periode aktif
    if (wp) {
      const { data: wexp, error: wexpErr } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', wp.start_date)
        .lte('date', wp.end_date)

      if (!wexpErr) {
        const spent = (wexp || []).reduce((s, row) => s + Number(row.amount), 0)
        setWeeklySpent(spent)
      }
    } else {
      setWeeklySpent(0)
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

  // Simpan limit mingguan
  async function simpanLimitMingguan() {
    if (!periodName.trim()) {
      toast.error('Masukkan nama periode')
      return
    }

    if (!weeklyLimit || isNaN(Number(weeklyLimit)) || Number(weeklyLimit) <= 0) {
      toast.error('Masukkan limit mingguan yang valid')
      return
    }

    setLoading(true)
    try {
      const today = new Date()
      const startDate = new Date(today)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)

      const { error } = await supabase.from('weekly_periods').insert([{
        period_name: periodName.trim(),
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        weekly_limit: Number(weeklyLimit),
        allowance_id: allowance?.id || null
      }])

      if (error) throw error
      toast.success('Periode mingguan berhasil ditambahkan!')
      setShowWeeklyModal(false)
      setPeriodName('')
      setWeeklyLimit('')
      fetchData()
    } catch (err: any) {
      console.error(err)
      toast.error('Gagal menambahkan periode mingguan!')
    } finally {
      setLoading(false)
    }
  }

  if (!user || globalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">
        Loading...
      </div>
    )
  }

  const weeklyUsedPercent = activePeriod
    ? Math.min((weeklySpent / activePeriod.weekly_limit) * 100, 100)
    : 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 md:p-8 relative">
      <div className="max-w-6xl mx-auto opacity-80">
        {/* CARD SALDO */}
        <AllowanceCard allowance={allowance} remaining={remaining} />

        {/* CARD PERIODE AKTIF */}
        {activePeriod ? (
          <div className="mt-6 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 p-6 rounded-2xl shadow-lg border border-indigo-200">
            <h2 className="text-xl font-bold text-indigo-800 mb-3">Periode Mingguan Aktif</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white/70 rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-600">Nama Periode</p>
                <p className="text-lg font-semibold text-gray-800">{activePeriod.period_name}</p>
              </div>
              <div className="bg-white/70 rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-600">Tanggal Mulai</p>
                <p className="text-lg font-semibold text-gray-800">
                  {new Date(activePeriod.start_date).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
              <div className="bg-white/70 rounded-xl p-4 shadow-sm">
                <p className="text-sm text-gray-600">Tanggal Selesai</p>
                <p className="text-lg font-semibold text-gray-800">
                  {new Date(activePeriod.end_date).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="mt-5 bg-white/70 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-600">Limit Mingguan</p>
                <p className="text-sm text-gray-600">
                  {weeklyUsedPercent.toFixed(1)}% terpakai
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div
                  className="bg-indigo-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${weeklyUsedPercent}%` }}
                />
              </div>
              <p className="text-lg font-bold text-indigo-700">
                Rp {weeklySpent.toLocaleString()} / Rp {activePeriod.weekly_limit.toLocaleString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 bg-gray-100 text-gray-600 p-6 rounded-2xl text-center border border-gray-200">
            Belum ada periode mingguan aktif saat ini.
          </div>
        )}

        {/* TOMBOL AKSI */}
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
            📅 Tambah Periode Mingguan
          </button>
        </div>

        {/* FORM DAN RINGKASAN */}
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

      {/* === MODALS === */}
      {showTambahModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Tambah Saldo</h2>
            <input
              type="number"
              value={newSaldo}
              onChange={(e) => setNewSaldo(e.target.value)}
              placeholder="Masukkan nominal saldo"
              className="border border-gray-300 rounded-lg w-full p-2 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTambahModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={tambahSaldo}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                disabled={loading}
              >
                {loading ? 'Memproses...' : 'Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Edit Saldo</h2>
            <input
              type="number"
              value={newSaldo}
              onChange={(e) => setNewSaldo(e.target.value)}
              placeholder="Masukkan nominal baru"
              className="border border-gray-300 rounded-lg w-full p-2 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={editSaldo}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                disabled={loading}
              >
                {loading ? 'Memproses...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWeeklyModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
                            <h2 className="text-2xl font-bold text-gray-800">Buat Periode Mingguan</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Nama Periode</label>
                <input
                  type="text"
                  value={periodName}
                  onChange={(e) => setPeriodName(e.target.value)}
                  placeholder="Misal: Minggu ke-1 Oktober"
                  className="border border-gray-300 rounded-lg w-full p-2"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Limit Mingguan</label>
                <input
                  type="number"
                  value={weeklyLimit}
                  onChange={(e) => setWeeklyLimit(e.target.value)}
                  placeholder="Masukkan nominal limit"
                  className="border border-gray-300 rounded-lg w-full p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowWeeklyModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={simpanLimitMingguan}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70"
              >
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
