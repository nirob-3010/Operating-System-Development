#include <stdint.h>

typedef struct {
    uint32_t flags;
    uint32_t mem_lower, mem_upper;
    uint32_t boot_device, cmdline, mods_count, mods_addr;
    uint32_t syms[4];
    uint32_t mmap_length, mmap_addr, drives_length, drives_addr;
    uint32_t config_table, boot_loader_name, apm_table;
    uint32_t vbe_control_info, vbe_mode_info;
    uint16_t vbe_mode, vbe_interface_seg, vbe_interface_off, vbe_interface_len;
    uint64_t framebuffer_addr;
    uint32_t framebuffer_pitch, framebuffer_width, framebuffer_height;
    uint8_t framebuffer_bpp, framebuffer_type;
    uint16_t reserved;
} __attribute__((packed)) multiboot_info_t;

typedef struct {
    uint32_t addr, pitch, width, height, bpp;
} framebuffer_t;

static framebuffer_t fb;
static uint32_t mouse_x, mouse_y;
static int mouse_left, mouse_prev_left;
static int mouse_cycle;
static int key_last;

#define RGB(r,g,b) ((uint32_t)(b)|((uint32_t)(g)<<8)|((uint32_t)(r)<<16))

static inline void outb(uint16_t p,uint8_t v){__asm__ volatile("outb %0,%1"::"a"(v),"Nd"(p));}
static inline uint8_t inb(uint16_t p){uint8_t v;__asm__ volatile("inb %1,%0":"=a"(v):"Nd"(p));return v;}

static void putpixel(int x,int y,uint32_t c){
    if(x<0||y<0||x>=(int)fb.width||y>=(int)fb.height)return;
    volatile uint8_t *p=(volatile uint8_t*)fb.addr+y*fb.pitch+x*(fb.bpp/8);
    if(fb.bpp==32)*(volatile uint32_t*)p=c;
    else if(fb.bpp==24){p[0]=c&255;p[1]=(c>>8)&255;p[2]=(c>>16)&255;}
    else if(fb.bpp==16)*(volatile uint16_t*)p=(uint16_t)(((c>>19)&31)<<11)|(((c>>10)&63)<<5)|((c>>3)&31);
}
static void rect(int x,int y,int w,int h,uint32_t c){
    if(w<=0||h<=0)return;
    for(int yy=y;yy<y+h;yy++)for(int xx=x;xx<x+w;xx++)putpixel(xx,yy,c);
}
static void frame(int x,int y,int w,int h,uint32_t c){
    rect(x,y,w,1,c);rect(x,y,w,h?1:0,c);rect(x,y,1,h,c);rect(x+w-1,y,1,h,c);rect(x,y+h-1,w,1,c);
}

/* compact 5x7 font */
static const uint8_t font[64][7]={
{0,0,0,0,0,0,0},{31,4,4,4,4,4,31},{14,17,17,31,17,17,17},
{30,17,17,17,17,17,30},{31,16,16,30,16,16,31},{31,16,16,30,16,16,16},
{14,17,17,17,17,17,14},{17,17,17,31,17,17,17},{31,4,4,4,4,4,31},
{17,18,20,24,20,18,17},{16,16,16,16,16,16,31},{17,25,21,19,17,17,17},
{17,27,21,21,17,17,17},{15,16,16,14,1,1,30},{14,17,17,17,17,17,14},
{31,1,2,4,8,16,31},{14,17,17,15,1,1,14},{30,17,17,30,20,18,17},
{15,16,16,14,1,1,30},{31,4,4,4,4,4,4},{17,17,17,17,17,10,4},
{17,17,17,17,10,10,4},{17,17,21,21,21,27,17},{17,17,10,4,10,17,17},
{17,17,10,4,4,4,4},{31,1,2,4,8,16,31}
};
static int glyph_index(char c){
    if(c>='A'&&c<='Z')return c-'A'+1;
    return 0;
}
static void text(int x,int y,const char*s,uint32_t c,int sc){
    while(*s){
        char ch=*s++;
        int gi=glyph_index(ch);
        for(int gy=0;gy<7;gy++)for(int gx=0;gx<5;gx++)
            if(font[gi][gy]&(1<<(4-gx)))rect(x+gx*sc,y+gy*sc,sc,sc,c);
        x+=6*sc;
    }
}

/* keyboard */
static const char keymap[128]={
0,27,'1','2','3','4','5','6','7','8','9','0','-','=',8,9,
'q','w','e','r','t','y','u','i','o','p','[',']','\n',0,'a','s',
'd','f','g','h','j','k','l',';','\'','`',0,'\\','z','x','c','v',
'b','n','m',',','.','/',0,'*',0,' ',0
};
static char typed[64];
static int typed_len;

