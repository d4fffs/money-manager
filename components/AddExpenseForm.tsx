'use client'
import { useState } from 'react'
import { supabase } from '@/lib/db'
import toast from 'react-hot-toast'

export default function AddExpenseForm({ onAdded }: any) {
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    if (!amount) return toast.error('Isi nominal')
    const amt = Number(amount)
    if (amt <= 0) return toast.error('Nominal harus lebih dari 0')

    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // Ambil periode mingguan aktif
      const { data: weeklyPeriods, error: wpError } = await supabase
        .from('weekly_periods')
        .select('*')
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false })
        .limit(1)

      if (wpError) throw wpError
      if (!weeklyPeriods || weeklyPeriods.length === 0)
        throw new Error('Belum ada periode mingguan aktif')

      const weeklyPeriod = weeklyPeriods[0]
      const weeklyLimit = Number(weeklyPeriod.weekly_limit || 0)

      // Total pengeluaran minggu ini
      const { data: weekExpenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('weekly_period_id', weeklyPeriod.id)

      const weeklySpent = (weekExpenses || []).reduce((s, e) => s + Number(e.amount), 0)

      // Validator weekly limit
      if (weeklyLimit > 0 && weeklySpent + amt > weeklyLimit) {
        toast.error(`Gagal: melebihi limit mingguan (${weeklyLimit.toLocaleString()})!`)
        setLoading(false)
        return
      }

      // Ambil allowance untuk sisa saldo
      const { data: allowanceData, error: allowanceError } = await supabase
        .from('allowances')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (allowanceError) throw allowanceError
      if (!allowanceData) throw new Error('Belum ada allowance aktif')

      const remainingAmount = Number(allowanceData.remaining_amount || 0)

      if (amt > remainingAmount) {
        toast.error(`Gagal: melebihi sisa saldo (${remainingAmount.toLocaleString()})!`)
        setLoading(false)
        return
      }

      // Insert pengeluaran
      const { error: insertError } = await supabase.from('expenses').insert([{
        weekly_period_id: weeklyPeriod.id,
        allowance_id: allowanceData.id,
        date: today,
        description: desc,
        amount: amt
      }])
      if (insertError) throw insertError

      // Update sisa saldo allowance
      const { error: updateError } = await supabase
        .from('allowances')
        .update({ remaining_amount: remainingAmount - amt })
        .eq('id', allowanceData.id)
      if (updateError) throw updateError

      toast.success('Pengeluaran berhasil ditambahkan')
      setDesc('')
      setAmount('')
      onAdded && onAdded()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Gagal menambahkan pengeluaran')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Deskripsi (opsional)
        </label>
        <input 
          placeholder="Contoh: Makan siang" 
          value={desc} 
          onChange={e => setDesc(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nominal (Rp)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
          <input 
            placeholder="0" 
            value={amount} 
            onChange={e => setAmount(e.target.value)}
            type="number" 
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
          />
        </div>
      </div>
      <button 
        onClick={handleAdd} 
        disabled={loading}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? 'Menyimpan...' : 'Simpan Pengeluaran'}
      </button>
    </div>
  )
}