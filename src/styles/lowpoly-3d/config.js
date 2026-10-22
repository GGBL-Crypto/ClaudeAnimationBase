AnimationPlatform.registerStyle({
  id: 'lowpoly-3d', name: '3D low poly', backend: 'Three.js / WebGL2', dimensions: 3, preview: true,
  scripts: [{ src: 'src/styles/lowpoly-3d/components/index.js', type: 'module' }, { src: 'src/styles/lowpoly-3d/engine.js', type: 'module' }],
  assetModule:'src/styles/lowpoly-3d/assets.js',
  config: {
    palette: { sky:'#E7B99B', ground:'#B85D3F', sand:'#D77E55', ridge:'#9C4C39', rock:'#693D38', body:'#F2E5CC', joint:'#4A4147', visor:'#233841', glow:'#6FF4DB', accent:'#D77E40' },
    texture: { bitmaps:false, seed:37, meshBudget:64, triangleBudget:10000 },
    outline: { enabled:false },
    character: { unit:1, width:.66, height:1.55, stepCycle:1.3, stepHeight:.18 },
    effects: { shadows:true, shadowSize:512, emission:1.3 },
    camera: { type:'perspective', fov:40, near:.1, far:80, orthoHeight:4.2, position:{x:3.4,y:2.5,z:5.6}, endPosition:{x:2.8,y:2.15,z:4.8}, target:{x:-.1,y:.72,z:0} },
    lighting: { ambient:1.7, key:2.8, position:{x:-3,y:7,z:5}, stone:1.6 },
    materials: { flat:true }, preview: { scale:.5 }, assets:{enabled:false,toneMapping:'none',exposure:1}
  },
  validate(c) {
    const fail=message=>{throw new Error('Low poly: '+message);};
    const numbers=value=>{for(const v of Object.values(value)){if(v&&typeof v==='object')numbers(v);else if(typeof v==='number'&&!Number.isFinite(v))fail('número não finito');}};numbers(c);
    if(Object.values(c.palette).some(color=>!/^#[\da-f]{6}$/i.test(color)))fail('cor inválida');
    if(!['perspective','orthographic'].includes(c.camera.type))fail('projeção inválida');
    if(c.camera.fov<10||c.camera.fov>100||c.camera.near<=0||c.camera.far<=c.camera.near||c.camera.orthoHeight<=0)fail('câmera inválida');
    for(const p of [c.camera.position,c.camera.endPosition])if(Math.hypot(p.x-c.camera.target.x,p.y-c.camera.target.y,p.z-c.camera.target.z)<.01)fail('câmera coincide com alvo');
    if(c.texture.bitmaps&&!c.assets.enabled||c.outline.enabled)fail('bitmaps exigem perfil de assets; contornos não suportados');
    if(!['none','aces'].includes(c.assets.toneMapping)||c.assets.exposure<=0||c.assets.exposure>2||!c.assets.enabled&&c.assets.toneMapping!=='none')fail('perfil de assets inválido');
    if(!Number.isInteger(c.texture.seed)||!Number.isInteger(c.texture.meshBudget)||c.texture.meshBudget<1||c.texture.meshBudget>64||!Number.isInteger(c.texture.triangleBudget)||c.texture.triangleBudget<1||c.texture.triangleBudget>(c.assets.enabled?30000:10000))fail('orçamento inválido');
    if(![512,1024].includes(c.effects.shadowSize)||c.effects.emission<0||c.effects.emission>4)fail('efeitos inválidos');
    if(c.character.unit<=0||c.character.width<=0||c.character.height<=0||c.character.stepCycle<=0||c.character.stepHeight<0||c.character.stepHeight>.3)fail('personagem inválido');
    if(c.preview.scale!==.5||Object.values(c.lighting).some(v=>typeof v==='number'&&(v<0||v>5)))fail('luz/prévia inválida');
  }
});
