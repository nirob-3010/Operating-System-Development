import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const ROOT = path.resolve(process.env.NSK_FS_ROOT || process.env.NSK_HOME || (process.env.HOME ? path.join(process.env.HOME, 'NSK-OS-Home') : path.join(__dirname, 'nsk-user-home')));
const FACTORY_FOLDERS = [
  'Desktop','Documents','Downloads','Pictures','Music','Videos',
  'Notes','Applications','Projects','Trash'
];

await fs.mkdir(ROOT, { recursive: true });
for (const folder of FACTORY_FOLDERS) await fs.mkdir(path.join(ROOT, folder), { recursive: true });

app.use(express.json({ limit: '2mb' }));

function safePath(input='') {
  const rel = String(input).replaceAll('\\', '/').replace(/^\/+/, '');
  const resolved = path.resolve(ROOT, rel);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    const err = new Error('Path escapes the NSK user filesystem');
    err.status = 400;
    throw err;
  }
  return resolved;
}
function rel(p) {
  const r = path.relative(ROOT, p).replaceAll(path.sep, '/');
  return r ? `/${r}` : '/';
}
function typeFor(name, stat) {
  if (stat.isDirectory()) return 'folder';
  const ext = path.extname(name).toLowerCase();
  const images = ['.png','.jpg','.jpeg','.gif','.webp','.bmp'];
  const text = ['.txt','.md','.json','.js','.ts','.tsx','.css','.html','.c','.h','.cpp'];
  if (images.includes(ext)) return 'image';
  if (text.includes(ext)) return 'text';
  return 'file';
}

app.get('/api/fs/list', async (req,res,next) => {
  try {
    const target = safePath(req.query.path || '');
    const stat = await fs.lstat(target);
    if (stat.isSymbolicLink()) return res.status(400).json({error:'Symbolic-link directories are not allowed'});
    if (!stat.isDirectory()) return res.status(400).json({error:'Not a directory'});
    const entries = await fs.readdir(target, { withFileTypes: true });
    const items = [];
    for (const entry of entries) {
      const full = path.join(target, entry.name);
      const st = await fs.lstat(full);
      if (st.isSymbolicLink()) continue;
      items.push({
        name: entry.name,
        path: rel(full),
        type: typeFor(entry.name, st),
        size: st.isFile() ? st.size : null,
        modified: st.mtime.toISOString()
      });
    }
    items.sort((a,b) => a.type === 'folder' && b.type !== 'folder' ? -1 :
      a.type !== 'folder' && b.type === 'folder' ? 1 : a.name.localeCompare(b.name));
    res.json({ path: rel(target), items });
  } catch(e) { next(e); }
});

app.post('/api/fs/mkdir', async (req,res,next) => {
  try { await fs.mkdir(safePath(req.body.path), { recursive:false }); res.status(201).json({ok:true}); }
  catch(e){next(e);}
});
app.post('/api/fs/touch', async (req,res,next) => {
  try { const p=safePath(req.body.path); const fh=await fs.open(p,'wx'); await fh.close(); res.status(201).json({ok:true}); }
  catch(e){next(e);}
});
app.post('/api/fs/rename', async (req,res,next) => {
  try { await fs.rename(safePath(req.body.from), safePath(req.body.to)); res.json({ok:true}); }
  catch(e){next(e);}
});
app.post('/api/fs/delete', async (req,res,next) => {
  try {
    const p=safePath(req.body.path);
    if (p === ROOT) return res.status(400).json({error:'The filesystem root cannot be deleted'});
    const trash=safePath('Trash');
    await fs.mkdir(trash,{recursive:true});
    if (p !== trash && !p.startsWith(trash + path.sep)) {
      const base=path.basename(p); let dest=path.join(trash,base); let n=1;
      while(true){ try{ await fs.lstat(dest); dest=path.join(trash,`${base} (${n++})`); } catch(e){ if(e.code==='ENOENT') break; throw e; } }
      await fs.rename(p,dest);
    } else {
      await fs.rm(p,{recursive:true,force:false});
    }
    res.json({ok:true});
  } catch(e){next(e);}
});
app.post('/api/fs/copy', async (req,res,next) => {
  try { await fs.cp(safePath(req.body.from), safePath(req.body.to), {recursive:true, errorOnExist:true}); res.json({ok:true}); }
  catch(e){next(e);}
});
app.post('/api/fs/move', async (req,res,next) => {
  try { await fs.rename(safePath(req.body.from), safePath(req.body.to)); res.json({ok:true}); }
  catch(e){next(e);}
});
app.get('/api/fs/raw', async (req,res,next) => {
  try {
    const p=safePath(req.query.path || '');
    const st=await fs.stat(p);
    if(!st.isFile()) return res.status(400).send('Not a file');
    res.sendFile(p);
  } catch(e){next(e);}
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req,res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
app.use((err,req,res,_next) => {
  const status = Number(err.status || (err.code === 'ENOENT' ? 404 : 400));
  res.status(status).json({error: err.code === 'EEXIST' ? 'Already exists' : err.message || 'Filesystem operation failed'});
});

app.listen(PORT, () => {
  console.log(`NSK OS desktop: http://localhost:${PORT}`);
  console.log(`NSK real filesystem root: ${ROOT}`);
});
