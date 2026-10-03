import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Home, Search, Minus, Square, X,
  FileText, Image as ImageIcon, Music, Video, Download, Settings, Trash2,
  FolderPlus, FilePlus2, RefreshCw, Pencil, Copy, Scissors, ClipboardPaste, Trash
} from 'lucide-react';
import fileIcon from '../assets/file.jpeg';

interface FileManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  zIndex: number;
  onFocus: () => void;
}

type FSItem = {
  name: string; path: string; type: 'folder'|'file'|'image'|'text';
  size: number|null; modified: string;
};

const factory = ['Desktop','Documents','Downloads','Pictures','Music','Videos','Notes','Applications','Projects','Trash'];

export const FileManager: React.FC<FileManagerProps> = ({isOpen,onClose,onMinimize,zIndex,onFocus}) => {
  const [pos,setPos]=useState({x:155,y:152});
  const [size,setSize]=useState({w:633,h:409});
  const [savedFrame,setSavedFrame]=useState({x:155,y:152,w:633,h:409});
  const [isMaximized,setIsMaximized]=useState(false);
  const [interaction,setInteraction]=useState<'drag'|'resize'|null>(null);
  const [resizeEdges,setResizeEdges]=useState({left:false,right:false,top:false,bottom:false});
  const [dragOffset,setDragOffset]=useState({x:0,y:0});
  const [currentPath,setCurrentPath]=useState('/');
  const [history,setHistory]=useState<string[]>(['/']);
  const [historyIdx,setHistoryIdx]=useState(0);
  const [items,setItems]=useState<FSItem[]>([]);
  const [searchQuery,setSearchQuery]=useState('');
  const [selected,setSelected]=useState<FSItem|null>(null);
  const [clipboard,setClipboard]=useState<{path:string;mode:'copy'|'cut'}|null>(null);
  const [status,setStatus]=useState('Loading filesystem…');

  const loadDirectory=async(pathValue:string)=>{
    try{
      setStatus('Loading…');
      const r=await fetch(`/api/fs/list?path=${encodeURIComponent(pathValue.replace(/^\/+/,''))}`);
      const data=await r.json();
      if(!r.ok) throw new Error(data.error || 'Filesystem unavailable');
      setItems(data.items); setCurrentPath(data.path || '/'); setStatus(`${data.items.length} item(s)`);
    }catch(e:any){ setItems([]); setStatus(e?.message || 'Filesystem unavailable'); }
  };

  useEffect(()=>{ if(isOpen) loadDirectory(currentPath); },[isOpen]);

  const navigateTo=(p:string)=>{
    const next=history.slice(0,historyIdx+1); next.push(p);
    setHistory(next); setHistoryIdx(next.length-1); setSelected(null); loadDirectory(p);
  };
  const goBack=()=>{if(historyIdx>0){const i=historyIdx-1;setHistoryIdx(i);setSelected(null);loadDirectory(history[i]);}};
  const goForward=()=>{if(historyIdx<history.length-1){const i=historyIdx+1;setHistoryIdx(i);setSelected(null);loadDirectory(history[i]);}};

  const beginDrag=(e:React.MouseEvent)=>{
    if(isMaximized)return;
    setInteraction('drag'); setDragOffset({x:e.clientX-pos.x,y:e.clientY-pos.y}); onFocus();
  };
  const beginResize=(e:React.MouseEvent, edge:'left'|'right'|'top'|'bottom'|'topleft'|'topright'|'bottomleft'|'bottomright')=>{
    if(isMaximized)return; e.stopPropagation(); setInteraction('resize');
    setResizeEdges({left:edge.includes('left'),right:edge.includes('right'),top:edge.includes('top'),bottom:edge.includes('bottom')});
    setDragOffset({x:e.clientX,y:e.clientY}); onFocus();
  };
  useEffect(()=>{
    if(!interaction)return;
    const move=(e:MouseEvent)=>{
      if(interaction==='drag'){
        setPos({x:Math.max(0,Math.min(window.innerWidth-size.w,e.clientX-dragOffset.x)),
          y:Math.max(36,Math.min(window.innerHeight-size.h-12,e.clientY-dragOffset.y))});
      }else{
        const dx=e.clientX-dragOffset.x,dy=e.clientY-dragOffset.y,minW=420,minH=260;
        let {x,y}=pos,{w,h}=size;
        if(resizeEdges.right)w=Math.max(minW,Math.min(window.innerWidth-x,w+dx));
        if(resizeEdges.bottom)h=Math.max(minH,Math.min(window.innerHeight-y-12,h+dy));
        if(resizeEdges.left){const nx=Math.max(0,Math.min(x+w-minW,x+dx));w+=x-nx;x=nx;}
        if(resizeEdges.top){const ny=Math.max(36,Math.min(y+h-minH,y+dy));h+=y-ny;y=ny;}
        setPos({x,y});setSize({w,h});setDragOffset({x:e.clientX,y:e.clientY});
      }
    };
    const up=()=>{setInteraction(null);setResizeEdges({left:false,right:false,top:false,bottom:false});};
    window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
    return()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};
  },[interaction,dragOffset,pos,size,resizeEdges]);

  const toggleMaximize=()=>{
    if(isMaximized){setPos({x:savedFrame.x,y:savedFrame.y});setSize({w:savedFrame.w,h:savedFrame.h});setIsMaximized(false);}
    else{setSavedFrame({...pos,...size});setPos({x:8,y:30});setSize({w:Math.max(420,window.innerWidth-16),h:Math.max(260,window.innerHeight-92)});setIsMaximized(true);}
    onFocus();
  };

  const request=async(endpoint:string,body:any)=>{
    const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||'Filesystem operation failed');
    await loadDirectory(currentPath);
  };

  const createFolder=async()=>{
    const name=window.prompt('New folder name:','New Folder'); if(!name)return;
    try{await request('/api/fs/mkdir',{path:`${currentPath}/${name}`.replace('//','/')});}catch(e:any){window.alert(e.message);}
  };
  const createFile=async()=>{
    const name=window.prompt('New file name:','New File.txt'); if(!name)return;
    try{await request('/api/fs/touch',{path:`${currentPath}/${name}`.replace('//','/')});}catch(e:any){window.alert(e.message);}
  };
  const rename=async()=>{
    if(!selected)return; const name=window.prompt('Rename:',selected.name); if(!name||name===selected.name)return;
    try{await request('/api/fs/rename',{from:selected.path,to:`${currentPath}/${name}`.replace('//','/')});setSelected(null);}catch(e:any){window.alert(e.message);}
  };
  const remove=async()=>{
    if(!selected)return;
    if(!window.confirm(`Delete "${selected.name}"?`))return;
    try{await request('/api/fs/delete',{path:selected.path});setSelected(null);}catch(e:any){window.alert(e.message);}
  };
  const paste=async()=>{
    if(!clipboard)return;
    const target=`${currentPath}/${clipboard.path.split('/').pop()}`.replace('//','/');
    try{
      await request(clipboard.mode==='copy'?'/api/fs/copy':'/api/fs/move',{from:clipboard.path,to:target});
      setClipboard(null);
    }catch(e:any){window.alert(e.message);}
  };
  const openItem=(item:FSItem)=>{
    if(item.type==='folder'){navigateTo(item.path);return;}
    if(item.type==='image'||item.type==='text') window.open(`/api/fs/raw?path=${encodeURIComponent(item.path.replace(/^\\//,''))}`,'_blank','noopener,noreferrer');
    else window.alert(`No NSK application is registered for "${item.name}".`);
  };

  const filtered=useMemo(()=>items.filter(i=>i.name.toLowerCase().includes(searchQuery.toLowerCase())),[items,searchQuery]);
  const side=[{name:'Home',path:'/',icon:Home},{name:'Documents',path:'/Documents',icon:FileText},{name:'Pictures',path:'/Pictures',icon:ImageIcon},{name:'Music',path:'/Music',icon:Music},{name:'Videos',path:'/Videos',icon:Video},{name:'Downloads',path:'/Downloads',icon:Download},{name:'Settings',path:'/Applications',icon:Settings}];

  if(!isOpen)return null;
  return <div style={{left:pos.x,top:pos.y,width:size.w,height:size.h,zIndex}} onClick={onFocus}
    className="absolute bg-white/92 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-xl flex flex-col overflow-hidden select-none">
    <div onMouseDown={beginDrag} className="h-9 px-4 flex items-center justify-between border-b border-slate-200/70 bg-gradient-to-b from-white/90 to-white/60 cursor-move">
      <div className="flex items-center gap-2">
        <button onClick={e=>{e.stopPropagation();onClose();}} className="w-3 h-3 rounded-full bg-[#FF5F56] flex items-center justify-center"><X className="w-2 h-2 opacity-0 group-hover:opacity-100"/></button>
        <button onClick={e=>{e.stopPropagation();onMinimize();}} className="w-3 h-3 rounded-full bg-[#FFBD2E] flex items-center justify-center"><Minus className="w-2 h-2 opacity-0"/></button>
        <button onClick={e=>{e.stopPropagation();toggleMaximize();}} className="w-3 h-3 rounded-full bg-[#27C93F]"/>
      </div>
      <span className="text-[13px] font-semibold text-slate-700">File Manager</span>
      <div className="flex items-center gap-3 text-slate-500">
        <button onClick={e=>{e.stopPropagation();onMinimize();}}><Minus className="w-3.5 h-3.5"/></button>
        <button onClick={e=>{e.stopPropagation();toggleMaximize();}}><Square className="w-3 h-3"/></button>
        <button onClick={e=>{e.stopPropagation();onClose();}}><X className="w-3.5 h-3.5"/></button>
      </div>
    </div>
    <div className="h-10 px-4 flex items-center gap-2 border-b border-slate-200/60 bg-white/40">
      <button onClick={goBack} disabled={historyIdx===0} className="p-1 rounded hover:bg-slate-200/60 disabled:opacity-40"><ChevronLeft className="w-4 h-4"/></button>
      <button onClick={goForward} disabled={historyIdx>=history.length-1} className="p-1 rounded hover:bg-slate-200/60 disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
      <button onClick={()=>loadDirectory(currentPath)} title="Refresh" className="p-1 rounded hover:bg-slate-200/60"><RefreshCw className="w-4 h-4"/></button>
      <button onClick={createFolder} title="New Folder" className="p-1 rounded hover:bg-slate-200/60"><FolderPlus className="w-4 h-4"/></button>
      <button onClick={createFile} title="New File" className="p-1 rounded hover:bg-slate-200/60"><FilePlus2 className="w-4 h-4"/></button>
      <button onClick={rename} disabled={!selected} title="Rename" className="p-1 rounded hover:bg-slate-200/60 disabled:opacity-30"><Pencil className="w-4 h-4"/></button>
      <button onClick={()=>selected&&setClipboard({path:selected.path,mode:'copy'})} disabled={!selected} title="Copy" className="p-1 rounded hover:bg-slate-200/60 disabled:opacity-30"><Copy className="w-4 h-4"/></button>
      <button onClick={()=>selected&&setClipboard({path:selected.path,mode:'cut'})} disabled={!selected} title="Cut" className="p-1 rounded hover:bg-slate-200/60 disabled:opacity-30"><Scissors className="w-4 h-4"/></button>
      <button onClick={paste} disabled={!clipboard} title="Paste" className="p-1 rounded hover:bg-slate-200/60 disabled:opacity-30"><ClipboardPaste className="w-4 h-4"/></button>
      <button onClick={remove} disabled={!selected} title="Delete" className="p-1 rounded hover:bg-slate-200/60 disabled:opacity-30"><Trash className="w-4 h-4"/></button>
      <div className="flex-1 h-7 bg-white/80 border border-slate-200/80 rounded-md px-2.5 flex items-center gap-2 text-xs text-slate-700">
        <Home className="w-3.5 h-3.5 text-blue-600"/><span className="font-medium">{currentPath}</span>
      </div>
      <div className="w-[180px] h-7 bg-white/80 border border-slate-200/80 rounded-md px-2.5 flex items-center gap-2 text-xs text-slate-500">
        <Search className="w-3.5 h-3.5 text-slate-400"/><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search files..." className="w-full bg-transparent outline-none text-xs"/>
      </div>
    </div>
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[146px] border-r border-slate-200/60 p-2 space-y-1 bg-white/30 text-xs">
        {side.map(({name,path,icon:Icon})=><button key={name} onClick={()=>navigateTo(path)} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium ${currentPath===path?'bg-[#5BA0F2] text-white':'text-slate-700 hover:bg-black/5'}`}><Icon className="w-3.5 h-3.5"/><span>{name}</span></button>)}
      </div>
      <div className="flex-1 p-5 overflow-auto">
        {filtered.length===0?<div className="h-full flex items-center justify-center text-xs text-slate-400">{status}</div>:
        <div className="grid grid-cols-4 gap-5">
          {filtered.map(item=><div key={item.path} onClick={()=>setSelected(item)} onDoubleClick={()=>openItem(item)}
            className={`flex flex-col items-center p-2 rounded-lg cursor-pointer ${selected?.path===item.path?'bg-blue-500/15 ring-1 ring-blue-400/40':'hover:bg-blue-500/10'}`}>
            {item.type==='folder' ? <img src={fileIcon} alt="" draggable={false} className="w-12 h-12 object-contain"/>
              : item.type==='image' ? <ImageIcon className="w-10 h-10 text-blue-500"/>
              : item.type==='text' ? <FileText className="w-10 h-10 text-slate-500"/>
              : item.name.toLowerCase().includes('music') ? <Music className="w-10 h-10 text-rose-500"/>
              : <FileText className="w-10 h-10 text-slate-500"/>}
            <span className="mt-2 text-xs font-medium text-slate-800 text-center truncate max-w-[110px]">{item.name}</span>
            <span className="text-[10px] text-slate-400">{item.type==='folder'?'Folder':`${item.size ?? 0} B`}</span>
          </div>)}
        </div>}
      </div>
    </div>
    <div onMouseDown={e=>beginResize(e,'left')} className="absolute left-0 top-3 bottom-3 w-1 cursor-ew-resize"/>
    <div onMouseDown={e=>beginResize(e,'right')} className="absolute right-0 top-3 bottom-3 w-1 cursor-ew-resize"/>
    <div onMouseDown={e=>beginResize(e,'top')} className="absolute top-0 left-3 right-3 h-1 cursor-ns-resize"/>
    <div onMouseDown={e=>beginResize(e,'bottom')} className="absolute bottom-0 left-3 right-3 h-1 cursor-ns-resize"/>
    <div onMouseDown={e=>beginResize(e,'topleft')} className="absolute left-0 top-0 w-3 h-3 cursor-nwse-resize"/>
    <div onMouseDown={e=>beginResize(e,'topright')} className="absolute right-0 top-0 w-3 h-3 cursor-nesw-resize"/>
    <div onMouseDown={e=>beginResize(e,'bottomleft')} className="absolute left-0 bottom-0 w-3 h-3 cursor-nesw-resize"/>
    <div onMouseDown={e=>beginResize(e,'bottomright')} className="absolute right-0 bottom-0 w-3 h-3 cursor-nwse-resize"/>
  </div>;
};
