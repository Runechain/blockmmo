const DEF={
  gravity:1320, accel:1180, friction:920, maxRun:190, jump:430,
  jumpCut:.45, coyote:.11, jumpBuffer:.12, hurtCooldown:.42,
  w:16, h:29, deadX:176, deadY:96
};

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function hit(a,b){ return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y; }
function copyRect(r){ return {x:r.x||0,y:r.y||0,w:r.w||0,h:r.h||0}; }
function body(p){ return {x:p.x-p.w/2,y:p.y-p.h/2,w:p.w,h:p.h}; }
function enemyBody(e){ return {x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h}; }
function inputDown(input, a, b){ return !!(input[a]||input[b]); }
function call(api, name, ...args){ return api&&typeof api[name]==='function'?api[name](...args):undefined; }

export function createPlatformerMode(level={}){
  let ctx=null, api=null, player=null, camera=null, platforms=[], hazards=[], projectiles=[], enemies=[];
  let bossFired=false, bossLocked=false, cameraLock=null, exitFired=false, attackBox=null, lastJump=false, lastSafe=null;
  const cfg={...DEF, ...(level.physics||{})};

  function reset(){
    platforms=(level.platforms||[]).map((p,i)=>({...p, id:p.id||'p'+i, type:p.type||'solid', _dx:0, _dy:0}));
    hazards=(level.hazards||[]).map((h,i)=>({...h, id:h.id||'h'+i, type:h.type||'damage', _t:(h.delay||0)}));
    projectiles=[];
    const spawn=level.spawn||{x:32,y:32};
    player={
      x:spawn.x, y:spawn.y, vx:0, vy:0, w:cfg.w, h:cfg.h, facing:1,
      onGround:false, coyote:0, jumpBuffer:0, jumpHeld:false, stun:0,
      hurtCd:0, attackCd:0, stand:null, moving:false, animT:0
    };
    enemies=(level.enemies||[]).map((e,i)=>({
      id:e.id||'e'+i, type:e.type||'creature', sprite:e.sprite||e.type||'pf-goblin',
      x:e.x||0, y:e.y||0, baseY:e.y||0, vx:0, w:e.w||24, h:e.h||34,
      hp:e.hp||24, maxHp:e.hp||24, damage:e.damage||1, speed:e.speed||34,
      aggro:e.aggro||170, patrolMin:e.patrolMin, patrolMax:e.patrolMax,
      facing:e.facing||-1, flying:!!e.flying, scale:e.scale||1, frameCount:e.frameCount||4,
      animRate:e.animRate||8, phase:Math.random()*10, hitFlash:0, dead:false
    }));
    camera={x:0,y:0,w:640,h:360};
    bossFired=false; bossLocked=false; cameraLock=null; exitFired=false; attackBox=null; lastJump=false;
    lastSafe={x:spawn.x, y:spawn.y};
  }

  function syncHost(){
    const p=api&&api.player;
    if(!p)return;
    p.x=player.x; p.y=player.y; p.vx=player.vx; p.vy=player.vy;
    p.dirX=player.facing; p.dirY=0; p.moving=player.moving;
  }

  function enter(nextCtx, nextApi){
    ctx=nextCtx; api=nextApi||{}; reset();
    camera.w=(ctx&&ctx.canvas&&ctx.canvas.width)||api.viewW||640;
    camera.h=(ctx&&ctx.canvas&&ctx.canvas.height)||api.viewH||360;
    if(api.player&&typeof api.player.x==='number')api.player.x=player.x;
    if(api.player&&typeof api.player.y==='number')api.player.y=player.y;
    updateCamera(0);
    call(api, 'log', 'Platformer route loaded: '+(level.name||level.id||'side path'));
  }

  function exit(){ call(api, 'log', 'Leaving platformer route.'); }

  function spend(reason, data){
    const p=api&&api.player;
    if(!p||typeof p.spendStamina!=='function')return true;
    return p.spendStamina(reason, data)!==false;
  }

  function hurt(amount, source){
    if(player.hurtCd>0)return;
    player.hurtCd=cfg.hurtCooldown;
    if(api&&api.player&&typeof api.player.damage==='function')api.player.damage(amount, source);
    else call(api, 'onDamage', amount, source);
  }

  function updatePlatforms(dt){
    for(const p of platforms){
      p._dx=0; p._dy=0;
      if(!p.vx&&!p.vy)continue;
      const ox=p.x, oy=p.y;
      p.x+=p.vx*dt; p.y+=p.vy*dt;
      if(typeof p.minX==='number'&&p.x<p.minX){ p.x=p.minX; p.vx=Math.abs(p.vx); }
      if(typeof p.maxX==='number'&&p.x>p.maxX){ p.x=p.maxX; p.vx=-Math.abs(p.vx); }
      if(typeof p.minY==='number'&&p.y<p.minY){ p.y=p.minY; p.vy=Math.abs(p.vy); }
      if(typeof p.maxY==='number'&&p.y>p.maxY){ p.y=p.maxY; p.vy=-Math.abs(p.vy); }
      p._dx=p.x-ox; p._dy=p.y-oy;
    }
  }

  function slowMul(){
    let m=1, b=body(player);
    for(const h of hazards){
      if((h.type==='slow'||h.type==='sticky')&&hit(b,h))m=Math.min(m, h.slow||h.mult||.45);
    }
    return m;
  }

  function moveX(dt, dir, mul){
    if(player.stun>0){ player.vx*=Math.max(0,1-dt*8); return; }
    if(dir){
      player.vx+=dir*cfg.accel*mul*dt;
      player.facing=dir>0?1:-1;
    }else{
      const f=cfg.friction*dt;
      if(Math.abs(player.vx)<=f)player.vx=0;
      else player.vx-=Math.sign(player.vx)*f;
    }
    player.vx=clamp(player.vx, -cfg.maxRun*mul, cfg.maxRun*mul);
  }

  function solidForX(p){ return p.type!=='oneWay'; }

  function collideX(dt){
    player.x+=player.vx*dt;
    const b=body(player);
    for(const p of platforms){
      if(!solidForX(p)||!hit(b,p))continue;
      if(player.vx>0)player.x=p.x-player.w/2;
      else if(player.vx<0)player.x=p.x+p.w+player.w/2;
      player.vx=0;
      b.x=player.x-player.w/2;
    }
  }

  function collideY(dt){
    const prev=body(player);
    player.y+=player.vy*dt;
    const b=body(player);
    player.onGround=false; player.stand=null;
    for(const p of platforms){
      if(!hit(b,p))continue;
      const wasAbove=prev.y+prev.h<=p.y+4;
      const wasBelow=prev.y>=p.y+p.h-4;
      if(p.type==='oneWay'){
        if(player.vy>=0&&wasAbove){
          player.y=p.y-player.h/2; player.vy=0; player.onGround=true; player.stand=p;
        }
        continue;
      }
      if(player.vy>=0&&wasAbove){
        player.y=p.y-player.h/2; player.vy=0; player.onGround=true; player.stand=p;
      }else if(player.vy<0&&wasBelow){
        player.y=p.y+p.h+player.h/2; player.vy=0;
      }
      b.y=player.y-player.h/2;
    }
    if(player.onGround&&player.stand&&player.stand._dx)player.x+=player.stand._dx;
    // Checkpoint: remember the last wide, static, solid platform we stood on (never a mover or one-way ledge).
    if(player.onGround&&player.stand&&player.stand.type!=='oneWay'&&!player.stand.vx&&!player.stand.vy&&player.stand.w>=48){
      lastSafe={x:clamp(player.x, player.stand.x+12, player.stand.x+player.stand.w-12), y:player.y};
    }
    player.coyote=player.onGround?cfg.coyote:Math.max(0, player.coyote-dt);
  }

  function doJump(input, dt){
    const jump=inputDown(input, 'jump', 'up');
    const pressed=!!(input.jumpPressed||input.upPressed||input.pressJump||(!lastJump&&jump));
    const released=!!(input.jumpReleased||input.upReleased||(lastJump&&!jump));
    lastJump=jump;
    if(pressed)player.jumpBuffer=cfg.jumpBuffer;
    else player.jumpBuffer=Math.max(0, player.jumpBuffer-dt);
    if(player.jumpBuffer>0&&player.coyote>0&&player.stun<=0){
      player.vy=-cfg.jump; player.onGround=false; player.coyote=0; player.jumpBuffer=0; player.jumpHeld=true;
      call(api, 'onJump', {mode:'platformer'});
    }
    if(released&&player.vy<0)player.vy*=cfg.jumpCut;
  }

  function melee(input){
    if(player.attackCd>0||player.stun>0)return;
    if(!(input.attackPressed||input.attack||input.confirmPressed))return;
    if(!spend('melee', {mode:'platformer'}))return;
    player.attackCd=.28;
    const w=28, h=22;
    attackBox={x:player.x+(player.facing>0?player.w/2:-player.w/2-w), y:player.y-h/2, w, h, t:.13, hits:new Set()};
    call(api, 'onMeleeHit', attackBox, {mode:'platformer', facing:player.facing});
  }

  function meleeDamage(){
    const p=api&&api.player;
    return p&&typeof p.getMeleeDamage==='function'?p.getMeleeDamage('platformer'):14;
  }

  function damageEnemies(){
    if(!attackBox)return;
    const dmg=meleeDamage();
    for(const e of enemies){
      if(e.dead||attackBox.hits.has(e.id)||!hit(attackBox, enemyBody(e)))continue;
      attackBox.hits.add(e.id);
      e.hp=Math.max(0, e.hp-dmg);
      e.hitFlash=.16;
      if(e.hp<=0){
        e.dead=true;
        call(api, 'onCreatureDefeated', {id:e.id,key:e.type,zoneId:level.id}, {mode:'platformer', enemy:e});
      }
    }
  }

  function updateEnemyMotion(e, dt){
    const dx=player.x-e.x, dy=player.y-e.y;
    const close=Math.abs(dx)<e.aggro&&Math.abs(dy)<100;
    let dir=0;
    if(close)dir=dx>0?1:-1;
    else if(typeof e.patrolMin==='number'&&typeof e.patrolMax==='number'){
      if(e.x<=e.patrolMin)e.facing=1;
      if(e.x>=e.patrolMax)e.facing=-1;
      dir=e.facing;
    }
    if(dir){
      e.x+=dir*e.speed*dt;
      e.facing=dir>0?1:-1;
      if(typeof e.patrolMin==='number')e.x=Math.max(e.patrolMin,e.x);
      if(typeof e.patrolMax==='number')e.x=Math.min(e.patrolMax,e.x);
    }
    if(e.flying)e.y=e.baseY+Math.sin(e.animT*2.4+e.phase)*8;
  }

  function updateEnemies(dt){
    const pb=body(player);
    for(const e of enemies){
      e.animT=(e.animT||0)+dt;
      if(e.hitFlash>0)e.hitFlash=Math.max(0,e.hitFlash-dt);
      if(e.dead)continue;
      updateEnemyMotion(e, dt);
      if(hit(pb, enemyBody(e))){
        player.vx+=(player.x<e.x?-1:1)*85;
        if(player.vy>0)player.vy=-110;
        hurt(e.damage, e);
      }
    }
  }

  function updateHazards(dt){
    if(player.hurtCd>0)player.hurtCd=Math.max(0, player.hurtCd-dt);
    const b=body(player);
    for(const h of hazards){
      if(h.type==='projectile'){
        h._t-=dt;
        if(h._t<=0){
          h._t=h.interval||1.4;
          projectiles.push({
            x:h.x+(h.w||8)/2, y:h.y+(h.h||8)/2, w:h.projW||7, h:h.projH||10,
            vx:h.speedX||0, vy:h.speedY||210, damage:h.damage||1, life:h.life||5, color:h.color||'#d7d0a2'
          });
        }
        continue;
      }
      if(!hit(b,h))continue;
      if(h.type==='damage')hurt(h.damage||1, h);
      if(h.type==='stun'){
        player.stun=Math.max(player.stun, h.stun||.45);
        hurt(h.damage||0, h);
      }
      if(h.type==='knockback'){
        player.vx=h.knockX||(player.x<h.x+h.w/2?-220:220);
        player.vy=h.knockY||-180;
        hurt(h.damage||1, h);
        if(api&&api.player&&typeof api.player.onKnockback==='function')api.player.onKnockback(h);
      }
      if(h.type==='sticky'&&h.staminaCost)spend('sticky', {mode:'platformer', hazard:h});
    }
    for(const p of projectiles){
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
      if(hit(body(player), p)){ hurt(p.damage||1, p); p.life=0; }
    }
    projectiles=projectiles.filter(p=>p.life>0&&p.y<(level.height||900)+80);
  }

  function triggers(){
    const b=body(player);
    if(level.exit&&!exitFired&&hit(b, level.exit)){
      exitFired=true;
      call(api, 'onExit', level.exit.id||level.exit.to||'exit', {mode:'platformer', level});
    }
    const z=level.bossTrigger;
    if(z&&!bossFired&&hit(b,z)){
      bossFired=true; bossLocked=true; cameraLock=z.lock?copyRect(z.lock):{x:camera.x,y:camera.y,w:camera.w,h:camera.h};
      call(api, 'onBossTrigger', z.id||'mini-boss', {mode:'platformer', level});
    }
  }

  function updateCamera(){
    const vw=camera.w, vh=camera.h;
    const left=cfg.deadX, right=vw-cfg.deadX, top=cfg.deadY, bottom=vh-cfg.deadY;
    if(player.x<camera.x+left)camera.x=player.x-left;
    if(player.x>camera.x+right)camera.x=player.x-right;
    if(player.y<camera.y+top)camera.y=player.y-top;
    if(player.y>camera.y+bottom)camera.y=player.y-bottom;
    const bounds=bossLocked&&cameraLock?cameraLock:{x:0,y:0,w:level.width||vw,h:level.height||vh};
    camera.x=clamp(camera.x, bounds.x, Math.max(bounds.x, bounds.x+bounds.w-vw));
    camera.y=clamp(camera.y, bounds.y, Math.max(bounds.y, bounds.y+bounds.h-vh));
    if(api&&api.camera){ api.camera.x=camera.x; api.camera.y=camera.y; api.camera.w=vw; api.camera.h=vh; }
  }

  function update(dt, input={}){
    if(!player)return;
    dt=Math.min(dt||0, .05);
    updatePlatforms(dt);
    if(player.stun>0)player.stun=Math.max(0, player.stun-dt);
    if(player.attackCd>0)player.attackCd=Math.max(0, player.attackCd-dt);
    if(attackBox){ attackBox.t-=dt; if(attackBox.t<=0)attackBox=null; }
    const dir=(inputDown(input,'right','moveRight')?1:0)-(inputDown(input,'left','moveLeft')?1:0);
    const mul=slowMul();
    moveX(dt, dir, mul);
    doJump(input, dt);
    player.vy+=cfg.gravity*dt;
    collideX(dt);
    collideY(dt);
    melee(input);
    damageEnemies();
    updateEnemies(dt);
    updateHazards(dt);
    triggers();
    // Fell into a pit — respawn at last safe ground with a small toll, never strand at the clamp line.
    const floor=(level.height||camera.h);
    if(player.y>floor+40&&lastSafe){
      player.x=lastSafe.x; player.y=lastSafe.y; player.vx=0; player.vy=0;
      player.onGround=false; player.coyote=0; player.stun=0;
      hurt(cfg.fallDamage!=null?cfg.fallDamage:6, {type:'pit'});
    }
    player.x=clamp(player.x, player.w/2, (level.width||camera.w)-player.w/2);
    player.y=clamp(player.y, -200, (level.height||camera.h)+160);
    player.moving=Math.abs(player.vx)>5||Math.abs(player.vy)>5;
    player.animT+=dt;
    updateCamera(dt);
    syncHost();
  }

  function drawRect(c, cam, r, color){
    c.fillStyle=color;
    c.fillRect(Math.round(r.x-cam.x), Math.round(r.y-cam.y), Math.round(r.w), Math.round(r.h));
  }

  function drawPlatformTiled(c, cam, p){
    const drawTile=api&&api.assets&&api.assets.drawTile;
    const ts=16, sx=Math.round(p.x-cam.x), sy=Math.round(p.y-cam.y);
    if(!drawTile||!level.tilesheet){
      c.fillStyle=p.type==='oneWay'?'#9c7b48':(p.vx||p.vy?'#4b7f8f':'#3f3832');
      c.fillRect(sx, sy, Math.round(p.w), Math.round(p.h)); return;
    }
    const ncols=Math.ceil(p.w/ts), nrows=Math.ceil(p.h/ts);
    if(p.type==='oneWay'){
      for(let tx=0;tx<ncols;tx++) drawTile(level.tilesheet, tx===0?0:tx===ncols-1?2:1, 0, sx+tx*ts, sy, ts);
    } else {
      for(let tx=0;tx<ncols;tx++) drawTile(level.tilesheet, tx===0?0:tx===ncols-1?2:1, 0, sx+tx*ts, sy, ts);
      for(let ty=1;ty<nrows;ty++) for(let tx=0;tx<ncols;tx++) drawTile(level.tilesheet, 1, 2, sx+tx*ts, sy+ty*ts, ts);
    }
  }

  function drawPlayer(c, cam){
    const drawSheet=api&&(api.drawSheet||(api.assets&&api.assets.drawSheet));
    const anim=playerAnim();
    if(drawSheet&&drawSheet(anim.key, player.x, player.y+player.h/2+6, anim.frame, anim.scale, {flipX:player.facing<0}))return;
    const frame=attackBox?2:(player.stun>0?3:(player.moving?1:0));
    if(drawSheet&&drawSheet('player', player.x, player.y+player.h/2, frame, 1, {flipX:player.facing<0}))return;
    const x=Math.round(player.x-cam.x), y=Math.round(player.y-cam.y);
    c.fillStyle='rgba(0,0,0,.36)'; c.fillRect(x-12,y+10,24,5);
    c.fillStyle=player.stun>0?'#b9b2c9':'#6e7bcf'; c.fillRect(x-7,y-14,14,25);
    c.fillStyle='#d9c6ad'; c.fillRect(x-6,y-25,12,10);
    c.fillStyle='#f1d184'; c.fillRect(x+(player.facing>0?5:-9),y-8,4,18);
  }

  function playerAnim(){
    if(player.stun>0||player.hurtCd>0)return {key:'free-knight-hit', frame:0, scale:.86};
    if(player.attackCd>.05)return {key:'free-knight-attack', frame:Math.min(3, Math.floor((.28-player.attackCd)*18)), scale:.86};
    if(!player.onGround&&player.vy<0)return {key:'free-knight-jump', frame:Math.min(2, Math.floor(player.animT*8)%3), scale:.86};
    if(!player.onGround)return {key:'free-knight-fall', frame:Math.min(2, Math.floor(player.animT*8)%3), scale:.86};
    if(player.moving)return {key:'free-knight-run', frame:Math.floor(player.animT*12)%10, scale:.86};
    return {key:'free-knight-idle', frame:Math.floor(player.animT*7)%10, scale:.86};
  }

  function drawEnemy(c, cam, e){
    if(e.dead&&e.hitFlash<=0)return;
    const spr=api&&api.assets&&api.assets.drawSheet;
    const eb=enemyBody(e);
    c.fillStyle='rgba(0,0,0,.36)';
    c.fillRect(Math.round(e.x-cam.x-e.w*.65), Math.round(e.y-cam.y-4), Math.round(e.w*1.3), 5);
    const frame=e.hitFlash>0?Math.max(0,e.frameCount-1):Math.floor((e.animT||0)*(e.animRate||8))%Math.max(1,e.frameCount||1);
    if(!(spr&&spr(e.sprite, e.x, e.y+2, frame, e.scale||1, {flipX:e.facing<0}))){
      c.fillStyle=e.hitFlash>0?'#f4eee0':'#9b6f50';
      c.fillRect(Math.round(eb.x-cam.x), Math.round(eb.y-cam.y), eb.w, eb.h);
    }
    if(e.hp<e.maxHp&&!e.dead){
      const w=Math.max(24,e.w+10), x=Math.round(e.x-cam.x-w/2), y=Math.round(eb.y-cam.y-8);
      c.fillStyle='#08090a'; c.fillRect(x,y,w,3);
      c.fillStyle='#c95b52'; c.fillRect(x+1,y+1,(w-2)*Math.max(0,e.hp/e.maxHp),1);
    }
  }

  function render(nextCtx=ctx, nextCamera){
    const c=nextCtx||ctx; if(!c||!player)return;
    if(nextCamera){ nextCamera.x=camera.x; nextCamera.y=camera.y; nextCamera.w=camera.w; nextCamera.h=camera.h; }
    const cam=nextCamera||camera;
    c.save();
    c.imageSmoothingEnabled=false;

    // Sky
    c.fillStyle='#29adff'; c.fillRect(0,0,cam.w,cam.h);

    // Parallax background layers
    const drawBg=api&&api.assets&&api.assets.drawBg;
    const drawTile=api&&api.assets&&api.assets.drawTile;
    const drawSheet=api&&(api.drawSheet||(api.assets&&api.assets.drawSheet));
    if(level.bg&&drawBg){
      const px=level.bgParallax||[0.08,0.2,0.42];
      for(let i=0;i<level.bg.length;i++) drawBg(level.bg[i],cam.x,cam.y,cam.w,cam.h,px[i]||0.2);
    } else {
      c.fillStyle='#18231d';
      for(let x=-((cam.x%32)+32);x<cam.w;x+=32)c.fillRect(x,0,1,cam.h);
      for(let y=-((cam.y%32)+32);y<cam.h;y+=32)c.fillRect(0,y,cam.w,1);
    }

    // Decorative props — drawn behind platforms; world y = bottom-center of sprite
    if(level.props&&drawSheet){
      for(const pr of level.props){
        const sx=Math.round(pr.x-cam.x);
        if(sx>-96&&sx<cam.w+96) drawSheet(pr.key, pr.x, pr.y, 0, pr.scale||1, {});
      }
    }

    // Platforms with tile rendering
    for(const p of platforms) drawPlatformTiled(c, cam, p);

    // Hazards
    for(const h of hazards){
      if(h.type==='projectile'){ drawRect(c, cam, h, 'rgba(215,208,162,.15)'); continue; }
      const color=h.type==='slow'||h.type==='sticky'?'rgba(83,104,75,.72)':h.type==='stun'?'rgba(125,95,180,.68)':h.type==='knockback'?'rgba(192,91,63,.68)':'rgba(148,36,42,.75)';
      drawRect(c, cam, h, color);
    }

    if(level.exit)drawRect(c, cam, level.exit, 'rgba(104,166,118,.55)');
    if(level.bossTrigger&&!bossFired)drawRect(c, cam, level.bossTrigger, 'rgba(201,164,78,.34)');
    for(const e of enemies)drawEnemy(c, cam, e);
    for(const p of projectiles)drawRect(c, cam, p, p.color||'#d7d0a2');
    if(attackBox)drawRect(c, cam, attackBox, 'rgba(241,230,200,.72)');
    drawPlayer(c, cam);
    if(bossLocked&&cameraLock){
      c.strokeStyle='#c9a44e'; c.lineWidth=3;
      c.strokeRect(Math.round(cameraLock.x-cam.x)+1,Math.round(cameraLock.y-cam.y)+1,Math.round(cameraLock.w)-2,Math.round(cameraLock.h)-2);
    }
    c.restore();
  }

  return {
    enter, exit, update, render,
    getState(){ return {player, camera, platforms, hazards, projectiles, enemies, bossFired, bossLocked}; }
  };
}
