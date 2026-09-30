#!/usr/bin/env python3
"""NSK Desktop backend: static UI, file API, system stats, PTY websocket. Local only."""
import asyncio, os, pty, fcntl, termios, struct, shutil, subprocess, codecs, glob
from aiohttp import web

UI = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ui')
HOME = os.path.expanduser('~')
TRASH = os.path.join(HOME, '.local/share/Trash/files')
os.makedirs(TRASH, exist_ok=True)
rp = lambda p: os.path.realpath(os.path.expanduser(p or '~'))

async def ls(r):
    p = rp(r.query.get('path', '~'))
    try:
        items = [{'name': n, 'path': os.path.join(p, n), 'dir': os.path.isdir(os.path.join(p, n))}
                 for n in os.listdir(p) if not n.startswith('.')]
    except Exception as e:
        return web.json_response({'error': str(e)})
    items.sort(key=lambda i: (not i['dir'], i['name'].lower()))
    return web.json_response({'path': p, 'home': HOME, 'items': items})

async def file(r):
    p = rp(r.query.get('path'))
    return web.FileResponse(p) if os.path.isfile(p) else web.Response(status=404)

_last = None
def cpu():
    global _last
    v = list(map(int, open('/proc/stat').readline().split()[1:]))
    idle, tot = v[3] + v[4], sum(v)
    if _last is None:
        _last = (idle, tot); return 0
    di, dt = idle - _last[0], tot - _last[1]
    _last = (idle, tot)
    return round(100 * (1 - di / dt)) if dt else 0

async def stats(r):
    m = {l.split(':')[0]: int(l.split()[1]) for l in open('/proc/meminfo')}
    du = shutil.disk_usage('/')
    bat = None
    for f in glob.glob('/sys/class/power_supply/BAT*/capacity'):
        bat = int(open(f).read()); break
    return web.json_response({'cpu': cpu(), 'ram': round(100 * (1 - m['MemAvailable'] / m['MemTotal'])),
                              'disk': round(100 * du.used / du.total), 'bat': bat})

async def power(r):
    a = r.query.get('action')
    if a in ('poweroff', 'reboot'):
        subprocess.Popen(['sudo', 'systemctl', a])
    return web.json_response({'ok': True})

async def pty_ws(r):
    ws = web.WebSocketResponse(); await ws.prepare(r)
    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(HOME); os.environ['TERM'] = 'xterm-256color'
        os.execvp('bash', ['bash', '-l'])
    loop = asyncio.get_running_loop()
    dec = codecs.getincrementaldecoder('utf-8')('replace')
    def rd():
        try: d = os.read(fd, 65536)
        except OSError: d = b''
        if d: asyncio.ensure_future(ws.send_str(dec.decode(d)))
        else:
            loop.remove_reader(fd); asyncio.ensure_future(ws.close())
    loop.add_reader(fd, rd)
    async for m in ws:
        if m.type != web.WSMsgType.TEXT: continue
        s = m.data
        if s.startswith('\0'):
            c, rw = map(int, s[1:].split(','))
            fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', rw, c, 0, 0))
        else:
            os.write(fd, s.encode())
    loop.remove_reader(fd)
    try: os.kill(pid, 9); os.waitpid(pid, 0); os.close(fd)
    except OSError: pass
    return ws

app = web.Application()
app.router.add_get('/', lambda r: web.FileResponse(os.path.join(UI, 'index.html')))
app.router.add_get('/api/ls', ls)
app.router.add_get('/api/file', file)
app.router.add_get('/api/stats', stats)
app.router.add_get('/api/power', power)
app.router.add_get('/ws/pty', pty_ws)
app.router.add_static('/', UI)
web.run_app(app, host='127.0.0.1', port=8080, print=None)
