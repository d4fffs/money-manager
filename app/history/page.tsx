'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/db'
import Link from 'next/link'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface WeeklyPeriod {
  id: string
  period_name: string
  start_date: string
  end_date: string
}

interface Expense {
  id: string
  description: string
  amount: number
  date: string
  weekly_period_id: string
}

export default function HistoryPage() {
  const [periods, setPeriods] = useState<WeeklyPeriod[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  // Ambil semua data periode dan pengeluaran
  useEffect(() => {
    fetchAllData()
  }, [])

  async function fetchAllData() {
    try {
      setLoading(true)
      const [{ data: periodsData, error: pError }, { data: expensesData, error: eError }] = await Promise.all([
        supabase.from('weekly_periods').select('*').order('start_date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: true }),
      ])

      if (pError || eError) throw pError || eError
      setPeriods(periodsData || [])
      setExpenses(expensesData || [])
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data.')
    } finally {
      setLoading(false)
    }
  }

  // === Fungsi Ekspor Semua Pengeluaran ===
  async function exportAllExpenses() {
    try {
      toast.loading('Menyiapkan file Excel...', { id: 'export' })

      const { data: weeklyPeriods, error: pError } = await supabase
        .from('weekly_periods')
        .select('*')
        .order('start_date', { ascending: true })
      if (pError) throw pError

      if (!weeklyPeriods || weeklyPeriods.length === 0) {
        toast.error('Tidak ada periode untuk diekspor.', { id: 'export' })
        return
      }

      const workbook = XLSX.utils.book_new()

      // Loop tiap periode → sheet Excel sendiri
      for (let i = 0; i < weeklyPeriods.length; i++) {
        const wp = weeklyPeriods[i]
        const { data: exp, error: eError } = await supabase
          .from('expenses')
          .select('date, description, amount')
          .gte('date', wp.start_date)
          .lte('date', wp.end_date)
          .order('date', { ascending: true })

        if (eError) throw eError

        const sheetData = (exp || []).map((e) => ({
          'Tanggal': new Date(e.date).toLocaleDateString('id-ID'),
          'Deskripsi': e.description || '-',
          'Jumlah (Rp)': e.amount,
        }))

        if (sheetData.length === 0) continue

        const ws = XLSX.utils.json_to_sheet(sheetData)
        const name =
          wp.period_name?.replace(/[\\/:*?"<>|]/g, '_') ||
          `Periode_${i + 1}_${wp.start_date.split('T')[0]}`
        XLSX.utils.book_append_sheet(workbook, ws, name)
      }

      // Simpan file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const fileName = `data_pengeluaran_${new Date().toISOString().split('T')[0]}.xlsx`
      saveAs(blob, fileName)

      toast.success('Data pengeluaran berhasil diekspor!', { id: 'export' })
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengekspor data!', { id: 'export' })
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Riwayat Periode Mingguan</h2>
          <p className="text-gray-600">Semua periode mingguan dan pengeluaran yang tercatat</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportAllExpenses}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md font-medium transition-all"
          >
            📤 Ekspor Semua
          </button>

          <Link
            href="/"
            className="px-4 py-2 bg-white rounded-xl shadow-lg border border-gray-100 text-gray-700 font-medium hover:shadow-xl transition-all"
          >
            ← Kembali
          </Link>
        </div>
      </div>

      {/* Daftar Periode */}
      {loading ? (
        <p className="text-gray-500">Memuat data...</p>
      ) : periods.length === 0 ? (
        <p className="text-gray-500">Belum ada periode mingguan.</p>
      ) : (
        <div className="grid gap-4">
          {periods.map((p, idx) => {
            const periodExpenses = expenses.filter((e) => e.weekly_period_id === p.id)
            const total = periodExpenses.reduce((sum, e) => sum + e.amount, 0)

            return (
              <div key={p.id} className="p-5 bg-white shadow-md rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800">
                      {p.period_name
                        ? p.period_name
                        : `Periode ${idx + 1}: ${new Date(p.start_date).toLocaleDateString('id-ID')} – ${new Date(
                            p.end_date
                          ).toLocaleDateString('id-ID')}`}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Total Pengeluaran:{' '}
                      <span className="font-medium text-red-600">Rp {total.toLocaleString('id-ID')}</span>
                    </p>
                  </div>
                </div>

                {periodExpenses.length === 0 ? (
                  <p className="text-gray-400 text-sm">Belum ada pengeluaran.</p>
                ) : (
                  <table className="w-full text-sm mt-2">
                    <thead className="text-gray-600 border-b">
                      <tr>
                        <th className="text-left py-1">Tanggal</th>
                        <th className="text-left py-1">Deskripsi</th>
                        <th className="text-right py-1">Jumlah (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodExpenses.map((e) => (
                        <tr key={e.id} className="border-b last:border-none">
                          <td className="py-1">{new Date(e.date).toLocaleDateString('id-ID')}</td>
                          <td className="py-1">{e.description}</td>
                          <td className="py-1 text-right">{e.amount.toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}