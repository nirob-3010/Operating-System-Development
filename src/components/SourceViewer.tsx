import React, { useState } from 'react';
import { PHASE1_FILES, SourceFile } from '../sourceFiles';
import { Copy, Check, FileText, Download, Code2, FolderTree } from 'lucide-react';

export const SourceViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<SourceFile>(PHASE1_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredFiles = categoryFilter === 'all'
    ? PHASE1_FILES
    : PHASE1_FILES.filter(f => f.category === categoryFilter);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    // Generate text bundle of all files
    const bundle = PHASE1_FILES.map(f => `// File: ${f.path}\n// Description: ${f.description}\n\n${f.content}\n\n${'='.repeat(80)}\n`).join('\n');
    const blob = new Blob([bundle], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nsk-os-v0.3-phase1-source-bundle.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-[calc(100vh-36px)] bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Top Header */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderTree className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-sm text-slate-200">
            NSK OS v0.3 Phase 1 Source Code Repository
          </h2>
          <span className="px-2 py-0.5 rounded text-[11px] bg-blue-500/20 text-blue-400 font-mono">
            {PHASE1_FILES.length} Files Ready for GitHub
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadAll}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Phase 1 Bundle</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy File'}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: File Tree */}
        <div className="w-72 bg-slate-900/70 border-r border-slate-800 flex flex-col">
          {/* Category Tabs */}
          <div className="p-2 border-b border-slate-800 flex flex-wrap gap-1">
            {['all', 'boot', 'kernel', 'include', 'build', 'ci'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{file.path}</span>
                  </div>
                  <span className="text-[10px] uppercase font-sans text-slate-500 ml-1 shrink-0">
                    {file.language}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Editor Pane */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* File Description Header */}
          <div className="h-10 px-6 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-400" />
              <span className="font-mono font-medium text-slate-200">{selectedFile.path}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{selectedFile.description}</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {selectedFile.content.split('\n').length} lines · {selectedFile.content.length} bytes
            </div>
          </div>

          {/* Code Viewer with Line Numbers */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed select-text flex">
            {/* Line numbers */}
            <div className="pr-4 text-slate-600 text-right select-none border-r border-slate-800/60 font-mono text-[11px] leading-relaxed">
              {selectedFile.content.split('\n').map((_, idx) => (
                <div key={idx}>{idx + 1}</div>
              ))}
            </div>

            {/* Code Content */}
            <pre className="pl-4 whitespace-pre font-mono text-slate-200 text-xs leading-relaxed selection:bg-blue-600 selection:text-white">
              {selectedFile.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
