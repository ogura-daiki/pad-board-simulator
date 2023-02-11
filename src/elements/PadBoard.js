import { Drop, dropImages } from "../libs/Drops.js";
import ReactiveStates from "../libs/ReactiveStates.js";

const clamp = (min, x, max) => Math.max(min, Math.min(x, max));

const newBoard = (long) => [...Array(long-1)].map(() => [...Array(long)].map(() => new Drop(Math.floor(Math.random() * 6))));

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
    #ghost .layer{
      display:block;
      width:100%;
      height:100%;
      position:absolute;
      left:0px;
      top:0px;
      background-size: contain;
    }
    `;
  }

  #canvas;
  #ghostCanvas;
  #ghost;
  #states;
  #tileSize = 128;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>${this.constructor.style}</style>
      <canvas id="canvas"></canvas>
      <div id="ghost" draggable=false>
        <img class="layer _1">
        <div class="layer _2"></div>
      </div>
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
        value: newBoard(6),
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
    this.#ghostCanvas = this.shadowRoot.querySelector("#ghostCanvas");

    this.size = 6;

    const beginPuzzle = e => {
      this.#states.updateStates({
        pointerDown:true,
        pointerPos:this.#getPointerTile(e),
      });
      this.#drawGhost();
      this.#moveGhost();
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
      this.#moveGhost();
    }
    window.addEventListener("touchend", finishPuzzle);
    window.addEventListener("mouseup", finishPuzzle);

    window.addEventListener("pointermove", e=>{
      if(this.#states.pointerDown){
        this.#states.pointerPos = this.#getPointerTile(e);
      }
      this.#moveGhost();
    });
  }

  #raw={empty:true};

  #getPointerTile(e){
    if(e instanceof TouchEvent){
      e = e.touches[0];
    }
    const rect = this.#canvas.getBoundingClientRect();
    this.#raw = {
      x: e.pageX-rect.left,
      y: e.pageY-rect.top,
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
    const board = newBoard(size);
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
      const hold = pos.x === left && pos.y === top;
      this.#states.board[top][left].draw(ctx, {size:this.#tileSize, x:left, y:top, hold});
    });
  }

  #drawGhost(){
    //少し大きく表示
    const displayTileSize = this.#canvas.offsetWidth / this.size * 1.2;
    const sizes = {
      width : `${displayTileSize}px`,
      height : `${displayTileSize}px`,
    };
    const pos = this.#states.pointerPos;
    if(!pos.empty){
      Object.assign(this.#ghost.style, sizes);
      const drop = this.#states.board[pos.y][pos.x];
      drop.createGhost(this.#ghost);
    }
  }

  #moveGhost(){
    //少し大きく表示
    const displayTileSize = this.#canvas.offsetWidth / this.size * 1.2;
    const offset = displayTileSize/2;
    this.#ghost.style.transform = `translate(${this.#raw.x - offset}px,${this.#raw.y - offset*1.5}px)`;
    this.#ghost.style.display = this.#states.pointerDown ? "block":"none";
  }

  render() {
    const ctx = this.#canvas.getContext("2d");
    this.#drawBG(ctx);
    this.#drawDrop(ctx);
  }
}
customElements.define("pad-board", PADBoard);