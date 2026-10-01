
/*
 * NSK OS Desktop
 * Small framebuffer desktop shell for the NSK OS Buildroot image.
 * UI is implemented from scratch for low-end x86_64 PCs/VMs.
 */
#define _GNU_SOURCE
#include <linux/fb.h>
#include <linux/input.h>
#include <sys/reboot.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <sys/select.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>
#include <dirent.h>
#include <unistd.h>
#include <signal.h>
#include <errno.h>
#include <time.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include "font8x12.h"

#define WMAX 1600
#define HMAX 1000
#define MAX_WINDOWS 8
#define MAX_LINES 80
#define MAX_LINE 240

typedef struct { uint8_t r,g,b,a; } Color;
typedef struct { int x,y,w,h; int open,minimized,maximized; int type; char title[64]; char path[256]; } Window;

static uint32_t *fb;
static int sw, sh, stride;
static size_t fbsize;
static int fbfd=-1;
static int mouse_x=0, mouse_y=0, mouse_down=0;
static int active=0;
static Window wins[MAX_WINDOWS];
static int nwins=0;
static int need_redraw=1;
static int quit_requested=0;
static char terminal_input[MAX_LINE];
static int terminal_len=0;
static char term_lines[MAX_LINES][MAX_LINE];
static int term_count=0;
static int file_scroll=0;
static int ctrl_down=0;
static int alt_down=0;

