(() => {
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const partsEl=document.getElementById('parts'),batteryEl=document.getElementById('battery'),message=document.getElementById('message');
const overlay=document.getElementById('overlay'),startBtn=document.getElementById('start'),title=document.getElementById('overlay-title'),desc=document.getElementById('overlay-text');
let W=360,H=640,dpr=1,running=false,won=false,lost=false,last=0,parts=0,battery=100,flash=true;
let player={x:180,y:490,r:9,speed:115,angle:-Math.PI/2},monster={x:180,y:105,r:12,speed:37};
let items=[],walls=[],exit={x:180,y:52,w:54,h:24},keys={x:0,y:0},joystick={x:0,y:0},touchId=null;
function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);makeMap();}
function makeMap(){walls=[];const sx=W/360,sy=H/640;
 // Interior room boundaries and scattered obstacles
 walls.push({x:0,y:0,w:W,h:12},{x:0,y:H-12,w:W,h:12},{x:0,y:0,w:12,h:H},{x:W-12,y:0,w:12,h:H});
 walls.push({x:W*.18,y:H*.28,w:W*.28,h:13},{x:W*.58,y:H*.28,w:W*.25,h:13});
 walls.push({x:W*.18,y:H*.28,w:13,h:H*.20},{x:W*.78,y:H*.28,w:13,h:H*.20});
 walls.push({x:W*.34,y:H*.55,w:W*.32,h:13},{x:W*.34,y:H*.55,w:13,h:H*.15});
 items=[{x:W*.19,y:H*.18,taken:false},{x:W*.78,y:H*.43,taken:false},{x:W*.73,y:H*.72,taken:false}];
 player.x=W/2;player.y=H*.78;monster.x=W/2;monster.y=H*.17;
}
function circleRect(c,r){return c.x+r.x>r.x && false}
function blocked(x,y,rad){return walls.some(a=>x+rad>a.x&&x-rad<a.x+a.w&&y+rad>a.y&&y-rad<a.y+a.h)}
function move(ent,dx,dy){let nx=ent.x+dx,ny=ent.y+dy;if(!blocked(nx,ent.y,ent.r))ent.x=nx;if(!blocked(ent.x,ny,ent.r))ent.y=ny;ent.x=Math.max(23,Math.min(W-23,ent.x));ent.y=Math.max(25,Math.min(H-25,ent.y))}
function draw(){ctx.fillStyle='#101814';ctx.fillRect(0,0,W,H);
 // floor tiles
 for(let y=12;y<H;y+=32)for(let x=12;x<W;x+=32){ctx.fillStyle=((x/32+y/32)%2<1)?'#17211c':'#141d18';ctx.fillRect(x,y,31,31)}
 // stains
 ctx.fillStyle='#263128';for(let i=0;i<18;i++){let x=(i*73+31)%W,y=(i*113+77)%H;ctx.fillRect(x,y,3,2)}
 // exit
 ctx.fillStyle=parts===3?'#789b70':'#38443b';ctx.fillRect(exit.x-exit.w/2,exit.y,exit.w,exit.h);ctx.strokeStyle='#b5c7a1';ctx.strokeRect(exit.x-exit.w/2,exit.y,exit.w,exit.h);
 ctx.fillStyle='#d7e1c8';ctx.font='8px monospace';ctx.textAlign='center';ctx.fillText('ВЫХОД',exit.x,exit.y-5);
 walls.forEach(a=>{ctx.fillStyle='#303b33';ctx.fillRect(a.x,a.y,a.w,a.h);ctx.fillStyle='#465248';ctx.fillRect(a.x,a.y,a.w,3)});
 // collectible fuses
 items.forEach(it=>{if(!it.taken){ctx.save();ctx.translate(it.x,it.y);ctx.rotate(Math.PI/4);ctx.fillStyle='#e2c76e';ctx.fillRect(-5,-5,10,10);ctx.strokeStyle='#fff0a8';ctx.strokeRect(-5,-5,10,10);ctx.restore()}});
 // monster
 ctx.fillStyle='#090b0a';ctx.beginPath();ctx.arc(monster.x,monster.y,monster.r+4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a43f38';ctx.beginPath();ctx.arc(monster.x-4,monster.y-2,2,0,7);ctx.arc(monster.x+4,monster.y-2,2,0,7);ctx.fill();
 // player
 ctx.fillStyle='#c4d3b5';ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,7);ctx.fill();ctx.fillStyle='#26342a';ctx.fillRect(player.x-3,player.y-2,6,4);
 // deep darkness, then carve out a soft directional flashlight beam
 ctx.save();
 const lowBattery=battery>0&&battery<20;
 const flicker=lowBattery && Math.sin(performance.now()/75)>0.82;
 ctx.fillStyle=(flash&&battery>0&&!flicker)?'rgba(0,0,0,.91)':'rgba(0,0,0,.96)';
 ctx.fillRect(0,0,W,H);
 if(flash&&battery>0&&!flicker){
   const reach=Math.min(W*.78,255)*(0.72+0.28*(battery/100));
   const spread=0.48;
   ctx.save();
   ctx.globalCompositeOperation='destination-out';
   ctx.beginPath();
   ctx.moveTo(player.x,player.y);
   ctx.arc(player.x,player.y,reach,player.angle-spread,player.angle+spread);
   ctx.closePath();ctx.clip();
   const beam=ctx.createRadialGradient(player.x,player.y,8,player.x,player.y,reach);
   beam.addColorStop(0,'rgba(0,0,0,1)');
   beam.addColorStop(.58,'rgba(0,0,0,.94)');
   beam.addColorStop(.84,'rgba(0,0,0,.55)');
   beam.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=beam;ctx.fillRect(player.x-reach,player.y-reach,reach*2,reach*2);
   ctx.restore();
 }
 // weak emergency glow when the flashlight is off or empty
 if(!flash||battery<=0){
   ctx.globalCompositeOperation='destination-out';
   const glow=ctx.createRadialGradient(player.x,player.y,2,player.x,player.y,43);
   glow.addColorStop(0,'rgba(0,0,0,.48)');glow.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=glow;ctx.beginPath();ctx.arc(player.x,player.y,43,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function update(dt){if(!running)return;
 const len=Math.hypot(joystick.x,joystick.y)||1;
 const inputPower=Math.min(1,Math.hypot(joystick.x,joystick.y));
 if(inputPower>0.08)player.angle=Math.atan2(joystick.y,joystick.x);
 move(player,joystick.x/len*player.speed*dt*inputPower,joystick.y/len*player.speed*dt*inputPower);
 if(flash&&battery>0)battery=Math.max(0,battery-3.8*dt);
 items.forEach(it=>{if(!it.taken&&Math.hypot(player.x-it.x,player.y-it.y)<22){it.taken=true;parts++;partsEl.textContent=parts+' / 3';message.textContent='ПРЕДОХРАНИТЕЛЬ НАЙДЕН'}});
 let dx=player.x-monster.x,dy=player.y-monster.y,d=Math.hypot(dx,dy)||1;let speed=monster.speed+(parts*4);if(d<220)move(monster,dx/d*speed*dt,dy/d*speed*dt);
 if(d<player.r+monster.r+4){end(false)}
 if(parts===3&&Math.hypot(player.x-exit.x,player.y-exit.y)<34)end(true);
 batteryEl.textContent=Math.ceil(battery)+'%';
}
function end(win){running=false;won=win;lost=!win;overlay.classList.remove('hidden');title.innerHTML=win?'ТЫ <span>ВЫЖИЛ</span>':'ТЕБЯ <span>НАШЛИ</span>';desc.textContent=win?'Ты собрал все предохранители и выбрался. Но это только начало...':'Монстр настиг тебя в темноте. Попробуй ещё раз.';startBtn.textContent='ИГРАТЬ СНОВА'}
function reset(){parts=0;battery=100;flash=true;partsEl.textContent='0 / 3';batteryEl.textContent='100%';message.textContent='НАЙДИ 3 ПРЕДОХРАНИТЕЛЯ И ДОБЕРИСЬ ДО ВЫХОДА';makeMap();running=true;overlay.classList.add('hidden');last=performance.now()}
function loop(t){let dt=Math.min((t-last)/1000,.04);last=t;update(dt);draw();requestAnimationFrame(loop)}
startBtn.addEventListener('click',reset);
document.getElementById('light').addEventListener('click',()=>{flash=!flash});
const stick=document.getElementById('stick'),knob=document.getElementById('knob');
function setStick(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,l=Math.hypot(dx,dy),m=36;if(l>m){dx=dx/l*m;dy=dy/l*m}joystick.x=dx/m;joystick.y=dy/m;knob.style.transform=`translate(${dx}px,${dy}px)`}
stick.addEventListener('pointerdown',e=>{touchId=e.pointerId;stick.setPointerCapture(touchId);setStick(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===touchId)setStick(e)});
function release(e){if(e.pointerId===touchId){touchId=null;joystick.x=joystick.y=0;knob.style.transform='translate(0,0)'}}
stick.addEventListener('pointerup',release);stick.addEventListener('pointercancel',release);
window.addEventListener('resize',resize);resize();requestAnimationFrame(t=>{last=t;loop(t)});
})();