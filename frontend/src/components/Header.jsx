import React from 'react'

export default function Header({ status }) {
  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0d0f12]/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-semibold text-white tracking-tight">AI Knowledge Assistant</h1>
        <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          System Online
        </div>
      </div>

      <div className="flex items-center gap-3">
        {status && (
          <div className="flex items-center gap-4 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Backend</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">DB</span>
              <span className={`w-2 h-2 rounded-full ${status.vector_db === 'Ready' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
