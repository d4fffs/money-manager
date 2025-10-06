'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/db'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function History() {
  const [weeklyHistory, setWeeklyHistory] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null)
  const [dailyExpenses, setDailyExpenses] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [periodToDelete, setPeriodToDelete] = useState<any | null>(null)

  useEffect(() => {
    loadWeeklyHistory()
  }, [])

  async function loadWeeklyHistory() {
    const { data: weeklyPeriods } = await supabase
      .from('weekly_periods')
      .select('*')
      .order('start_date', { ascending: false })

    if (!weeklyPeriods) {
      setWeeklyHistory([])
      return
    }

    const updatedWeekly = await Promise.all(
      weeklyPeriods.map(async (wp) => {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('*')
          .gte('date', wp.start_date)
          .lte('date', wp.end_date)

        const totalSpent = (expenses || []).reduce((s, e) => s + Number(e.amount), 0)
        const today = new Date()
        const isActive =
          today >= new Date(wp.start_date) && today <= new Date(wp.end_date)

        return {
          ...wp,
          spent: totalSpent,
          remaining: Number(wp.weekly_limit) - totalSpent,
          isActive,
        }
      })
    )

    setWeeklyHistory(updatedWeekly)
  }

  async function showPeriodDetails(wp: any) {
    setSelectedPeriod(wp)
    setLoadingDetails(true)

    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', wp.start_date)
      .lte('date', wp.end_date)
      .order('date', { ascending: true })

    // Buat daily summary
    const startDate = new Date(wp.start_date)
    const endDate = new Date(wp.end_date)
    const daily: any[] = []

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split('T')[0]
      const dayExpenses = (expenses || []).filter((e) => e.date === dateStr)
      const total = dayExpenses.reduce((s, e) => s + Number(e.amount), 0)
      daily.push({ date: dateStr, expenses: dayExpenses, total })
    }

    setDailyExpenses(daily)
    setLoadingDetails(false)
  }

  function confirmDelete(wp: any, e: React.MouseEvent) {
    e.stopPropagation()
    setPeriodToDelete(wp)
    setShowDeleteConfirm(true)
  }

  async function handleDelete() {
    if (!periodToDelete) return

    setDeletingId(periodToDelete.id)
    try {
      // Hapus semua expenses yang terkait dengan periode ini
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('weekly_period_id', periodToDelete.id)

      if (expensesError) throw expensesError

      // Hapus periode mingguan
      const { error: periodError } = await supabase
        .from('weekly_periods')
        .delete()
        .eq('id', periodToDelete.id)

      if (periodError) throw periodError

      toast.success('Limit mingguan berhasil dihapus!')
      setShowDeleteConfirm(false)
      setPeriodToDelete(null)
      loadWeeklyHistory()
    } catch (err: any) {
      console.error(err)
      toast.error('Gagal menghapus limit mingguan!')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Riwayat Periode Mingguan</h2>
            <p className="text-gray-600">Semua periode mingguan yang pernah dibuat</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-white rounded-xl shadow-lg border border-gray-100 text-gray-700 font-medium hover:shadow-xl transition-all"
          >
            ← Kembali
          </Link>
        </div>

        <div className="space-y-4">
          {weeklyHistory.map((wp) => {
            const percentUsed =
              wp.weekly_limit > 0 ? ((wp.weekly_limit - wp.remaining) / wp.weekly_limit) * 100 : 0

            return (
              <div
                key={wp.id}
                onClick={() => showPeriodDetails(wp)}
                className={`cursor-pointer bg-white rounded-2xl p-6 shadow-lg border ${
                  wp.isActive ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-gray-100'
                } hover:shadow-xl transition-all relative`}
              >
                {/* Tombol Hapus */}
                <button
                  onClick={(e) => confirmDelete(wp, e)}
                  disabled={deletingId === wp.id}
                  className="absolute top-4 right-4 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-all group disabled:opacity-50"
                  title="Hapus periode ini"
                >
                  <svg
                    className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>

                {wp.isActive && (
                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                      Periode Aktif
                    </span>
                  </div>
                )}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pr-12">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-800">
                        {new Date(wp.start_date).toLocaleDateString('id-ID')} —{' '}
                        {new Date(wp.end_date).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <p className="text-xs text-gray-600 mb-1">Limit Mingguan</p>
                        <p className="text-lg font-bold text-gray-800">
                          Rp {Number(wp.weekly_limit).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                        <p className="text-xs text-gray-600 mb-1">Sisa</p>
                        <p className="text-lg font-bold text-green-700">
                          Rp {Number(wp.remaining).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 min-w-[140px] border border-indigo-100">
                    <p className="text-3xl font-bold text-indigo-700">{percentUsed.toFixed(1)}%</p>
                    <p className="text-xs text-gray-600 mt-1">Terpakai</p>
                  </div>
                </div>
                <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentUsed}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>

        {weeklyHistory.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <p className="text-gray-500 text-lg">Belum ada riwayat periode mingguan</p>
          </div>
        )}

        {/* Modal Konfirmasi Hapus */}
        {showDeleteConfirm && periodToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Konfirmasi Hapus</h3>
              </div>

              <p className="text-gray-600 mb-2">
                Apakah Anda yakin ingin menghapus periode mingguan ini?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ Periode: {new Date(periodToDelete.start_date).toLocaleDateString('id-ID')} —{' '}
                  {new Date(periodToDelete.end_date).toLocaleDateString('id-ID')}
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Semua pengeluaran terkait periode ini juga akan dihapus!
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setPeriodToDelete(null)
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition font-medium"
                  disabled={deletingId !== null}
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deletingId !== null}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition font-medium disabled:opacity-50"
                >
                  {deletingId !== null ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Detail Harian */}
        {selectedPeriod && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Detail Periode: {new Date(selectedPeriod.start_date).toLocaleDateString('id-ID')} —{' '}
                {new Date(selectedPeriod.end_date).toLocaleDateString('id-ID')}
              </h3>

              {loadingDetails ? (
                <p className="text-gray-500">Memuat detail harian...</p>
              ) : (
                <div className="space-y-3">
                  {dailyExpenses.map((day) => (
                    <div key={day.date} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                      <p className="font-semibold text-gray-700">
                        {new Date(day.date).toLocaleDateString('id-ID')} - Total: Rp{' '}
                        {day.total.toLocaleString()}
                      </p>
                      {day.expenses.length > 0 ? (
                        <ul className="mt-2 list-disc list-inside text-gray-600">
                          {day.expenses.map((e) => (
                            <li key={e.id}>
                              {e.description || 'Pengeluaran'}: Rp {Number(e.amount).toLocaleString()}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-400 text-sm mt-1">Tidak ada pengeluaran</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedPeriod(null)}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}