'use client'
import React from 'react'

export default function AllowanceCard({ allowance, remaining }: any) {
  if (!allowance) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 text-center">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500 text-lg font-medium">Belum ada periode aktif</p>
        <p className="text-gray-400 text-sm mt-2">Buat periode baru untuk mulai tracking</p>
      </div>
    )
  }

  const percentUsed = allowance.total_amount > 0 
    ? ((allowance.total_amount - remaining) / allowance.total_amount * 100).toFixed(1) 
    : 0

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -ml-16 -mb-16"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-sm font-medium opacity-90">Saldo Tersisa</span>
        </div>

        {/* Main Amount */}
        <div className="mb-6">
          <div className="text-5xl md:text-6xl font-bold mb-2">
            Rp {Number(remaining).toLocaleString()}
          </div>
          <div className="text-sm opacity-75">
            dari Rp {Number(allowance.total_amount).toLocaleString()}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white bg-opacity-20 rounded-full h-3 mb-4 overflow-hidden">
          <div 
            className="bg-white h-full rounded-full transition-all duration-500 shadow-lg"
            style={{ width: `${percentUsed}%` }}
          ></div>
        </div>

        {/* Period Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 opacity-90">
            <span className="font-medium">{percentUsed}% terpakai</span>
          </div>
        </div>
      </div>
    </div>
  )
}