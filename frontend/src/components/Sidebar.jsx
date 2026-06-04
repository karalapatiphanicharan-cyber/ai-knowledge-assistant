import React, { useRef } from 'react'

const ACCEPTED_TYPES = '.pdf,.txt,.docx'

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

const ChatIcon = () => (
  <svg className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

export default function Sidebar({ documents, onFileUpload, onClearKB }) {
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && onFileUpload) {
      onFileUpload(file)
      e.target.value = ''
    }
  }

  return (
    <aside className="w-[272px] flex-shrink-0 bg-[#111318] border-r border-white/5 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <span className="text-white font-semibold text-[15px] tracking-tight">KnowAI</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-6">
        {/* Knowledge Base */}
        <section>
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Knowledge Base</p>
            <span className="text-[10px] font-medium text-slate-600 bg-white/5 px-1.5 py-0.5 rounded-md">
              {documents.length}
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="px-3 py-4 border border-dashed border-white/10 rounded-xl text-center">
              <p className="text-[11px] text-slate-500">No documents uploaded.</p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {documents.map((doc) => (
                <li key={doc}>
                  <div className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-400 text-[13px] text-left truncate group bg-white/2 border border-transparent">
                    <FileIcon type={doc.split('.').pop().toLowerCase()} />
                    <span className="truncate">{doc}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Chats */}
        <section>
          <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Recent Chats</p>
          <ul className="space-y-0.5">
            <li>
              <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-left transition-all bg-blue-600/15 text-blue-300 border border-blue-500/20">
                <ChatIcon />
                <span className="truncate">Current Session</span>
              </button>
            </li>
          </ul>
        </section>
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
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Knowledge Base
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </aside>
  )
}
