import React from 'react'

const AIAvatar = () => (
  <div className="w-8 h-8 rounded-xl bg-[#1e2028] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  </div>
)

const CheckIcon = () => (
  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const SourceCard = ({ source }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
    <div className="flex items-center justify-between gap-3 mb-1">
      <div className="flex items-center gap-1.5 min-w-0 text-[12px] text-slate-200">
        <svg className="w-3.5 h-3.5 flex-shrink-0 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <span className="truncate">{source.filename || source.file || source}</span>
      </div>
      {typeof source.confidence_score === 'number' && (
        <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          {Math.round(source.confidence_score * 100)}%
        </span>
      )}
    </div>
    <div className="flex flex-wrap gap-1.5 mb-1">
      {source.chunk_id && <span className="text-[10px] text-slate-500">{source.chunk_id}</span>}
      {typeof source.chunk_count === 'number' && (
        <span className="text-[10px] text-slate-500">Chunk {(source.chunk_index ?? 0) + 1}/{source.chunk_count}</span>
      )}
      {typeof source.retrieved_chunk_count === 'number' && (
        <span className="text-[10px] text-slate-500">Retrieved {source.retrieved_chunk_count}</span>
      )}
      {typeof source.similarity_score === 'number' && (
        <span className="text-[10px] text-slate-500">Similarity {source.similarity_score.toFixed(3)}</span>
      )}
    </div>
    {source.snippet && <p className="text-[11px] leading-5 text-slate-400">{source.snippet}</p>}
  </div>
)

const SourceTag = ({ label, title }) => (
  <button
    title={title}
    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-400 hover:text-slate-200 transition-all"
  >
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
    {label}
  </button>
)

export function UserMessage({ content }) {
  return (
    <div className="flex justify-end message-appear">
      <div className="max-w-[70%] px-4 py-3 rounded-2xl rounded-tr-sm bg-blue-600 text-white text-[13.5px] leading-relaxed shadow-lg shadow-blue-500/10">
        {typeof content === 'string' ? content : JSON.stringify(content)}
      </div>
    </div>
  )
}

export function AIMessage({ content }) {
  // Graceful fallback for string content
  if (typeof content === 'string') {
    return (
      <div className="flex items-start gap-3 message-appear">
        <AIAvatar />
        <div className="flex-1 max-w-[80%]">
          <div className="bg-[#16181f] border border-white/8 rounded-2xl rounded-tl-sm p-4 shadow-xl text-[13px] text-slate-300">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 message-appear">
      <AIAvatar />
      <div className="flex-1 max-w-[80%]">
        <div className="bg-[#16181f] border border-white/8 rounded-2xl rounded-tl-sm p-4 shadow-xl">
          {content.intro && (
            <p className="text-[13px] text-slate-300 mb-3 leading-relaxed">
              {content.intro.prefix}
              {content.intro.highlight && (
                <span className="font-semibold text-white"> {content.intro.highlight}</span>
              )}
              {content.intro.suffix}
            </p>
          )}

          {content.items && content.items.length > 0 && (
            <ul className="space-y-2 mb-4">
              {content.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckIcon />
                  <p className="text-[13px] text-slate-300 leading-relaxed">
                    <span className="font-semibold text-white">{item.label}: </span>
                    {item.value}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {content.sources && content.sources.length > 0 && (
            <div className="pt-3 border-t border-white/8">
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">Sources Used:</span>
              <div className="grid gap-2">
                {content.sources.map((src, i) => (
                  typeof src === 'object'
                    ? <SourceCard key={i} source={src} />
                    : <SourceTag key={i} label={src} title="" />
                ))}
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
    <div className="flex items-start gap-3 message-appear">
      <div className="w-8 h-8 rounded-xl bg-[#1e2028] border border-white/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <div className="bg-[#16181f] border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5">
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>
        <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>
      </div>
    </div>
  )
}
