import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function POST(req: Request) {
  const body = await req.json()
  const { allowance_id, week_start, week_end, limit_amount } = body
  const { data, error } = await supabase
    .from('weekly_limits')
    .insert([{ allowance_id, week_start, week_end, limit_amount }])
    .select()
    .single()
  if (error) return NextResponse.json({ ok:false, error: error.message })
  return NextResponse.json({ ok:true, data })
}
