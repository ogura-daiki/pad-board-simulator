import ReactiveStates from "../libs/ReactiveStates.js";

const dropNames = [
  "fire", "water", "wood", "light", "dark", "heal",
  "poison", "deadlypoison", "trash", "bomb",
];
const dropFilePath = (dropName) => `./src/images/drops/${dropName}.png`;

const loadImage = (filePath) => new Promise((res) => {
  const img = new Image();
  img.addEventListener("load", e=>{
    res(img);
  });
  img.src = filePath;
});
const dropImages = await Promise.allSettled(dropNames.map(dropName => loadImage(dropFilePath(dropName)))).then(results=>results.map(r=>r.value));

const clamp = (min, x, max) => Math.max(min, Math.min(x, max));

class PADBoard extends HTMLElement {

  static get style() {
    return `
    :host{
      display:block;
      width:100%;
      height:100%;
      position:relative;
    }
    #canvas{
      display:block;
      width:100%;
      height:100%;
      user-select:none;
    }
    #ghost{
      user-select:none;
      pointer-events:none;
      display:none;
      position:absolute;
      left:0px;
      top:0px;
      opacity:0.6;
    }
    `;
  }

  #canvas;
  #ghost;
  #states;
  #tileSize = 128;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>${this.constructor.style}</style>
      <canvas id="canvas"></canvas>
      <img id="ghost" draggable=false>
    `;

    const move = (board, from, to) => {
      
      const pos = {...from};
      const before = {...pos};

      const change = (p1, p2) => {
        const drop = board[p1.y][p1.x];
        board[p1.y][p1.x] = board[p2.y][p2.x];
        board[p2.y][p2.x] = drop;
      }

      while(true){
        let hasDiff = false;
        if(pos.x !== to.x){
          pos.x += pos.x > to.x?-1:1;
          hasDiff = true;
        }
        if(pos.y !== to.y){
          pos.y += pos.y > to.y?-1:1;
          hasDiff = true;
        }
        if(!hasDiff){
          break;
        }
        change(before, pos);
        Object.assign(before, pos);
      }
    }

    this.#states = ReactiveStates({
      size: {
        value: 6,
      },
      board: {
        value: [...Array(5)].map(() => [...Array(6)].map(() => Math.floor(Math.random() * 6))),
      },
      pointerDown: {
        value:false,
      },
      pointerPos: {
        value:{empty:true},
        hasChanged:(nv, ov) => {
          const hasChange = ["x", "y"].some(key => nv[key] !== ov[key]);
          if(!ov.empty && !nv.empty && hasChange){
            move(this.#states.board, ov, nv);
          }
          return hasChange;
        },
      }
    });
    this.#states.setCallback(() => this.render());

    this.#canvas = this.shadowRoot.querySelector("#canvas");
    this.#ghost = this.shadowRoot.querySelector("#ghost");

    this.size = 6;

    const beginPuzzle = e => {
      this.#states.updateStates({
        pointerDown:true,
        pointerPos:this.#getPointerTile(e),
      });
      this.#updateGhost();
    }
    this.#canvas.addEventListener("mousedown", beginPuzzle);
    this.#canvas.addEventListener("touchstart", beginPuzzle);
    this.#canvas.addEventListener("touchmove", e=>{
      e.preventDefault();
    });

    const finishPuzzle = () => {
      this.#states.updateStates({
        pointerDown:false,
        pointerPos:{empty:true},
      });
      this.#updateGhost();
    }
    window.addEventListener("touchend", finishPuzzle);
    window.addEventListener("mouseup", finishPuzzle);

    window.addEventListener("pointermove", e=>{
      if(this.#states.pointerDown){
        this.#states.pointerPos = this.#getPointerTile(e);
      }
      this.#updateGhost();
    });
  }

  #raw={empty:true};

  #getPointerTile(e){
    if(e instanceof TouchEvent){
      e = e.touches[0];
    }
    const rect = this.#canvas.getBoundingClientRect();
    this.#raw = {
      x: clamp(0, e.pageX-rect.left, this.#canvas.offsetWidth),
      y: clamp(0, e.pageY-rect.top, this.#canvas.offsetHeight),
    };
    const x = clamp(0, Math.floor(this.#raw.x / this.#canvas.offsetWidth * this.size), this.size-1);
    const y = clamp(0, Math.floor(this.#raw.y / this.#canvas.offsetHeight * (this.size-1)), this.size-2);
    return {x,y};
  }

  #start;
  set start(board) {
    this.#start = board;
  }

  set size(size) {
    this.#canvas.width = size * this.#tileSize;
    this.#canvas.height = (size - 1) * this.#tileSize;
    const board = [...Array(size - 1)].map(() => [...Array(size)].map(() => Math.floor(Math.random() * 6)));
    this.#states.updateStates({
      size,
      board
    });
  }

  get size(){
    return this.#states.size;
  }

  #loopTile(callback) {
    const size = this.#states.size;
    for (let top = 0; top < size - 1; top += 1) {
      for (let left = 0; left < size; left += 1) {
        callback({ top, left });
      }
    }
  }

  #bgColor = ['rgb(40, 20, 0)', 'rgb(60, 40, 0)'];
  #drawBG(ctx) {
    const size = this.#states.size;
    ctx.fillStyle = this.#bgColor[0];
    ctx.fillRect(0, 0, size * this.#tileSize, size * this.#tileSize);

    ctx.fillStyle = this.#bgColor[1];
    this.#loopTile(({top, left})=>{
      if ((left + top) % 2) {
        ctx.fillRect(left * this.#tileSize, top * this.#tileSize, this.#tileSize, this.#tileSize);
      }
    })
  }

  #drawDrop(ctx) {
    const pos = this.#states.pointerPos;
    this.#loopTile(({top, left})=>{
      const drop = this.#states.board[top][left];
      if(pos.y === top && pos.x === left){
        ctx.globalAlpha = 0.5;
      }
      ctx.drawImage(dropImages[drop], left * this.#tileSize, top * this.#tileSize, this.#tileSize, this.#tileSize);
      ctx.globalAlpha = 1;
    });
  }

  #updateGhost(){
    //少し大きく表示
    const displayTileSize = this.#canvas.offsetWidth / this.size * 1.2;
    const offset = displayTileSize/2;
    this.#ghost.style.width = `${displayTileSize}px`;
    this.#ghost.style.height = `${displayTileSize}px`;
    this.#ghost.style.display = this.#states.pointerDown ? "block":"none";
    if(!this.#states.pointerPos.empty){
      const pos = this.#states.pointerPos;
      const drop = this.#states.board[pos.y][pos.x];
      this.#ghost.src = dropImages[drop].src;
    }
    this.#ghost.style.transform = `translate(${this.#raw.x - offset}px,${this.#raw.y - offset}px)`;
  }

  render() {
    const ctx = this.#canvas.getContext("2d");
    this.#drawBG(ctx);
    this.#drawDrop(ctx);
  }
}
customElements.define("pad-board", PADBoard);