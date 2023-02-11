const dropFilePathFromName = (name) => `${rootPath}/src/images/drops/${name}.png`;
const dropFilePathFromId = (dropId) => dropFilePathFromName(dropNames[dropId]);
const dropNames = [
  "fire", "water", "wood", "light", "dark", "heal",
  "poison", "deadlypoison", "trash", "bomb",
];
const normalDrops = dropNames.slice(0,6).map((name,id)=>({id,image:dropFilePathFromName(name)}));
const dropEffects = ["plus", "minus", "lock", "disable", "combo", "nail"];


const loadImage = (filePath) => new Promise((res) => {
  const img = new Image();
  img.addEventListener("load", e => {
    res(img);
  });
  img.src = filePath;
});
const loadImages = filePathList => Promise.allSettled(filePathList.map(path => loadImage(path))).then(results => results.map(r => r.value));
const dropImages = await loadImages(dropNames.map((v, id) => dropFilePathFromId(id)));
const dropEffectImages = await loadImages(dropEffects.map(p => dropFilePathFromName(p)));

const dropModifier = (imagePath, modifier) => ({image:imagePath, modifier});
const modifierList = [
  ...dropNames.map((name, id)=>dropModifier(dropFilePathFromName(name), ({drop})=>drop.id = id)),
  ...["plus", "minus"].map((name, index)=>dropModifier(dropFilePathFromName(name), ({drop})=>{
    const power = index*-2+1;
    if(drop.power !== power){
      drop.power = power;
    }
    else{
      drop.power = 0;
    }
  })),
  ...["lock", "combo", "nail"].map((name)=>dropModifier(dropFilePathFromName(name), ({drop})=>drop[name] = !drop[name])),
];

const cacheDropImage = new Map();
const getCachedDropImage = (vals, draw) => {
  const hash = vals.join(":");
  if(cacheDropImage.has(hash)){
    return cacheDropImage.get(hash);
  }
  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = 128;
  offscreenCanvas.height = 128;
  const ctx = offscreenCanvas.getContext("2d");

  draw(ctx);

  cacheDropImage.set(hash, offscreenCanvas);
  return offscreenCanvas;
}


const drawImage = (ctx, options, image, scale = 1) => {
  const { size, x, y } = options;
  let scaled = size * scale;
  let offset = (scaled - size) / 2;
  let left = x * size - offset;
  let top = y * size - offset;
  [scaled, offset, left, top] = [scaled, offset, left, top].map(v=>Math.floor(v));
  ctx.drawImage(image, left, top, scaled, scaled);
}
const alphaDecorator = (ctx, factor, draw) => () => {
  const startAlpha = ctx.globalAlpha;
  ctx.globalAlpha = startAlpha * factor;
  draw();
  ctx.globalAlpha = startAlpha;
}

const lockDecorator = (ctx, options, draw) => () => {
  draw();
  drawImage(ctx, options, dropEffectImages[2]);
}
const disableDecorator = (ctx, options, draw) => () => {
  draw();
  drawImage(ctx, options, dropEffectImages[3]);
}
const comboDecorator = (ctx, options, draw) => () => {
  draw();
  drawImage(ctx, options, dropEffectImages[4]);
}
const nailDecorator = (ctx, options, draw) => () => {
  draw();
  drawImage(ctx, options, dropEffectImages[5]);
}

const getPowerEffectIndex = power => (power - 1) / -2;
const getBrightness = power => `brightness(${[120, 70][getPowerEffectIndex(power)]}%)`;

const powerDecorator = (ctx, options, power, draw) => () => {
  draw();
  drawImage(ctx, options, dropEffectImages[getPowerEffectIndex(power)]);
}

const brightnessDecorator = (ctx, brightness, draw) => ()=>{
  ctx.filter = `brightness(${brightness}%)`;
  draw();
  ctx.filter = `brightness(100%)`;
}

class Drop {
  #id;
  #power;
  #combo;
  #nail;
  constructor(dropId, { lock = false, power = 0, combo = false, nail = false } = {}) {
    this.#id = dropId;
    this.lock = lock;
    this.#power = power;
    this.#combo = combo;
    this.#nail = nail;
  }

  draw(ctx, options = {}) {

    const { size, x, y, hold, disables } = options;

    const disabled = disables.has(this.#id);
    const vals = [this.#id, this.#power, this.lock, this.#combo, this.#nail, disabled];
    const dropImage = getCachedDropImage(vals, ctx=>{
      const opt = {...options, x:0, y:0, size:128};
      const drawDropImage = () => {
        drawImage(ctx, opt, dropImages[this.#id]);
      }

      let drawDrop = drawDropImage;
      let brightness = 100;

      //強化、弱化によって明暗を変更
      if(this.#power !== 0){
        brightness *= [1.2, 0.7][getPowerEffectIndex(this.#power)];
      }
      //消せない場合は暗く
      if(disabled){
        brightness *= 0.7;
      }
      //ドロップを表示する明るさを反映
      drawDrop = brightnessDecorator(ctx, brightness, drawDrop);
      
      //ドロップの強化・弱化を反映
      if (this.#power !== 0) {
        drawDrop = powerDecorator(ctx, opt, this.#power, drawDrop);
      }
      //ドロップをロック
      if (this.lock) {
        drawDrop = lockDecorator(ctx, opt, drawDrop);
      }
      //コンボドロップ
      if (this.#combo) {
        drawDrop = comboDecorator(ctx, opt, drawDrop);
      }
      //釘ドロップ
      if (this.#nail) {
        drawDrop = nailDecorator(ctx, opt, drawDrop);
      }
      //消せないドロップのバツマーク
      if(disabled){
        drawDrop = disableDecorator(ctx, opt, drawDrop);
      }

      drawDrop();
    });

    let drawDrop = ()=> drawImage(ctx, options, dropImage);
    //持っているドロップなら半透明にする
    if (hold) {
      drawDrop = alphaDecorator(ctx, 0.5, drawDrop);
    }
    
    drawDrop();
  }

  set id(value){
    this.#id = value;
    this.power = this.power;
    this.combo = this.combo;
    this.nail = this.nail;
  }
  get id(){
    return this.#id;
  }

  set power(value){
    if(!normalDrops.some(({id})=>id===this.#id)){
      this.#power = 0;
      return;
    }
    this.#power = value;
  }
  get power(){
    return this.#power;
  }

  set nail(value){
    if(!normalDrops.some(({id})=>id===this.#id)){
      this.#nail = false;
      return;
    }
    this.#nail = value;
  }
  get nail(){
    return this.#nail;
  }

  set combo(value){
    if(!normalDrops.some(({id})=>id===this.#id)){
      this.#combo = false;
      return;
    }
    this.#combo = value;
  }
  get combo(){
    return this.#combo;
  }

  createGhost(ghost) {
    const image = getCachedDropImage([this.#id, this.#power, this.lock, this.#combo, this.#nail, false]);
    ghost.src = image.toDataURL();
  }
}

export { Drop, dropImages, dropEffectImages, modifierList, normalDrops };