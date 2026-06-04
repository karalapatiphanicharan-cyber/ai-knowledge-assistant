import React, { useRef } from 'react'

const FileIcon = ({ type }) => {
  const colors = {
    pdf: 'text-red-400',
    docx: 'text-blue-400',
    txt: 'text-slate-400',
  }
  return (
    <svg className={`w-3.5 h-3.5 flex-shrink-0 ${colors[type] || 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
    </svg>
  )
}

export default function Sidebar({ documents, stats, onFileUpload, onClearKB, onDeleteDoc, onSummary, history, sessionInfo, onSelectQuestion }) {
  const fileInputRef = useRef(null)

  return (
    <aside className="w-[280px] flex-shrink-0 bg-[#111318] border-r border-white/5 flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <span className="text-white font-semibold text-[15px] tracking-tight">KnowAI Pro</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar">
        {/* Session Info */}
        <section>
          <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Session Info</p>
          <div className="px-3 py-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-[11px]">
             <div className="flex justify-between">
                <span className="text-slate-500">Docs:</span>
                <span className="text-slate-300 font-medium">{sessionInfo.docs}</span>
             </div>
             <div className="flex justify-between">
                <span className="text-slate-500">Queries:</span>
                <span className="text-slate-300 font-medium">{sessionInfo.queries}</span>
             </div>
             <div className="flex justify-between">
                <span className="text-slate-500">Started:</span>
                <span className="text-slate-300 font-medium">{sessionInfo.started}</span>
             </div>
          </div>
        </section>

        {/* Knowledge Base */}
        <section>
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Knowledge Base</p>
            {stats && (
              <span className="text-[10px] font-medium text-slate-600 bg-white/5 px-1.5 py-0.5 rounded-md">
                {stats.chunk_count} Chunks
              </span>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="px-3 py-4 border border-dashed border-white/10 rounded-xl text-center">
              <p className="text-[11px] text-slate-500">No documents uploaded.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {documents.map((doc) => (
                <li key={doc} className="group relative">
                  <div className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-400 text-[12px] truncate bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                    <FileIcon type={doc.split('.').pop().toLowerCase()} />
                    <span className="truncate flex-1">{doc}</span>
                    <button
                      onClick={() => onSummary(doc)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded-md text-slate-400 transition-all"
                      title="Summary"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                    <button
                      onClick={() => onDeleteDoc(doc)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded-md text-red-500 transition-all"
                      title="Remove"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Questions */}
        {history.length > 0 && (
          <section>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Recent Questions</p>
            <ul className="space-y-1">
              {history.map((q, i) => (
                <li key={i}>
                  <button
                    onClick={() => onSelectQuestion(q)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all text-[11px] text-left group"
                  >
                    <svg className="w-3 h-3 flex-shrink-0 opacity-40 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="truncate">{q}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white text-[#111318] text-[13px] font-semibold hover:bg-slate-100 transition-all shadow-lg active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Upload Document
        </button>

        <button
          onClick={onClearKB}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-red-500/10 text-red-400 text-[12px] font-medium hover:bg-red-500/20 transition-all border border-red-500/20 active:scale-[0.98]"
        >
          Clear Knowledge Base
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileUpload(file);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>
    </aside>
  )
}
