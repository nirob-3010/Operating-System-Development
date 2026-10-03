import React, { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

interface AppWindowProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  zIndex: number;
  onFocus: () => void;
  initial: { x:number; y:number; w:number; h:number };
  children: React.ReactNode;
}

export const AppWindow: React.FC<AppWindowProps> = ({title,isOpen,onClose,onMinimize,zIndex,onFocus,initial,children}) => {
  const [frame,setFrame]=useState(initial);
  const [saved,setSaved]=useState(initial);
  const [max,setMax]=useState(false);
  const [mode,setMode]=useState<'drag'|'resize'|null>(null);
  const [edges,setEdges]=useState({left:false,right:false,top:false,bottom:false});
  const [anchor,setAnchor]=useState({x:0,y:0});
  const [drag,setDrag]=useState({x:0,y:0});

  useEffect(()=>{ if(!mode)return; const move=(e:MouseEvent)=>{
    if(mode==='drag') setFrame(f=>({...f,x:Math.max(0,Math.min(window.innerWidth-f.w,e.clientX-drag.x)),y:Math.max(32,Math.min(window.innerHeight-f.h-12,e.clientY-drag.y))}));
    else setFrame(f=>{let {x,y,w,h}=f; const dx=e.clientX-anchor.x,dy=e.clientY-anchor.y,minW=320,minH=180;
      if(edges.right)w=Math.max(minW,Math.min(window.innerWidth-x,w+dx)); if(edges.bottom)h=Math.max(minH,Math.min(window.innerHeight-y-12,h+dy));
      if(edges.left){const nx=Math.max(0,Math.min(x+w-minW,x+dx));w+=x-nx;x=nx;} if(edges.top){const ny=Math.max(32,Math.min(y+h-minH,y+dy));h+=y-ny;y=ny;} return {x,y,w,h};});
  }; const up=()=>setMode(null); window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);return()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up)};
  },[mode,drag,anchor,edges]);
  if(!isOpen)return null;
  const beginDrag=(e:React.MouseEvent)=>{if(max)return; onFocus();setDrag({x:e.clientX-frame.x,y:e.clientY-frame.y});setMode('drag')};
  const resize=(e:React.MouseEvent,edge:string)=>{if(max)return;e.stopPropagation();onFocus();setEdges({left:edge.includes('left'),right:edge.includes('right'),top:edge.includes('top'),bottom:edge.includes('bottom')});setAnchor({x:e.clientX,y:e.clientY});setMode('resize')};
  const toggle=()=>{onFocus();if(max){setFrame(saved);setMax(false)}else{setSaved(frame);setFrame({x:8,y:32,w:Math.max(360,window.innerWidth-16),h:Math.max(240,window.innerHeight-92)});setMax(true)}};
  return <div style={{left:frame.x,top:frame.y,width:frame.w,height:frame.h,zIndex}} onMouseDown={onFocus} className="absolute bg-white/94 backdrop-blur-2xl border border-white/80 shadow-2xl rounded-xl flex flex-col overflow-hidden select-none">
    <div onMouseDown={beginDrag} className="h-9 px-3 flex items-center justify-between border-b border-slate-200/70 bg-gradient-to-b from-white/95 to-white/65 cursor-move shrink-0">
      <div className="flex items-center gap-2"><button onClick={e=>{e.stopPropagation();onClose()}} className="w-3 h-3 rounded-full bg-[#FF5F56] flex items-center justify-center"><X className="w-2 h-2 opacity-0 group-hover:opacity-100"/></button><button onClick={e=>{e.stopPropagation();onMinimize()}} className="w-3 h-3 rounded-full bg-[#FFBD2E]"/><button onClick={e=>{e.stopPropagation();toggle()}} className="w-3 h-3 rounded-full bg-[#27C93F]"/></div>
      <span className="text-[13px] font-semibold text-slate-700">{title}</span><div className="flex items-center gap-3 text-slate-500"><button onClick={e=>{e.stopPropagation();onMinimize()}}><Minus className="w-3.5 h-3.5"/></button><button onClick={e=>{e.stopPropagation();toggle()}}><Square className="w-3 h-3"/></button><button onClick={e=>{e.stopPropagation();onClose()}}><X className="w-3.5 h-3.5"/></button></div>
    </div><div className="flex-1 min-h-0">{children}</div>
    <div onMouseDown={e=>resize(e,'left')} className="absolute left-0 top-3 bottom-3 w-1 cursor-ew-resize"/><div onMouseDown={e=>resize(e,'right')} className="absolute right-0 top-3 bottom-3 w-1 cursor-ew-resize"/><div onMouseDown={e=>resize(e,'top')} className="absolute top-0 left-3 right-3 h-1 cursor-ns-resize"/><div onMouseDown={e=>resize(e,'bottom')} className="absolute bottom-0 left-3 right-3 h-1 cursor-ns-resize"/><div onMouseDown={e=>resize(e,'topleft')} className="absolute left-0 top-0 w-3 h-3 cursor-nwse-resize"/><div onMouseDown={e=>resize(e,'topright')} className="absolute right-0 top-0 w-3 h-3 cursor-nesw-resize"/><div onMouseDown={e=>resize(e,'bottomleft')} className="absolute left-0 bottom-0 w-3 h-3 cursor-nesw-resize"/><div onMouseDown={e=>resize(e,'bottomright')} className="absolute right-0 bottom-0 w-3 h-3 cursor-nwse-resize"/>
  </div>;
};
