const dropFilePathFromName = (name) => `${rootPath}/src/images/drops/${name}.png`;
const dropFilePathFromId = (dropId) => dropFilePathFromName(dropNames[dropId]);
const dropNames = [
  "fire", "water", "wood", "light", "dark", "heal",
  "poison", "deadlypoison", "trash", "bomb",
];
const dropEffects = ["plus", "minus", "lock"];


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

const cacheDropImage = new Map();
const getCachedDropImage = (id, power, lock, draw) => {
  const hash = `${id}:${power}:${lock}`;
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

const getPowerEffectIndex = power => (power - 1) / -2;
const getBrightness = power => `brightness(${[120, 70][getPowerEffectIndex(power)]}%)`;

const powerDecorator = (ctx, options, power, draw) => () => {
  ctx.filter = getBrightness(power);
  draw();
  ctx.filter = "brightness(100%)";

  const index = getPowerEffectIndex(power);
  drawImage(ctx, options, dropEffectImages[index]);
}

class Drop {
  constructor(dropId, { lock = false, power = 0 } = {}) {
    this.id = dropId;
    this.lock = Math.random() > 0.5;
    this.power = Math.floor(Math.random() * 3) - 1;
  }

  draw(ctx, options = {}) {

    const { size, x, y, hold } = options;


    const dropImage = getCachedDropImage(this.id, this.power, this.lock, ctx=>{
      const opt = {...options, x:0, y:0, size:128};
      const drawDropImage = () => {
        drawImage(ctx, opt, dropImages[this.id]);
      }

      let drawDrop = drawDropImage;
      //ドロップの強化を反映
      if (this.power !== 0) {
        drawDrop = powerDecorator(ctx, opt, this.power, drawDrop);
      }
      //ドロップをロック
      if (this.lock) {
        drawDrop = lockDecorator(ctx, opt, drawDrop);
      }
      //持っているドロップなら半透明にする
      if (hold) {
        drawDrop = alphaDecorator(ctx, 0.5, drawDrop);
      }

      drawDrop();
    });

    drawImage(ctx, options, dropImage);
  }

  createGhost(ghost) {
    const layer1 = ghost.querySelector(".layer._1");
    layer1.src = dropImages[this.id].src;

    const layer2 = ghost.querySelector(".layer._2");
    let bg = [];
    if (this.power !== 0) {
      bg.push(`url(${dropEffectImages[getPowerEffectIndex(this.power)].src})`);
      layer1.style.filter = getBrightness(this.power);
    }
    else {
      layer1.style.filter = "";
    }
    if (this.lock) {
      bg.push(`url(${dropEffectImages[2].src})`);
    }
    layer2.style.backgroundImage = bg.join(",");
  }
}

export { Drop, dropImages, dropEffectImages as powerImages };