static void keyboard_poll(void){
    if(!(inb(0x64)&1))return;
    uint8_t sc=inb(0x60);
    if(sc&0x80)return;
    if(sc<128){
        char ch=keymap[sc];
        if(ch){
            key_last=(unsigned char)ch;
            if(ch==8){if(typed_len)typed[--typed_len]=0;}
            else if(ch>=32&&ch<127&&typed_len<62){typed[typed_len++]=ch;typed[typed_len]=0;}
        }
    }
}

/* mouse */
static int mouse_wait(int type){
    for(uint32_t i=0;i<100000;i++){uint8_t s=inb(0x64);if(type==0&&!(s&1))return 1;if(type==1&&(s&1))return 1;}
    return 0;
}
static void mouse_write(uint8_t d){
    if(!mouse_wait(0))return;outb(0x64,0xD4);if(!mouse_wait(0))return;outb(0x60,d);
}
static uint8_t mouse_read(void){if(!mouse_wait(1))return 0;return inb(0x60);}
static void mouse_init(void){
    if(!mouse_wait(0))return;outb(0x64,0xA8);
    if(!mouse_wait(0))return;outb(0x64,0x20);uint8_t s=mouse_read();s|=2;s&=~0x20;
    if(!mouse_wait(0))return;outb(0x64,0x60);if(!mouse_wait(0))return;outb(0x60,s);
    mouse_write(0xF6);(void)mouse_read();mouse_write(0xF4);(void)mouse_read();
    mouse_x=fb.width/2;mouse_y=fb.height/2;
}

/* window system */
typedef struct {int x,y,w,h;int open,minimized,dragging;const char*title;} window_t;
static window_t wins[3]={
 {150,130,640,390,1,0,0,"FILES"},
 {250,190,430,260,1,0,0,"TERMINAL"},
 {0,0,0,0,0,0,0,"ABOUT"}
};
static int focused=0;
static int drag_off_x,drag_off_y;

static int hit(window_t*w,int x,int y){return w->open&&!w->minimized&&x>=w->x&&x<w->x+w->w&&y>=w->y&&y<w->y+w->h;}
static void bring_front(int n){
    if(n==focused)return;
    window_t t=wins[n];wins[n]=wins[focused];wins[focused]=t;
    /* keep focus index 0 as front window */
}
static void window_click(int x,int y){
    if(y<40)return;
    for(int i=0;i<3;i++){
        if(hit(&wins[i],x,y)){
            focused=i;
            window_t*w=&wins[i];
            if(y<w->y+32){
                if(x<w->x+58){w->open=0;w->dragging=0;return;}
                if(x<w->x+76){w->minimized=1;w->dragging=0;return;}
                w->dragging=1;drag_off_x=x-w->x;drag_off_y=y-w->y;
            }
            return;
        }
    }
}
static void mouse_poll(void){
    while(inb(0x64)&1){
        uint8_t d=inb(0x60);
        if(mouse_cycle==0){if(!(d&8))continue;mouse_packet0:d;mouse_cycle=1;}
        else if(mouse_cycle==1){/* save X in static scratch */ static uint8_t mx;mx=d;mouse_cycle=2;}
        else {
            static uint8_t mx;
            /* The previous byte is not retained by this branch on some compilers;
               use controller packet bytes via a small static buffer below instead. */
            mouse_cycle=0;
        }
    }
}

/* robust 3-byte packet parser */
static uint8_t mp[3];
static int mi;
static void mouse_poll2(void){
    while(inb(0x64)&1){
        uint8_t d=inb(0x60);
        if(mi==0){if(!(d&8))continue;mp[0]=d;mi=1;}
        else if(mi==1){mp[1]=d;mi=2;}
        else{
            mp[2]=d;mi=0;
            int dx=(int8_t)mp[1],dy=(int8_t)mp[2];
            if(!(mp[0]&0x40)){
                int nx=(int)mouse_x+dx,ny=(int)mouse_y-dy;
                if(nx<0)nx=0;if(ny<0)ny=0;if(nx>=(int)fb.width)nx=fb.width-1;if(ny>=(int)fb.height)ny=fb.height-1;
                mouse_x=nx;mouse_y=ny;
            }
            mouse_prev_left=mouse_left;mouse_left=(mp[0]&1)!=0;
            if(mouse_left&&!mouse_prev_left)window_click(mouse_x,mouse_y);
            if(!mouse_left){
                for(int i=0;i<3;i++)wins[i].dragging=0;
            } else if(focused>=0&&wins[focused].dragging){
                window_t*w=&wins[focused];w->x=(int)mouse_x-drag_off_x;w->y=(int)mouse_y-drag_off_y;
            }
            if(mouse_left&&!mouse_prev_left&&mouse_y>fb.height-90&&mouse_y<fb.height-15){
                int dx0=((int)fb.width-360)/2;
                if(mouse_x>dx0+80&&mouse_x<dx0+135){wins[0].open=1;wins[0].minimized=0;}
                if(mouse_x>dx0+145&&mouse_x<dx0+200){wins[1].open=1;wins[1].minimized=0;}
            }
        }
    }
}

