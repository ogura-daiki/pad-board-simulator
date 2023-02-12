import { Drop, dropImages } from "../libs/Drops.js";
import ReactiveStates from "../libs/ReactiveStates.js";

const clamp = (min, x, max) => min > x?min:(x < max?x:max);

const newBoard = (long) => [...Array(long-1)].map(() => [...Array(long)].map(() => new Drop(Math.floor(Math.random() * 6))));

const bgColor = ['rgb(40, 20, 0)', 'rgb(60, 40, 0)'];

const Position = obj=>{
  if(!obj) return {empty:true};
  const {x,y} = obj;
  return {x,y};
};
const EmptyPosition = ()=>Position();

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
  
  #pointerId = null;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>${this.constructor.style}</style>
      <canvas id="canvas"></canvas>
      <img id="ghost" draggable=false>
    `;

    const move = (board, from, to) => {

      if(from.empty){
        return;
      }
      
      const pos = {...from};
      const before = {...pos};

      const change = (p1, p2) => {
        const drop = board[p1.y][p1.x];
        board[p1.y][p1.x] = board[p2.y][p2.x];
        board[p2.y][p2.x] = drop;
      }

      const factorX = pos.x > to.x?-1:1;
      const factorY = pos.y > to.y?-1:1;

      while(true){
        let hasDiff = false;
        if(pos.x !== to.x){
          pos.x += factorX
          hasDiff = true;
        }
        if(pos.y !== to.y){
          pos.y += factorY;
          hasDiff = true;
        }
        if(!hasDiff){
          break;
        }
        if(this.#mode === "puzzle"){
          change(before, pos);
        }
        else{
          this.dispatchEvent(new CustomEvent(
            "dropPushed",
            {
              detail:{target:this, pointerPos:pos},
              composed:true, bubbles:true
            }
          ));
        }
        before.x = pos.x;
        before.y = pos.y;
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
        value:EmptyPosition(),
        hasChanged:(nv, ov) => {
          const hasChange = ["x", "y"].some(key => nv[key] !== ov[key]);
          if(!nv.empty && hasChange){
            if(ov.empty && this.#mode === "palette"){
              this.dispatchEvent(new CustomEvent(
                "dropPushed",
                {
                  detail:{target:this, pointerPos:nv},
                  composed:true, bubbles:true
                }
              ));
            }
            move(this.#states.board, ov, nv);
          }
          return hasChange;
        },
      },
      disables:{
        value:new Set(),
      }
    });
    this.#states.setCallback(() => this.render());

    this.#canvas = this.shadowRoot.querySelector("#canvas");
    this.#ghost = this.shadowRoot.querySelector("#ghost");

    this.size = 6;

    const beginPuzzle = e => {
      if(this.#pointerId !== null){
        return;
      }
      this.#pointerId = e.pointerId;
      const pointerPos = this.#getPointerTile(e);
      this.#states.updateStates({
        pointerDown:true,
        pointerPos
      });
      this.#drawGhost();
      
      if(this.#mode === "puzzle"){
        this.#moveGhost();
      }
    }
    this.#canvas.addEventListener("pointerdown", beginPuzzle);
    //this.#canvas.addEventListener("touchstart", beginPuzzle);

    this.#canvas.addEventListener("touchmove", e=>{
      e.preventDefault();
    });

    const finishPuzzle = e => {
      if(e.pointerId !== this.#pointerId){
        return;
      }
      this.#pointerId = null;
      this.#states.updateStates({
        pointerDown:false,
        pointerPos:EmptyPosition(),
      });
      this.#moveGhost();
    }
    window.addEventListener("pointerup", finishPuzzle);
    //window.addEventListener("mouseup", finishPuzzle);

    window.addEventListener("pointermove", e=>{
      if(this.#pointerId !== e.pointerId){
        return;
      }
      if(this.#states.pointerDown){
        this.#states.pointerPos = this.#getPointerTile(e);
      }
      this.#moveGhost();
    });

    new ResizeObserver(()=>{
      this.#rect = this.#canvas.getBoundingClientRect();
    }).observe(this);
  }

  #mode;
  set mode(value){
    this.#mode = value;
  }

  modifyDrop(pos, func){
    const drop = this.#states.board[pos.y][pos.x];
    func({drop, board:this.#states.board});
    this.render();
  }

  enableDrop(id){
    this.#states.disables.delete(id);
    this.render();
  }
  disableDrop(id){
    this.#states.disables.add(id);
    this.render();
  }
  isDisableDrop(id){
    return this.#states.disables.has(id);
  }

  #raw=EmptyPosition();
  #rect;

  #getPointerTile(e){
    if(e instanceof TouchEvent){
      e = e.touches[0];
    }
    const rect = this.#rect;
    this.#raw = {
      x: e.pageX-rect.left,
      y: e.pageY-rect.top,
    };
    const x = clamp(0, Math.floor(this.#raw.x / this.#canvas.offsetWidth * this.size), this.size-1);
    const y = clamp(0, Math.floor(this.#raw.y / this.#canvas.offsetHeight * (this.size-1)), this.size-2);
    return Position({x,y});
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

  #drawBG(ctx) {
    const size = this.#states.size;
    ctx.fillStyle = bgColor[0];
    ctx.fillRect(0, 0, size * this.#tileSize, size * this.#tileSize);

    ctx.fillStyle = bgColor[1];
    this.#loopTile(({top, left})=>{
      if ((left + top) % 2) {
        ctx.fillRect(left * this.#tileSize, top * this.#tileSize, this.#tileSize, this.#tileSize);
      }
    })
  }

  #drawDrop(ctx) {
    const pos = this.#states.pointerPos;
    this.#loopTile(({top, left})=>{
      const hold = this.#mode === "puzzle" && pos.x === left && pos.y === top;
      this.#states.board[top][left].draw(ctx, {size:this.#tileSize, x:left, y:top, hold, disables:this.#states.disables});
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
    if(this.#mode === "palette"){
      return;
    }
    this.#ghost.style.display = this.#states.pointerDown ? "block":"none";
    if(!this.#states.pointerDown){
      return;
    }
    //少し大きく表示
    const displayTileSize = this.#canvas.offsetWidth / this.size * 1.2;
    const offset = displayTileSize/2;
    this.#ghost.style.transform = `translate(${this.#raw.x - offset}px,${this.#raw.y - offset*1.5}px)`;
  }

  render() {
    const ctx = this.#canvas.getContext("2d");
    this.#drawBG(ctx);
    this.#drawDrop(ctx);
  }
}
customElements.define("pad-board", PADBoard);