static inline uint32_t rgb(uint8_t r,uint8_t g,uint8_t b){ return 0xff000000u | ((uint32_t)r<<16)|((uint32_t)g<<8)|b; }
static inline uint8_t R(uint32_t c){return c>>16;} static inline uint8_t G(uint32_t c){return c>>8;} static inline uint8_t B(uint32_t c){return c;}
static uint32_t blend(uint32_t a,uint32_t b,uint8_t alpha){
    uint32_t r=(R(a)*alpha + R(b)*(255-alpha))/255;
    uint32_t g=(G(a)*alpha + G(b)*(255-alpha))/255;
    uint32_t bl=(B(a)*alpha + B(b)*(255-alpha))/255;
    return rgb(r,g,bl);
}
static void px(int x,int y,uint32_t c){ if(x>=0&&y>=0&&x<sw&&y<sh) fb[y*stride+x]=c; }
static void rect(int x,int y,int w,int h,uint32_t c){
    if(w<=0||h<=0)return;
    int x0=x<0?0:x, y0=y<0?0:y, x1=x+w>sw?sw:x+w, y1=y+h>sh?sh:y+h;
    for(int yy=y0;yy<y1;yy++){ uint32_t *p=fb+yy*stride+x0; for(int xx=x0;xx<x1;xx++) *p++=c; }
}
static void line(int x0,int y0,int x1,int y1,uint32_t c){
    int dx=abs(x1-x0), sx=x0<x1?1:-1, dy=-abs(y1-y0), sy=y0<y1?1:-1, err=dx+dy;
    for(;;){px(x0,y0,c); if(x0==x1&&y0==y1)break; int e2=2*err; if(e2>=dy){err+=dy;x0+=sx;} if(e2<=dx){err+=dx;y0+=sy;}}
}
static void circle(int cx,int cy,int r,uint32_t c){
    int x=-r,y=0,err=2-2*r;
    do { for(int xx=cx+x;xx<=cx-x;xx++){px(xx,cy+y,c);px(xx,cy-y,c);}
         int e=err; if(e<=y)err+=++y*2+1; if(e>x||err>y)err+=++x*2+1; }while(x<0);
}
static void rr(int x,int y,int w,int h,int rad,uint32_t c){
    rect(x+rad,y,w-2*rad,h,c); rect(x,y+rad,w,h-2*rad,c);
    // filled corner circles
    for(int yy=0;yy<rad;yy++) for(int xx=0;xx<rad;xx++){
        if((xx-rad)*(xx-rad)+(yy-rad)*(yy-rad)<=rad*rad) px(x+xx,y+yy,c);
        if((xx)*(xx)+(yy-rad)*(yy-rad)<=rad*rad) px(x+w-rad+xx,y+yy,c);
        if((xx-rad)*(xx-rad)+(yy)*(yy)<=rad*rad) px(x+xx,y+h-rad+yy,c);
        if(xx*xx+yy*yy<=rad*rad) px(x+w-rad+xx,y+h-rad+yy,c);
    }
}
static void text(int x,int y,const char *s,uint32_t c){
    for(;*s;s++,x+=8){
        unsigned ch=(unsigned char)*s;
        if(ch<32||ch>126) continue;
        const uint8_t *g=font8x12[ch-32];
        for(int yy=0;yy<12;yy++){ uint8_t row=g[yy]; for(int xx=0;xx<8;xx++) if(row&(1<<(7-xx))) px(x+xx,y+yy,c); }
    }
}
static void text_scaled(int x,int y,const char *s,uint32_t c,int scale){
    for(;*s;s++,x+=8*scale){
        unsigned ch=(unsigned char)*s; if(ch<32||ch>126)continue;
        const uint8_t *g=font8x12[ch-32];
        for(int yy=0;yy<12;yy++) for(int xx=0;xx<8;xx++) if(g[yy]&(1<<(7-xx))) rect(x+xx*scale,y+yy*scale,scale,scale,c);
    }
}
static void icon_folder(int x,int y){
    rr(x,y+8,42,32,6,rgb(76,161,242)); rr(x+4,y+3,22,12,4,rgb(93,174,247));
    line(x+6,y+20,x+36,y+20,rgb(160,210,255));
}
static void icon_trash(int x,int y){
    rr(x+8,y+10,25,31,4,rgb(238,240,244)); rect(x+6,y+7,29,4,rgb(80,90,105)); rect(x+14,y+3,13,4,rgb(80,90,105));
    for(int i=0;i<3;i++)rect(x+14+i*6,y+16,2,20,rgb(185,195,207));
}
static void icon_terminal(int x,int y){
    rr(x,y,44,44,10,rgb(28,31,37)); text(x+8,y+14,">_",rgb(242,245,250));
}
static void icon_browser(int x,int y){
    rr(x,y,44,44,10,rgb(245,247,250)); circle(x+22,y+22,16,rgb(75,140,232)); circle(x+22,y+22,10,rgb(241,246,255)); line(x+8,y+23,x+36,y+18,rgb(75,140,232));
}
static void icon_settings(int x,int y){
    circle(x+22,y+22,18,rgb(90,100,115)); circle(x+22,y+22,8,rgb(235,238,243));
    for(int i=0;i<8;i++){double a=i*M_PI/4; int cx=x+22+(int)(cos(a)*18),cy=y+22+(int)(sin(a)*18); rr(cx-4,cy-4,8,8,2,rgb(90,100,115));}
}
static void draw_wallpaper(void){
    FILE *f=fopen("/usr/share/nsko/wallpaper.rgb565","rb");
    if(!f){rect(0,0,sw,sh,rgb(205,218,232));return;}
    uint16_t *buf=malloc(1024*768*2); if(!buf){fclose(f);return;}
    fread(buf,1,1024*768*2,f); fclose(f);
    for(int y=0;y<sh;y++){ int sy=(int)((long long)y*768/sh); for(int x=0;x<sw;x++){int sx=(int)((long long)x*1024/sw); uint16_t v=buf[sy*1024+sx]; uint8_t r=((v>>11)&31)<<3,g=((v>>5)&63)<<2,b=(v&31)<<3; px(x,y,rgb(r,g,b));}}
    free(buf);
}
static void topbar(void){
    rect(0,0,sh?sw:0,36,blend(fb[0],rgb(245,248,252),205));
    // apple-like NSK mark
    circle(16,18,7,rgb(18,28,42)); circle(23,17,7,rgb(18,28,42)); rect(18,10,3,4,rgb(18,28,42));
    text(40,12,"NSK OS",rgb(20,28,40));
    char clockbuf[64]; time_t t=time(NULL); struct tm *tm=localtime(&t);
    strftime(clockbuf,sizeof(clockbuf),"%a, %d %b %Y   %H:%M",tm);
    int tx=sw-8-(int)strlen(clockbuf)*8; text(tx,12,clockbuf,rgb(20,28,40));
    // right status glyphs
    int x=sw-165; rr(x,11,15,11,2,rgb(35,45,58)); rect(x+3,14,9,5,rgb(240,243,247));
    x+=30; circle(x+5,17,4,rgb(35,45,58)); line(x-1,17,x+11,17,rgb(35,45,58));
    x+=30; text(x,12,"♫",rgb(35,45,58)); x+=28; rr(x,10,20,13,3,rgb(35,45,58)); rect(x+3,13,14,7,rgb(240,243,247));
    text(sw-54,12,"⌕",rgb(20,28,40));
}
static void desktop_icons(void){
    const char *names[]={"Home","Documents","Pictures","Music","Trash"};
    int ys[]={64,160,256,352,448};
    for(int i=0;i<5;i++){
        if(i==4)icon_trash(40,ys[i]); else icon_folder(40,ys[i]);
        text(39,ys[i]+50,names[i],rgb(245,247,250));
    }
}
static void dock(void){
    int h=70,w=560,x=(sw-w)/2,y=sh-84;
    rr(x,y,w,h,18,blend(fb[(y+10)*stride+x+10],rgb(250,252,255),215));
    // separator shadow
    for(int i=0;i<7;i++){int ix=x+28+i*67; int iy=y+14;
        if(i==0) { rr(ix,iy,44,44,12,rgb(245,247,251)); icon_browser(ix,iy); }
        else if(i==1){icon_browser(ix,iy);}
        else if(i==2){icon_folder(ix,iy);}
        else if(i==3){rr(ix,iy,44,44,12,rgb(247,92,122)); text(ix+13,iy+14,"♪",rgb(255,255,255));}
        else if(i==4){icon_terminal(ix,iy);}
        else if(i==5){icon_settings(ix,iy);}
        else {icon_trash(ix,iy);}
        if(i==active) circle(ix+22,y+62,3,rgb(45,55,70));
    }
}
static void status_panel(void){
    int x=sw-230,y=62,w=210,h=270;
    rr(x,y,w,h,18,blend(fb[(y+10)*stride+x+10],rgb(249,251,254),225));
    char b[64]; time_t t=time(NULL); struct tm *tm=localtime(&t);
    strftime(b,sizeof(b),"%H:%M",tm); text_scaled(x+20,y+20,b,rgb(20,30,45),2);
    strftime(b,sizeof(b),"%a, %d %b %Y",tm); text(x+20,y+53,b,rgb(75,85,100));
    rect(x+18,y+73,w-36,1,rgb(225,229,235));
    text(x+20,y+93,"CPU",rgb(30,40,55)); text(x+w-48,y+93,"OK",rgb(50,130,90)); rr(x+20,y+108,w-40,6,3,rgb(220,228,238)); rr(x+20,y+108,58,6,3,rgb(64,150,235));
    text(x+20,y+132,"RAM",rgb(30,40,55)); text(x+w-58,y+132,"LOW",rgb(50,130,90)); rr(x+20,y+147,w-40,6,3,rgb(220,228,238)); rr(x+20,y+147,85,6,3,rgb(64,150,235));
    text(x+20,y+171,"Disk",rgb(30,40,55)); rr(x+20,y+186,w-40,6,3,rgb(220,228,238)); rr(x+20,y+186,40,6,3,rgb(64,150,235));
    text(x+20,y+225,"NSK OS v1.0",rgb(80,90,105)); text(x+20,y+245,"Low-end / VM edition",rgb(80,90,105));
}
static void window_frame(Window *w){
    if(!w->open||w->minimized)return;
    int x=w->x,y=w->y,ww=w->w,hh=w->h;
    rr(x,y,ww,hh,14,blend(fb[(y+10)*stride+x+10],rgb(249,251,254),238));
    rect(x+18,y+12,12,12,rgb(245,82,86)); circle(x+24,y+18,5,rgb(245,82,86));
    circle(x+44,y+18,6,rgb(248,194,55)); circle(x+64,y+18,6,rgb(48,190,95));
    text(x+88,y+13,w->title,rgb(35,45,58));
    rect(x+1,y+36,ww-2,1,rgb(225,229,236));
}
static void file_window(Window *w){
    window_frame(w); int x=w->x,y=w->y;
    rr(x+16,y+48,w->w-32,30,8,rgb(242,245,249)); text(x+28,y+57,w->path[0]?w->path:"/home",rgb(75,85,100));
    const char *p=w->path[0]?w->path:"/home";
    DIR *d=opendir(p); if(!d){text(x+24,y+98,"Unable to open directory",rgb(190,70,70));return;}
    struct dirent *e; int row=0;
    while((e=readdir(d))&&row<10){
        if(!strcmp(e->d_name,".")||!strcmp(e->d_name,".."))continue;
        int yy=y+94+row*30; if(e->d_type==DT_DIR) icon_folder(x+22,yy-4); else {rr(x+22,yy,28,28,5,rgb(222,229,239));text(x+29,yy+8,".",rgb(80,95,110));}
        text(x+62,yy+7,e->d_name,rgb(45,55,68)); row++;
    }
    closedir(d);
}
static void term_push(const char *s){
    if(term_count<MAX_LINES) {snprintf(term_lines[term_count++],MAX_LINE,"%s",s);}
    else {for(int i=1;i<MAX_LINES;i++)strcpy(term_lines[i-1],term_lines[i]); snprintf(term_lines[MAX_LINES-1],MAX_LINE,"%s",s);}
}
static void run_command(const char *cmd){
    if(!cmd[0])return;
    if(!strcmp(cmd,"clear")){term_count=0;return;}
    if(!strcmp(cmd,"help")){term_push("NSK Terminal: help, clear, ls, pwd, uname, neofetch, date, echo, reboot, poweroff");return;}
    if(!strcmp(cmd,"neofetch")){term_push("NSK OS v1.0 | x86_64 | NSK Desktop | BusyBox userspace");return;}
    if(!strcmp(cmd,"reboot")){sync(); reboot(RB_AUTOBOOT); return;}
    if(!strcmp(cmd,"poweroff")){sync(); reboot(RB_POWER_OFF); return;}
    char full[400]; snprintf(full,sizeof(full),"/bin/sh -c '%s' 2>&1",cmd);
    FILE *fp=popen(full,"r"); if(!fp){term_push("command failed");return;}
    char linebuf[MAX_LINE]; while(fgets(linebuf,sizeof(linebuf),fp)){linebuf[strcspn(linebuf,"\r\n")]=0;term_push(linebuf);}
    pclose(fp);
}
static void terminal_window(Window *w){
    window_frame(w); int x=w->x,y=w->y;
    rr(x+12,y+48,w->w-24,w->h-60,10,rgb(18,22,28));
    int max=(w->h-82)/14, start=term_count-max; if(start<0)start=0;
    for(int i=start,j=0;i<term_count;i++,j++)text(x+25,y+58+j*14,term_lines[i],rgb(225,232,240));
    char prompt[300]; snprintf(prompt,sizeof(prompt),"nsk@nskos:~$ %s%s",terminal_input, (terminal_len%2)?"":"_");
    text(x+25,y+w->h-35,prompt,rgb(115,220,150));
}
static void simple_window(Window *w){
    window_frame(w); int x=w->x,y=w->y;
    if(w->type==3){
        text(x+24,y+62,"NSK OS Settings",rgb(35,45,58));
        text(x+24,y+88,"Appearance",rgb(75,85,100)); text(x+24,y+110,"Light theme     Enabled",rgb(35,45,58));
        text(x+24,y+140,"Display",rgb(75,85,100)); text(x+24,y+162,"Framebuffer     Auto",rgb(35,45,58));
        text(x+24,y+192,"System",rgb(75,85,100)); text(x+24,y+214,"Architecture    x86_64",rgb(35,45,58));
    } else if(w->type==4){
        text(x+24,y+62,"NSK Browser",rgb(35,45,58));
        rr(x+20,y+82,w->w-40,30,8,rgb(241,244,248)); text(x+32,y+91,"about:nsk-os",rgb(80,90,105));
        text(x+24,y+132,"NSK OS Browser shell",rgb(35,45,58));
        text(x+24,y+154,"This lightweight build keeps the desktop",rgb(80,90,105));
        text(x+24,y+170,"small and VM-friendly.",rgb(80,90,105));
    } else {
        text(x+24,y+62,"Welcome to NSK OS",rgb(35,45,58));
        text(x+24,y+88,"A compact desktop for low-end PCs and VMs.",rgb(80,90,105));
        text(x+24,y+116,"Ctrl+Alt+T  Terminal",rgb(80,90,105));
        text(x+24,y+134,"Click dock icons to open applications.",rgb(80,90,105));
    }
}
static void draw_window(Window *w){
    if(w->type==1)file_window(w); else if(w->type==2)terminal_window(w); else simple_window(w);
}
static int hit(Window *w,int x,int y){return w->open&&!w->minimized&&x>=w->x&&x<w->x+w->w&&y>=w->y&&y<w->y+w->h;}
static void open_window(int type,const char *title,const char *path){
    for(int i=0;i<nwins;i++)if(wins[i].open&&wins[i].type==type&&!wins[i].minimized){active=i;return;}
    if(nwins>=MAX_WINDOWS) return;
    Window *w=&wins[nwins]; memset(w,0,sizeof(*w)); w->open=1;w->type=type;w->x=150+nwins*35;w->y=90+nwins*25;w->w=(type==2?600:520);w->h=(type==2?420:360);snprintf(w->title,sizeof(w->title),"%s",title);if(path)snprintf(w->path,sizeof(w->path),"%s",path);active=nwins;nwins++;
}
static void draw_all(void){
    draw_wallpaper(); topbar(); desktop_icons(); status_panel();
    for(int i=0;i<nwins;i++) if(i!=active) draw_window(&wins[i]);
    if(nwins>0&&wins[active].open)draw_window(&wins[active]);
    dock(); 
    // mouse cursor
    line(mouse_x,mouse_y,mouse_x,mouse_y+15,rgb(25,35,50)); line(mouse_x,mouse_y+15,mouse_x+10,mouse_y+11,rgb(25,35,50)); line(mouse_x+10,mouse_y+11,mouse_x+5,mouse_y+9,rgb(25,35,50)); line(mouse_x+5,mouse_y+9,mouse_x,mouse_y,rgb(25,35,50));
    need_redraw=0;
}
static int key_to_ascii(int code,int shift){
    const char *norm="1234567890-=";
    const char *shft="!@#$%^&*()_+";
    if(code>=KEY_1&&code<=KEY_0){int idx=code-KEY_1;if(idx==9)idx=9;return shift?shft[idx]:norm[idx];}
    if(code>=KEY_A&&code<=KEY_Z){char c='a'+(code-KEY_A);return shift?(c-'a'+'A'):c;}
    if(code==KEY_SPACE) return ' ';
    if(code==KEY_ENTER) return '\n';
    if(code==KEY_BACKSPACE) return '\b';
    if(code==KEY_MINUS) return shift ? '_' : '-';
    if(code==KEY_EQUAL) return shift ? '+' : '=';
    if(code==KEY_SLASH) return shift ? '?' : '/';
    if(code==KEY_DOT) return shift ? '>' : '.';
    if(code==KEY_COMMA) return shift ? '<' : ',';
    if(code==KEY_SEMICOLON) return shift ? ':' : ';';
    if(code==KEY_APOSTROPHE) return shift ? '"' : '\'';
    return 0;
}
static void handle_key(int code,int value){
    static int shift=0;
    if(code==KEY_LEFTSHIFT||code==KEY_RIGHTSHIFT){shift=value;return;}
    if(code==KEY_LEFTCTRL||code==KEY_RIGHTCTRL){ctrl_down=value;return;}
    if(code==KEY_LEFTALT||code==KEY_RIGHTALT){alt_down=value;return;}
    if(value!=1)return;
    if(code==KEY_LEFTCTRL||code==KEY_RIGHTCTRL){ ctrl_down=1; return; }
    if(code==KEY_LEFTALT||code==KEY_RIGHTALT){ alt_down=1; return; }
    if(ctrl_down && alt_down && code==KEY_T){ open_window(2,"NSK Terminal",NULL); need_redraw=1; return; }
    if(code==KEY_F1){open_window(0,"Home",NULL);need_redraw=1;return;}
    int a=key_to_ascii(code,shift);
    if(a&&nwins>0&&wins[active].type==2&&wins[active].open){
        if(a=='\n'){terminal_input[terminal_len]=0;term_push(terminal_input);run_command(terminal_input);terminal_len=0;terminal_input[0]=0;}
        else if(a=='\b'){if(terminal_len>0)terminal_input[--terminal_len]=0;}
        else if(terminal_len<MAX_LINE-1){terminal_input[terminal_len++]=(char)a;terminal_input[terminal_len]=0;}
        need_redraw=1;
    }
}
static void handle_mouse(int type,int code,int value){
    if(type==EV_REL){ if(code==REL_X)mouse_x+=value; else if(code==REL_Y)mouse_y+=value; if(mouse_x<0)mouse_x=0;if(mouse_y<36)mouse_y=36;if(mouse_x>=sw)mouse_x=sw-1;if(mouse_y>=sh)mouse_y=sh-1;need_redraw=1; }
    if(type==EV_KEY&&code==BTN_LEFT){
        if(value==1){
            mouse_down=1;
            // window controls / focus
            for(int i=nwins-1;i>=0;i--)if(hit(&wins[i],mouse_x,mouse_y)){active=i; if(mouse_x<wins[i].x+80&&mouse_y<wins[i].y+36){wins[i].open=0;} need_redraw=1; return;}
            int dy=sh-84, dx=(sw-560)/2;
            if(mouse_y>=dy&&mouse_y<dy+70&&mouse_x>=dx&&mouse_x<dx+560){
                int idx=(mouse_x-(dx+28))/67; if(idx<0)idx=0;if(idx>6)idx=6;
                if(idx==0)open_window(4,"NSK Browser",NULL);
                else if(idx==1)open_window(4,"NSK Browser",NULL);
                else if(idx==2)open_window(1,"File Manager","/home");
                else if(idx==4)open_window(2,"NSK Terminal",NULL);
                else if(idx==5)open_window(3,"Settings",NULL);
                need_redraw=1; return;
            }
            // desktop icons
            if(mouse_x<130&&mouse_y>50&&mouse_y<520){
                int id=(mouse_y-64)/96; if(id<0)id=0;if(id>4)id=4;
                const char *p[]={"/home","/home/Documents","/home/Pictures","/home/Music","/tmp"};
                open_window(1,id==4?"Trash":"File Manager",p[id]); need_redraw=1; return;
            }
        } else if(value==0) mouse_down=0;
    }
}
static void scan_inputs(int *fds,int n){
    struct input_event ev;
    for(int i=0;i<n;i++){
        while(read(fds[i],&ev,sizeof(ev))==sizeof(ev)){
            if(ev.type==EV_KEY && ev.code>=KEY_ESC && ev.code<=KEY_MAX) handle_key(ev.code,ev.value);
            if(ev.type==EV_REL || (ev.type==EV_KEY&&(ev.code==BTN_LEFT||ev.code==BTN_RIGHT))) handle_mouse(ev.type,ev.code,ev.value);
        }
    }
}
int main(void){
    fbfd=open("/dev/fb0",O_RDWR);
    if(fbfd<0){fprintf(stderr,"NSK OS: /dev/fb0 unavailable\n");return 1;}
    struct fb_var_screeninfo v; struct fb_fix_screeninfo f;
    ioctl(fbfd,FBIOGET_VSCREENINFO,&v); ioctl(fbfd,FBIOGET_FSCREENINFO,&f);
    sw=v.xres;sh=v.yres;stride=f.line_length/4;fbsize=(size_t)f.smem_len;
    if(sw>WMAX||sh>HMAX||v.bits_per_pixel!=32){fprintf(stderr,"NSK OS needs 32-bit framebuffer\n");return 1;}
    fb=mmap(NULL,fbsize,PROT_READ|PROT_WRITE,MAP_SHARED,fbfd,0);
    if(fb==MAP_FAILED)return 1;
    mouse_x=sw/2;mouse_y=sh/2;
    int fds[16],nf=0;
    for(int i=0;i<16;i++){char p[64];snprintf(p,sizeof(p),"/dev/input/event%d",i);int fd=open(p,O_RDONLY|O_NONBLOCK);if(fd>=0)fds[nf++]=fd;}
    open_window(0,"Home",NULL);
    term_push("NSK Terminal ready. Type 'help' for commands.");
    while(!quit_requested){
        scan_inputs(fds,nf);
        if(need_redraw)draw_all();
        usleep(16000);
    }
    for(int i=0;i<nf;i++) close(fds[i]);
    munmap(fb,fbsize);
    close(fbfd);
    return 0;
}
