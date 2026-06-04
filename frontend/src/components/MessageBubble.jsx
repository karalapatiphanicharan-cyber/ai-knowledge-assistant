import React, { useState } from 'react'

const AIAvatar = () => (
  <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner">
    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  </div>
)

const ConfidenceBadge = ({ level }) => {
  const styles = {
    High: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    Medium: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    Low: 'text-red-500 bg-red-500/10 border-red-500/20'
  }
  return (
    <div className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${styles[level] || styles.Low}`}>
      {level} Confidence
    </div>
  )
}

export function UserMessage({ content }) {
  return (
    <div className="flex justify-end mb-6 px-2 animate-in slide-in-from-right-4 duration-300">
      <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-[#2a2d35] text-slate-200 text-[13.5px] leading-relaxed border border-white/5 shadow-sm">
        {content}
      </div>
    </div>
  )
}

export function AIMessage({ content, onRegenerate }) {
  const [showSources, setShowSources] = useState(false)
  const isObj = typeof content === 'object' && content !== null
  const text = isObj ? content.answer : content
  const sources = isObj ? content.sources || [] : []
  const confidence = isObj ? content.confidence : null
  const summary = isObj ? content.summary_data : null

  const handleCopy = () => {
      const copyText = summary ? `Overview: ${summary.overview}` : text
      navigator.clipboard.writeText(copyText)
  }

  return (
    <div className="flex items-start gap-3 mb-8 px-2 group animate-in slide-in-from-left-4 duration-300">
      <AIAvatar />
      <div className="flex-1 max-w-[90%] space-y-3">
        <div className="flex items-center gap-3">
           {confidence && <ConfidenceBadge level={confidence} />}
        </div>

        <div className="text-[13.5px] text-slate-300 leading-relaxed bg-[#16181f] border border-white/[0.04] rounded-2xl rounded-tl-sm p-5 shadow-xl transition-all hover:border-white/[0.1]">
          {summary ? (
            <div className="space-y-5">
               <div className="pb-4 border-b border-white/5">
                  <h3 className="text-white font-bold text-[15px] mb-2">Document Insights</h3>
                  <p className="text-slate-300 leading-relaxed">{summary.overview}</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Key Topics</h4>
                    <ul className="space-y-2">
                       {summary.topics?.map((t, i) => (
                         <li key={i} className="text-[12px] text-slate-400 flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40"></span>
                           {t}
                         </li>
                       ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Important Facts</h4>
                    <ul className="space-y-2">
                       {summary.facts?.map((f, i) => (
                         <li key={i} className="text-[12px] text-slate-400 flex items-start gap-2">
                           <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500/40 flex-shrink-0"></span>
                           {f}
                         </li>
                       ))}
                    </ul>
                  </div>
               </div>

               {summary.takeaways && (
                 <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                    <p className="text-[12px] italic text-slate-400">"{summary.takeaways}"</p>
                 </div>
               )}

               {summary.suggestions?.length > 0 && (
                 <div className="pt-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Suggested Questions</h4>
                    <div className="flex flex-wrap gap-2">
                       {summary.suggestions.map((s, i) => (
                         <div key={i} className="px-3 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-[11px] text-blue-400">
                           {s}
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{text}</p>
          )}
        </div>

        <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity pl-1">
           <button onClick={handleCopy} className="hover:text-white text-slate-500 text-[11px] font-medium flex items-center gap-1.5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              Copy
           </button>
           <button onClick={() => onRegenerate()} className="hover:text-white text-slate-500 text-[11px] font-medium flex items-center gap-1.5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Regenerate
           </button>
           {sources.length > 0 && (
             <button onClick={() => setShowSources(!showSources)} className="hover:text-white text-slate-500 text-[11px] font-medium flex items-center gap-1.5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {showSources ? 'Hide Sources' : 'Show Sources'}
             </button>
           )}
        </div>

        {showSources && sources.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
             {sources.map((s, i) => (
               <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="text-[12px] text-slate-300 font-medium truncate">{s.file}</div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                     <span>Chunk #{s.chunk_id}</span>
                     <span className="bg-white/5 px-1.5 py-0.5 rounded">Score: {s.score}</span>
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
      <div className="bg-[#16181f] border border-white/5 rounded-2xl px-5 py-3 flex items-center gap-1.5 shadow-xl">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
    </div>
  )
}
