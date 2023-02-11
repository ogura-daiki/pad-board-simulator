const dropFilePathFromName = (name) => `${rootPath}/src/images/drops/${name}.png`;
const dropFilePathFromId = (dropId) => dropFilePathFromName(dropNames[dropId]);
const dropNames = [
  "fire", "water", "wood", "light", "dark", "heal",
  "poison", "deadlypoison", "trash", "bomb",
];
const dropEffects = ["plus", "minus", "lock"];


const loadImage = (filePath) => new Promise((res) => {
  const img = new Image();
  img.addEventListener("load", e=>{
    res(img);
  });
  img.src = filePath;
});
const loadImages = filePathList => Promise.allSettled(filePathList.map(path => loadImage(path))).then(results=>results.map(r=>r.value));
const dropImages = await loadImages(dropNames.map((v, id)=>dropFilePathFromId(id)));
const dropEffectImages = await loadImages(dropEffects.map(p=>dropFilePathFromName(p)))

class Drop {
  constructor(dropId, {lock=false, power=0}={}){
    this.id = dropId;
    this.lock = Math.random()>0.5;
    this.power = Math.floor(Math.random()*3)-1;
  }

  draw(ctx, {size, x,y, hold}){

    const drawImage = (image, scale = 1) => {
      const scaled = size*scale;
      const offset = (scaled-size)/2;
      const left = x * size - offset;
      const top = y * size - offset;
      ctx.drawImage(image, left, top, scaled, scaled);
    }

    let alpha = 1;
    const changeAlpha = (fn) => {
      alpha = fn(alpha);
      ctx.globalAlpha = alpha;
    }
    const decorateAlpha = (factor, drawDrop) =>()=>{
      changeAlpha(a=>a*factor);
      drawDrop();
      changeAlpha(a=>a/factor);
    }

    const decoratePower = (drawDrop) => ()=>{
      //強化ドロップ
      if(this.power === 1){
        ctx.filter = `brightness(120%)`;
      }
      //弱化ドロップ
      if(this.power === -1){
        ctx.filter = `brightness(70%)`;
      }
      drawDrop();
      ctx.filter = "brightness(100%)";
      
      //強化ドロップ
      if(this.power === 1){
        drawImage(dropEffectImages[0]);
      }
      //弱化ドロップ
      if(this.power === -1){
        drawImage(dropEffectImages[1]);
      }
    }

    const decorateLock = (drawDrop) => ()=>{
      drawDrop();
      if(this.lock){
        drawImage(dropEffectImages[2]);
      }
    }

    const drawDropImage = ()=>{
      drawImage(dropImages[this.id]);
    }

    let drawDrop = drawDropImage;
    //ドロップの強化を反映
    drawDrop = decoratePower(drawDrop);
    //ドロップをロック
    drawDrop = decorateLock(drawDrop);
    //持っているドロップなら半透明にする
    drawDrop = decorateAlpha(hold?0.5:1, drawDrop);
    
    drawDrop();

    
  }

  createGhost(ghost){
    ghost.querySelector(".layer._1").src = dropImages[this.id].src;
    const layer2 = ghost.querySelector(".layer._2");
    let bg = [];
    if(this.power !== 0){
      bg.push(`url(${dropEffectImages[(this.power-1)/-2].src})`);
    }
    if(this.lock){
      bg.push(`url(${dropEffectImages[2].src})`);
    }
    layer2.style.backgroundImage = bg.join(",");
  }
}

export {Drop, dropImages, dropEffectImages as powerImages};