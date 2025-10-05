'use client'
import { useState } from 'react'
import { supabase } from '@/lib/db'
import toast from 'react-hot-toast'

export default function WeeklyLimitForm({ allowanceId, onSet }: any) {
  const [limit, setLimit] = useState('')

  async function handleSet() {
    if (!limit) return toast.error('Isi limit mingguan')
    // compute week start/end based on today (Monday - Sunday)
    const dt = new Date()
    const day = dt.getDay()
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1)
    const s = new Date(dt.setDate(diff)); s.setHours(0,0,0,0)
    const e = new Date(s); e.setDate(s.getDate() + 6)
    const week_start = s.toISOString().split('T')[0]
    const week_end = e.toISOString().split('T')[0]

    const { data } = await supabase
      .from('weekly_limits')
      .insert([{ allowance_id: allowanceId, week_start, week_end, limit_amount: Number(limit) }])
      .select()
      .single()

    toast.success('Limit mingguan disimpan')
    setLimit('')
    onSet && onSet()
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <h3 className="text-lg font-bold text-gray-800">Set Limit Mingguan</h3>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Limit Mingguan (Rp)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
            <input 
              placeholder="Contoh: 500000" 
              type="number" 
              value={limit} 
              onChange={e=>setLimit(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Limit untuk minggu ini (Senin - Minggu)
          </p>
        </div>
        <button 
          onClick={handleSet} 
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Simpan Limit Mingguan
        </button>
      </div>
    </div>
  )
}