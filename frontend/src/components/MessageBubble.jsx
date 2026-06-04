import React, { useState } from 'react'

const AIAvatar = () => (
  <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  </div>
)

const ConfidenceBadge = ({ level }) => {
  const colors = { High: 'text-emerald-500 bg-emerald-500/10', Medium: 'text-amber-500 bg-amber-500/10', Low: 'text-red-500 bg-red-500/10' }
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors[level]}`}>{level} Confidence</span>
}

export function UserMessage({ content }) {
  return (
    <div className="flex justify-end mb-4 px-2">
      <div className="max-w-[85%] px-4 py-2.5 rounded-2xl bg-[#2a2d35] text-slate-200 text-[14px] leading-relaxed border border-white/5 shadow-sm">
        {content}
      </div>
    </div>
  )
}

export function AIMessage({ content, onRegenerate }) {
  const [showSources, setShowSources] = useState(false)
  const isObj = typeof content === 'object'
  const text = isObj ? content.intro?.suffix || content.answer : content
  const sources = isObj ? content.sources || [] : []
  const confidence = isObj ? content.confidence : null
  const summary = isObj ? content.summary_data : null

  const handleCopy = () => navigator.clipboard.writeText(text)

  return (
    <div className="flex items-start gap-3 mb-6 px-2 group">
      <AIAvatar />
      <div className="flex-1 max-w-[90%] space-y-2">
        <div className="flex items-center gap-3">
           {confidence && <ConfidenceBadge level={confidence} />}
        </div>

        <div className="text-[14px] text-slate-300 leading-relaxed bg-[#16181f] border border-white/[0.03] rounded-2xl p-4 shadow-sm transition-colors hover:border-white/[0.08]">
          {summary ? (
            <div className="space-y-4">
               <div className="pb-3 border-b border-white/5">
                  <h3 className="text-white font-bold mb-1">Overview</h3>
                  <p>{summary.overview}</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Key Topics</h4>
                    <ul className="space-y-1">
                       {summary.topics.map((t, i) => <li key={i} className="text-slate-400 flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-blue-500"></span>{t}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Important Facts</h4>
                    <ul className="space-y-1">
                       {summary.facts.map((f, i) => <li key={i} className="text-slate-400 flex items-start gap-2"><span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0"></span>{f}</li>)}
                    </ul>
                  </div>
               </div>
               <div className="pt-3 border-t border-white/5 text-[12px] italic text-slate-400">
                  {summary.takeaways}
               </div>
               <div className="flex items-center gap-4 text-[10px] text-slate-600 font-mono">
                  <span>Words: {summary.stats?.total_chars / 6 | 0}</span>
                  <span>Chunks: {summary.stats?.chunk_count}</span>
               </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{text}</p>
          )}
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={handleCopy} className="p-1.5 hover:bg-white/5 rounded text-slate-500 text-[11px] flex items-center gap-1.5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              Copy
           </button>
           <button onClick={() => onRegenerate()} className="p-1.5 hover:bg-white/5 rounded text-slate-500 text-[11px] flex items-center gap-1.5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Regenerate
           </button>
           {sources.length > 0 && (
             <button onClick={() => setShowSources(!showSources)} className="p-1.5 hover:bg-white/5 rounded text-slate-500 text-[11px] flex items-center gap-1.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {showSources ? 'Hide Sources' : 'Show Sources'}
             </button>
           )}
        </div>

        {showSources && sources.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
             {sources.map((s, i) => (
               <div key={i} className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-300 font-medium truncate">{s.file}</div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                     <span>Chunk #{s.chunk_id}</span>
                     <span>Score: {s.score}</span>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-6 px-2">
      <AIAvatar />
      <div className="bg-[#16181f] border border-white/5 rounded-2xl px-4 py-2.5 flex items-center gap-1.5 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
    </div>
  )
}
