import React, { useRef, useState } from 'react'

const ACCEPTED_TYPES = '.pdf,.txt,.docx'

const IconButton = ({ title, onClick, children, danger = false }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
      danger ? 'text-red-300 hover:bg-red-500/10' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
    }`}
  >
    {children}
  </button>
)

const FileIcon = ({ type }) => {
  const colors = { pdf: 'text-red-400', docx: 'text-blue-400', txt: 'text-slate-300' }
  return (
    <svg className={`w-4 h-4 flex-shrink-0 ${colors[type] || 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
    </svg>
  )
}

export default function Sidebar({
  documents,
  uploadProgress,
  onFileUpload,
  onClearKB,
  onResetSession,
  onDeleteDocument,
  onPreviewDocument,
  onSummarizeDocument,
  onExportConversation,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    if (e.target.files?.length) {
      onFileUpload(e.target.files)
      e.target.value = ''
    }
  }

  return (
    <aside className={`${collapsed ? 'w-[76px]' : 'w-[304px]'} flex-shrink-0 bg-[#111318] border-r border-white/5 flex flex-col h-full transition-all duration-200`}>
      <div className="px-4 pt-5 pb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          {!collapsed && <span className="text-white font-semibold text-[15px]">KnowAI</span>}
        </div>
        <IconButton title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed((value) => !value)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7M19 19l-7-7 7-7'} />
          </svg>
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-5">
        <section>
          {!collapsed && (
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Knowledge Base</p>
              <span className="text-[10px] font-medium text-slate-300 bg-white/5 px-1.5 py-0.5 rounded-md">{documents.length}</span>
            </div>
          )}

          {documents.length === 0 ? (
            <div className={`${collapsed ? 'hidden' : 'block'} px-3 py-5 border border-dashed border-white/10 rounded-xl text-center`}>
              <p className="text-[12px] text-slate-400">No documents yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">Upload a file to start asking questions.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {documents.map((doc) => {
                const filename = doc.filename || doc
                const type = filename.split('.').pop().toLowerCase()
                return (
                  <li key={filename} className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon type={type} />
                      {!collapsed && (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] text-slate-200">{filename}</p>
                            <p className="text-[10px] text-slate-600">{doc.chunks || 0} chunks</p>
                          </div>
                          <IconButton title="Preview" onClick={() => onPreviewDocument(filename)}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </IconButton>
                          <IconButton title="Summary" onClick={() => onSummarizeDocument(filename)}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h7" /></svg>
                          </IconButton>
                          <IconButton title="Delete" onClick={() => onDeleteDocument(filename)} danger>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </IconButton>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {uploadProgress && !collapsed && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
            <div className="flex items-center justify-between text-[11px] text-blue-200 mb-2">
              <span className="truncate">{uploadProgress.filename}</span>
              <span>{uploadProgress.current}/{uploadProgress.total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-blue-950 overflow-hidden">
              <div className="h-full bg-blue-400" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/5 space-y-2">
        <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white text-[#111318] text-[13px] font-semibold hover:bg-slate-100 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          {!collapsed && 'Upload'}
        </button>
        {!collapsed && (
          <>
            <button onClick={onExportConversation} className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 text-slate-300 text-[12px] font-medium hover:bg-white/10 transition-all">
              Export Conversation
            </button>
            <button onClick={onResetSession} className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 text-slate-300 text-[12px] font-medium hover:bg-white/10 transition-all">
              Reset Session
            </button>
            <button onClick={onClearKB} className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-500/10 text-red-300 text-[12px] font-medium hover:bg-red-500/20 transition-all border border-red-500/20">
              Clear Knowledge Base
            </button>
          </>
        )}
        <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} multiple onChange={handleFileChange} className="hidden" />
      </div>
    </aside>
  )
}