static void cursor(void){
    int x=mouse_x,y=mouse_y;
    for(int i=0;i<16;i++)rect(x,y+i,2,2,RGB(255,255,255));
    for(int i=0;i<9;i++)rect(x+i,y+10,2,1,RGB(255,255,255));
}
static void dock(void){
    int dw=360,dh=72,dx=(fb.width-dw)/2,dy=fb.height-88;
    rect(dx,dy,dw,dh,RGB(235,238,245));frame(dx,dy,dw,dh,RGB(160,166,180));
    rect(dx+18,dy+14,44,44,RGB(75,155,240));text(dx+28,dy+27,"N",RGB(255,255,255),2);
    rect(dx+84,dy+14,44,44,RGB(75,185,115));text(dx+94,dy+27,"F",RGB(255,255,255),2);
    rect(dx+150,dy+14,44,44,RGB(45,48,55));text(dx+160,dy+27,"T",RGB(255,255,255),2);
    rect(dx+216,dy+14,44,44,RGB(125,130,140));text(dx+226,dy+27,"S",RGB(255,255,255),2);
    rect(dx+282,dy+14,44,44,RGB(215,95,90));text(dx+292,dy+27,"A",RGB(255,255,255),2);
}
static void draw_window(window_t*w){
    if(!w->open||w->minimized)return;
    rect(w->x+7,w->y+7,w->w,w->h,RGB(20,25,35));
    rect(w->x,w->y,w->w,w->h,RGB(248,249,252));
    rect(w->x,w->y,w->w,32,RGB(232,234,240));frame(w->x,w->y,w->w,w->h,RGB(155,160,172));
    rect(w->x+12,w->y+11,10,10,RGB(235,80,80));
    rect(w->x+30,w->y+11,10,10,RGB(240,185,65));
    rect(w->x+48,w->y+11,10,10,RGB(70,190,100));
    text(w->x+78,w->y+10,w->title,RGB(55,58,66),2);
}
static void desktop(void){
    rect(0,0,fb.width,fb.height,RGB(30,52,92));
    rect(0,0,fb.width,fb.height/2,RGB(48,78,128));
    rect(0,0,fb.width,34,RGB(244,245,248));
    text(16,10,"NSK",RGB(35,38,45),2);
    text(75,10,"NSK OS",RGB(70,74,84),2);
    text(fb.width-105,10,"10:42",RGB(70,74,84),2);
    text(34,70,"NSK OS",RGB(255,255,255),4);
    text(36,108,"DESKTOP",RGB(220,228,240),2);

    for(int i=2;i>=0;i--)draw_window(&wins[i]);

    if(wins[0].open&&!wins[0].minimized){
        window_t*w=&wins[0];
        rect(w->x+1,w->y+33,145,w->h-34,RGB(239,241,246));
        text(w->x+18,w->y+57,"NSK OS",RGB(45,48,55),2);
        text(w->x+18,w->y+87,"DESKTOP",RGB(65,100,180),1);
        text(w->x+18,w->y+111,"FILES",RGB(65,100,180),2);
        rect(w->x+185,w->y+72,52,58,RGB(70,150,235));text(w->x+195,w->y+94,"OS",RGB(255,255,255),2);
        rect(w->x+275,w->y+72,52,58,RGB(90,185,120));text(w->x+281,w->y+94,"APP",RGB(255,255,255),1);
        rect(w->x+365,w->y+72,52,58,RGB(240,175,60));text(w->x+371,w->y+94,"TXT",RGB(255,255,255),1);
    }
    if(wins[1].open&&!wins[1].minimized){
        window_t*w=&wins[1];
        rect(w->x+15,w->y+55,w->w-30,w->h-75,RGB(35,38,43));
        text(w->x+28,w->y+75,"NSK OS",RGB(100,220,130),2);
        text(w->x+28,w->y+100,">",RGB(100,220,130),2);
        if(typed_len)text(w->x+45,w->y+100,typed,RGB(235,235,235),2);
    }
    dock();
    cursor();
}

void kmain(uint32_t magic,uint32_t info_addr){
    if(magic!=0x2BADB002)for(;;)__asm__ volatile("hlt");
    multiboot_info_t*mb=(multiboot_info_t*)info_addr;
    if(!(mb->flags&(1u<<12))||!mb->framebuffer_addr)for(;;)__asm__ volatile("hlt");
    fb.addr=(uint32_t)mb->framebuffer_addr;fb.pitch=mb->framebuffer_pitch;
    fb.width=mb->framebuffer_width;fb.height=mb->framebuffer_height;fb.bpp=mb->framebuffer_bpp;
    if(fb.bpp!=16&&fb.bpp!=24&&fb.bpp!=32)for(;;)__asm__ volatile("hlt");
    mouse_init();
    for(;;){
        keyboard_poll();
        mouse_poll2();
        desktop();
        __asm__ volatile("hlt");
    }
}
