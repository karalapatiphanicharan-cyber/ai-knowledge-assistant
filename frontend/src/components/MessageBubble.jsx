import React from 'react'

const AIAvatar = () => (
  <div className="w-8 h-8 rounded-xl bg-[#1e2028] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner">
    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  </div>
)

const ConfidenceBadge = ({ level }) => {
  const styles = {
    High: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    Low: 'bg-red-500/10 text-red-500 border-red-500/20',
  }
  return (
    <div className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${styles[level]}`}>
      {level} Confidence
    </div>
  )
}

const SourceTag = ({ source }) => (
  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
    <div className="flex items-center gap-1.5">
      <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="text-[11px] text-slate-300 font-medium truncate">{source.file}</span>
    </div>
    <div className="flex items-center justify-between text-[9px] text-slate-500 px-0.5">
      <span>Chunk #{source.chunk_id}</span>
      <span className="font-mono">Score: {source.score}</span>
    </div>
  </div>
)

export function UserMessage({ content }) {
  return (
    <div className="flex justify-end mb-6 animate-in slide-in-from-right-4 duration-300">
      <div className="max-w-[80%] px-5 py-3.5 rounded-2xl rounded-tr-sm bg-blue-600 text-white text-[13.5px] leading-relaxed shadow-lg shadow-blue-500/20">
        {typeof content === 'string' ? content : JSON.stringify(content)}
      </div>
    </div>
  )
}

export function AIMessage({ content }) {
  const handleCopy = () => {
    const text = typeof content === 'string' ? content : content.intro?.suffix || '';
    navigator.clipboard.writeText(text);
  }

  if (typeof content === 'string') {
    return (
      <div className="flex items-start gap-4 mb-6 group animate-in slide-in-from-left-4 duration-300">
        <AIAvatar />
        <div className="flex-1 max-w-[85%]">
          <div className="bg-[#16181f] border border-white/8 rounded-2xl rounded-tl-sm p-5 shadow-xl transition-all hover:border-white/12 relative">
            <p className="text-[13.5px] text-slate-300 leading-relaxed whitespace-pre-wrap">{content}</p>
            <button onClick={handleCopy} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-all" title="Copy Answer">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 mb-6 group animate-in slide-in-from-left-4 duration-300">
      <AIAvatar />
      <div className="flex-1 max-w-[85%]">
        <div className="bg-[#16181f] border border-white/8 rounded-2xl rounded-tl-sm p-5 shadow-xl transition-all hover:border-white/12 relative">
          <div className="flex justify-between items-start mb-4">
             {content.confidence && <ConfidenceBadge level={content.confidence} />}
             <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-all ml-auto" title="Copy Answer">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
             </button>
          </div>

          <div className="text-[13.5px] text-slate-300 mb-6 leading-relaxed whitespace-pre-wrap">
            {content.intro && (
              <>
                {content.intro.prefix}
                {content.intro.highlight && <span className="font-semibold text-white"> {content.intro.highlight}</span>}
                {content.intro.suffix}
              </>
            )}
          </div>

          {content.items && content.items.length > 0 && (
            <ul className="space-y-2 mb-6">
              {content.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  <p className="text-[13px] text-slate-300">
                    <span className="font-semibold text-white">{item.label}: </span>
                    {item.value}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {content.sources && content.sources.length > 0 && (
            <div className="pt-5 border-t border-white/8">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Sources Used</span>
                <div className="h-px flex-1 bg-white/5"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {content.sources.map((src, i) => <SourceTag key={i} source={src} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-4 mb-6 animate-pulse">
      <AIAvatar />
      <div className="bg-[#16181f] border border-white/8 rounded-2xl rounded-tl-sm px-5 py-3.5 flex items-center gap-1.5 shadow-xl">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
      </div>
    </div>
  )
}
