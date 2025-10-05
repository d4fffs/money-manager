import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

// Creates a new allowance period with total 1.550.000. Use this endpoint
// on-demand or via cron at server side (Supabase Edge Function / Cron)
export async function POST() {
  // compute current period: if today >=25 then start is 25 this month else 25 previous month
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  let start = new Date(year, month, 25)
  if (today.getDate() < 25) {
    // use previous month
    start = new Date(year, month-1, 25)
  }
  const end = new Date(start.getFullYear(), start.getMonth()+1, 24)

  const period_start = start.toISOString().split('T')[0]
  const period_end = end.toISOString().split('T')[0]

  // avoid duplicates
  const { data: existing } = await supabase
    .from('allowances')
    .select('*')
    .eq('period_start', period_start)
    .limit(1)
    .single()

  if (existing) return NextResponse.json({ ok: true, message: 'Period exists' })

  const { data, error } = await supabase
    .from('allowances')
    .insert([{ period_start, period_end, total_amount:1550000, remaining_amount:1550000 }])
    .select()
    .single()

  if (error) return NextResponse.json({ ok:false, error: error.message })
  return NextResponse.json({ ok:true, data })
}
