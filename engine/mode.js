export function createModeManager(initialMode=null, initialCtx=null, initialApi=null){
  let active=null, ctx=initialCtx, api=initialApi;

  function call(fn, args=[]){
    if(active&&typeof active[fn]==='function')return active[fn](...args);
    return undefined;
  }

  const manager={
    setContext(nextCtx){ ctx=nextCtx; return manager; },
    setApi(nextApi){ api=nextApi; return manager; },
    setMode(nextMode, nextCtx=ctx, nextApi=api){
      if(active&&typeof active.exit==='function')active.exit();
      active=nextMode||null; ctx=nextCtx; api=nextApi;
      if(active&&typeof active.enter==='function')active.enter(ctx, api);
      return active;
    },
    getMode(){ return active; },
    update(dt, input){ return call('update', [dt, input||{}]); },
    render(renderCtx=ctx, camera){ return call('render', [renderCtx, camera]); }
  };

  if(initialMode)manager.setMode(initialMode, ctx, api);
  return manager;
}
