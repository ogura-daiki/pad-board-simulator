const dropNames = [
  "fire", "water", "wood", "light", "dark", "heal",
  "poison", "deadlypoison", "trash", "bomb",
];
const dropFilePath = (dropId) => `${rootPath}/src/images/drops/${dropNames[dropId]}.png`;

const loadImage = (filePath) => new Promise((res) => {
  const img = new Image();
  img.addEventListener("load", e=>{
    res(img);
  });
  img.src = filePath;
});
const dropImages = await Promise.allSettled(dropNames.map((v,id) => loadImage(dropFilePath(id)))).then(results=>results.map(r=>r.value));

class Drop {
  constructor(dropId, {lock=false, power=0}={}){
    this.id = dropId;
    this.lock = lock;
    this.power = power;
  }

  draw(ctx, {size, x,y, hold}){
    if(hold){
      ctx.globalAlpha = 0.5;
    }
    ctx.drawImage(dropImages[this.id], x * size, y * size, size, size);
    ctx.globalAlpha = 1;
  }
}

export {Drop, dropImages};