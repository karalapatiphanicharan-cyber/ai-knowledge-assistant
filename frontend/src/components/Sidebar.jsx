import React, { useState, useRef } from 'react'

const FileIcon = ({ type }) => {
  const colors = { pdf: 'text-red-400', docx: 'text-blue-400', txt: 'text-slate-400' }
  return (
    <svg className={`w-4 h-4 flex-shrink-0 ${colors[type] || 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
    </svg>
  )
}

export default function Sidebar({ documents, stats, onFileUpload, onClearKB, onDeleteDoc, onSummary, onPreview, onExport, history, onSelectQuestion, onSearch }) {
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef(null)

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
    onSearch(e.target.value)
  }

  if (collapsed) {
    return (
      <aside className="w-16 flex-shrink-0 bg-[#111318] border-r border-white/5 flex flex-col items-center py-6 transition-all duration-300">
        <button onClick={() => setCollapsed(false)} className="mb-8 p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-colors">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex-1 flex flex-col gap-6">
           <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-blue-600 rounded-lg text-white shadow-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
           <button onClick={onExport} className="p-2 hover:bg-white/5 rounded-lg text-slate-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></button>
           <button onClick={onClearKB} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.docx" onChange={(e) => e.target.files[0] && onFileUpload(e.target.files[0])} className="hidden" multiple />
      </aside>
    )
  }

  return (
    <aside className="w-[300px] flex-shrink-0 bg-[#111318] border-r border-white/5 flex flex-col h-full transition-all duration-300 overflow-hidden">
      <div className="p-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <span className="text-white font-bold tracking-tight">KnowAI Pro</span>
        </div>
        <button onClick={() => setCollapsed(true)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 transition-colors">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
        <div className="px-2">
           <div className="relative">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-[12px] text-slate-300 outline-none focus:border-blue-500/50 transition-all pl-9"
              />
              <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>
        </div>

        <section>
          <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Knowledge Base</p>
          {documents.length === 0 ? (
            <div className="px-3 py-6 border border-dashed border-white/5 rounded-2xl text-center text-[11px] text-slate-600">
               Drop documents to start
            </div>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.name} className="group px-2 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <FileIcon type={doc.name.split('.').pop().toLowerCase()} />
                    <div className="truncate flex-1">
                       <div className="text-[12px] text-slate-200 font-medium truncate">{doc.name}</div>
                       <div className="text-[9px] text-slate-500 flex items-center gap-2">
                          <span>{doc.size_kb} KB</span>
                          <span>•</span>
                          <span>{doc.timestamp}</span>
                       </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => onPreview(doc.name)} className="flex-1 py-1 px-2 hover:bg-white/5 rounded text-[10px] text-slate-400 font-bold border border-white/5">Preview</button>
                     <button onClick={() => onSummary(doc.name)} className="flex-1 py-1 px-2 hover:bg-white/5 rounded text-[10px] text-slate-400 font-bold border border-white/5">Summary</button>
                     <button onClick={() => onDeleteDoc(doc.name)} className="p-1 hover:bg-red-500/10 rounded text-red-500 border border-white/5"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {history.length > 0 && (
          <section>
            <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-3">Recent Queries</p>
            <div className="space-y-1">
              {history.map((q, i) => (
                <button key={i} onClick={() => onSelectQuestion(q)} className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/5 text-[11px] text-slate-500 hover:text-slate-300 truncate transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="p-4 border-t border-white/5 space-y-2 bg-[#0d0f12]">
        <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-[#111318] text-[12px] font-bold hover:bg-slate-200 transition-all shadow-lg active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Upload Document
        </button>
        <button onClick={onExport} className="w-full py-2 px-4 rounded-xl border border-white/10 text-slate-400 text-[12px] font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
           Export Conversation
        </button>
        <button onClick={onClearKB} className="w-full py-2 px-4 rounded-xl bg-red-500/5 text-red-500 text-[11px] font-bold hover:bg-red-500/10 transition-all border border-red-500/10">
          Clear Everything
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.docx" onChange={(e) => e.target.files[0] && onFileUpload(e.target.files[0])} className="hidden" multiple />
      </div>
    </aside>
  )
}
