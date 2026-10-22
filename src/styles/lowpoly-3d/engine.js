import * as THREE from 'three';

// A style backend, independent of the film. Scenes own their objects and absolute poses.
export function createLowpolyEngine(canvas, config) {
  const params=new URLSearchParams(location.search);
  const settings=Object.freeze({resolution:params.get('resolution')||'1080p',projection:params.get('projection')||config.camera.type,shadows:params.get('shadows')||(config.effects.shadows?'on':'off')});
  if(!['720p','1080p'].includes(settings.resolution)||!['perspective','orthographic'].includes(settings.projection)||!['on','off'].includes(settings.shadows))throw new Error('Opções 3D inválidas');
  const [width,height]=settings.resolution==='720p'?[1280,720]:[1920,1080];
  const scene=new THREE.Scene(), resources=new Set(), internal=document.createElement('canvas');
  let renderer,camera,device=null,disposed=false,failure=null,profile='final';
  const released={geometries:0,materials:0,textures:0,shadows:0,renderer:0}, output=canvas.getContext('2d');
  const track=resource=>{resources.add(resource);return resource;};
  const assertLive=()=>{if(disposed)throw new Error('Motor 3D descartado');if(failure)throw new Error(failure);};
  const contextLost=event=>{if(!disposed){event.preventDefault();failure='Contexto WebGL2 perdido. Recarregue o projeto.';window.dispatchEvent(new CustomEvent('animationerror',{detail:failure}));}};
  internal.addEventListener('webglcontextlost',contextLost);
  const art={THREE,scene,config,
    own:track,
    environment(room){
      if(!config.assets.enabled)throw Error('Ambiente importado exige perfil de assets');
      const generator=new THREE.PMREMGenerator(renderer);let target;
      try{target=generator.fromScene(room,.04,.1,30,{size:128});track(target);scene.environment=target.texture;return target.texture;}
      finally{generator.dispose();room.dispose();}
    },
    group(parent=scene){const group=new THREE.Group();parent.add(group);return group;},
    material(color,options={}){return track(new THREE.MeshLambertMaterial({color,flatShading:config.materials.flat,...options}));},
    geometry(value){return track(value);},
    mesh(geometry,material,parent=scene){track(geometry);for(const m of Array.isArray(material)?material:[material])track(m);const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;},
    cameraPose(position,target){
      if([...position,...target].some(n=>!Number.isFinite(n))||position.length!==3||target.length!==3)throw new Error('Pose de câmera inválida');
      camera.position.fromArray(position);camera.lookAt(new THREE.Vector3(...target));camera.updateMatrixWorld(true);
    }
  };
  const engine={canvas,scene,art,settings,
    async init(){
      try {
        assertLive();
        canvas.width=width;canvas.height=height;
        const attributes={alpha:false,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'};
        const gl=internal.getContext('webgl2',attributes);
        if(!gl)throw new Error('WebGL2 indisponível; este motor exige WebGL2. Use um navegador compatível ou --soft-gl.');
        renderer=new THREE.WebGLRenderer({canvas:internal,context:gl,...attributes});
        renderer.setPixelRatio(1);renderer.setSize(width,height,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
        if(config.assets.enabled){renderer.toneMapping=config.assets.toneMapping==='aces'?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;renderer.toneMappingExposure=config.assets.exposure;}
        renderer.debug.onShaderError=(gl,program)=>{failure='Falha de shader WebGL2: '+gl.getProgramInfoLog(program);throw new Error(failure);};
        const ext=gl.getExtension('WEBGL_debug_renderer_info');device=gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER);
        scene.background=new THREE.Color(config.palette.sky);
        const c=config.camera,aspect=width/height,h=c.orthoHeight;
        camera=settings.projection==='perspective'?new THREE.PerspectiveCamera(c.fov,aspect,c.near,c.far):new THREE.OrthographicCamera(-h*aspect/2,h*aspect/2,h/2,-h/2,c.near,c.far);
        art.cameraPose([c.position.x,c.position.y,c.position.z],[c.target.x,c.target.y,c.target.z]);
        scene.add(new THREE.HemisphereLight(config.palette.sky,config.palette.ridge,config.lighting.ambient));
        const key=new THREE.DirectionalLight('#FFF3DB',config.lighting.key);key.position.set(config.lighting.position.x,config.lighting.position.y,config.lighting.position.z);
        key.castShadow=settings.shadows==='on';key.shadow.mapSize.set(config.effects.shadowSize,config.effects.shadowSize);
        Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.5,far:20});key.shadow.bias=-.0001;key.shadow.normalBias=.035;scene.add(key);
        renderer.shadowMap.enabled=settings.shadows==='on';renderer.shadowMap.type=THREE.PCFShadowMap;
        window.Lowpoly=art;
        if(typeof window.buildLowpolyScene!=='function')throw new Error('Projeto sem construtor de cena 3D');
        buildLowpolyScene(art);drawWorld(0);scene.updateMatrixWorld(true);
        let meshes=0,triangles=0;
        scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
        if(meshes>config.texture.meshBudget||triangles>config.texture.triangleBudget)throw new Error(`Orçamento 3D excedido: ${meshes} meshes, ${triangles} triângulos`);
        await renderer.compileAsync(scene,camera);assertLive();await engine.render(0);
      }catch(error){engine.dispose();throw error;}
    },
    async render(t,{preview=false}={}){
      assertLive();const nextProfile=preview?'light':'final';
      // Refresh cached material variants when preview switches shadow features.
      // Without this, the first final skinned frame can retain a preview program state.
      if(profile!==nextProfile)scene.traverse(o=>{for(const material of Array.isArray(o.material)?o.material:o.material?[o.material]:[])material.needsUpdate=true;});
      profile=nextProfile;
      const scale=preview?config.preview.scale:1,w=Math.round(width*scale),h=Math.round(height*scale);
      if(internal.width!==w||internal.height!==h)renderer.setSize(w,h,false);
      renderer.shadowMap.enabled=settings.shadows==='on'&&!preview;renderer.shadowMap.needsUpdate=true;
      drawWorld(t);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
      renderer.clear(true,true,true);renderer.render(scene,camera);assertLive();
      output.clearRect(0,0,width,height);output.imageSmoothingEnabled=true;output.drawImage(internal,0,0,width,height);
    },
    worldToScreen(x,y,z=0){
      assertLive();if(![x,y,z].every(Number.isFinite))throw new Error('Ponto 3D inválido');
      camera.updateMatrixWorld(true);const view=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);
      const ndc=new THREE.Vector3(x,y,z).project(camera);
      if(view.z>=0||ndc.z < -1||ndc.z>1)throw new Error('Ponto fora da profundidade da câmera');
      return [(ndc.x+1)*width/2,(1-ndc.y)*height/2];
    },
    info(){return {backend:'Three.js / WebGL2',revision:THREE.REVISION,device,settings,profile,width,height,internalWidth:internal.width,internalHeight:internal.height,drawCalls:renderer?.info.render.calls||0,triangles:renderer?.info.render.triangles||0,...(config.assets.enabled?{assetProfile:{...config.assets},memory:renderer?{...renderer.info.memory}:null}:{}),disposed,released:{...released}};},
    dispose(){
      if(disposed)return;disposed=true;
      scene.traverse(o=>{
        if(o.geometry)resources.add(o.geometry);
        for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])resources.add(m);
        if(o.shadow){o.shadow.dispose();released.shadows++;}
      });
      for(const resource of [...resources])if(resource.isMaterial){
        for(const value of Object.values(resource))if(value?.isTexture)resources.add(value);
        for(const uniform of Object.values(resource.uniforms||{}))for(const value of Array.isArray(uniform?.value)?uniform.value:[uniform?.value])if(value?.isTexture)resources.add(value);
      }
      for(const value of [scene.background,scene.environment])if(value?.isTexture)resources.add(value);
      const bitmaps=new Set();
      for(const resource of resources){
        if(resource.isTexture){released.textures++;for(const image of Array.isArray(resource.image)?resource.image:[resource.image])if(typeof ImageBitmap!=='undefined'&&image instanceof ImageBitmap)bitmaps.add(image);}
        if(resource.isBufferGeometry)released.geometries++;
        if(resource.isMaterial)released.materials++;
        resource.dispose?.();
      }
      for(const bitmap of bitmaps)bitmap.close();resources.clear();scene.clear();
      internal.removeEventListener('webglcontextlost',contextLost);
      if(renderer){renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();released.renderer++;}
      internal.remove();if(window.Lowpoly===art)window.Lowpoly=null;window.disposeLowpolyScene?.();
    }
  };
  return engine;
}
window.animationEngine=createLowpolyEngine(document.getElementById('out'),STYLE);
