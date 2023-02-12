import { newBoard, swap, emulateMove } from "../libs/BoardUtil.js";
import { Drop } from "../libs/Drops.js";
import Pattern from "../libs/Pattern.js";
import { EmptyPos, Pos } from "../libs/Position.js";
import ReactiveStates from "../libs/ReactiveStates.js";
import { clamp } from "../libs/Util.js";

const bgColor = ['rgb(40, 20, 0)', 'rgb(60, 40, 0)'];

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

  dispatchDropPush(pos){
    this.dispatchEvent(new CustomEvent(
      "dropPushed",
      {
        detail:{target:this, pointerPos:pos},
        composed:true, bubbles:true,
      }
    ));
  }

  onPointerMoved(nv, ov) {
    if(nv.empty){
      return;
    }
    if(ov.empty && this.#mode !== "palette"){
      return;
    }

    new Pattern({
      palette:()=>this.dispatchDropPush(nv),
      puzzle:()=>swap(this.#states.board, ov, nv),
    }).do(this.#mode);

  }

  get __defineStates() {
    return {
      size: {
        value: 6,
      },
      board: {
        value: newBoard(6),
      },
      pointerDown: {
        value: false,
      },
      pointerPos: {
        value: EmptyPos(),
        hasChanged: (nv, ov) => {
          const hasChange = ["x", "y"].some(key => nv[key] !== ov[key]);
          if(hasChange){
            emulateMove(ov, nv, (nv, ov)=>this.onPointerMoved(nv, ov));
          }
          return hasChange;
        },
      },
      disables: {
        value: new Set(),
      }
    }
  }

  #initView(){
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>${this.constructor.style}</style>
      <canvas id="canvas"></canvas>
      <img id="ghost" draggable=false>
    `;

    this.#canvas = this.shadowRoot.querySelector("#canvas");
    this.#ghost = this.shadowRoot.querySelector("#ghost");
  }

  #onPointerDown(e){
    if (this.#pointerId !== null) {
      return;
    }
    this.#pointerId = e.pointerId;
    const pointerPos = this.#getPointerTile(e);
    this.#states.updateStates({
      pointerDown: true,
      pointerPos
    });
    this.#drawGhost();

    if (this.#mode === "puzzle") {
      this.#moveGhost();
    }
  }
  #onPointerMove(e){
    if (this.#pointerId !== e.pointerId) {
      return;
    }
    if (this.#states.pointerDown) {
      this.#states.pointerPos = this.#getPointerTile(e);
    }
    this.#moveGhost();
  }
  #onPointerUp(e){
    if (e.pointerId !== this.#pointerId) {
      return;
    }
    this.#pointerId = null;
    this.#states.updateStates({
      pointerDown: false,
      pointerPos: EmptyPos(),
    });
    this.#moveGhost();
  }

  constructor() {
    super();

    this.#initView();

    this.#states = ReactiveStates(this.__defineStates);
    this.#states.setCallback(() => this.render());

    //盤面操作、パズル
    this.#canvas.addEventListener("pointerdown", e=>this.#onPointerDown(e));
    window.addEventListener("pointermove", e=>this.#onPointerMove(e));
    window.addEventListener("pointerup", e=>this.#onPointerUp(e));

    //ポインターイベントが途中でキャンセルされることを防ぐ
    this.#canvas.addEventListener("touchmove", e=>e.preventDefault());

    //サイズの変化を記録しておく
    new ResizeObserver(() => {
      this.#rect = this.#canvas.getBoundingClientRect();
    }).observe(this);
  }

  #mode;
  set mode(value) {
    this.#mode = value;
  }

  modifyDrop(pos, func) {
    const drop = this.#states.board[pos.y][pos.x];
    func({ drop, board: this.#states.board });
    this.render();
  }

  enableDrop(id) {
    this.#states.disables.delete(id);
    this.render();
  }
  disableDrop(id) {
    this.#states.disables.add(id);
    this.render();
  }
  isDisableDrop(id) {
    return this.#states.disables.has(id);
  }

  #raw = EmptyPos();
  #rect;

  #getPointerTile(e) {
    if (e instanceof TouchEvent) {
      e = e.touches[0];
    }
    const rect = this.#rect;
    this.#raw = {
      x: e.pageX - rect.left,
      y: e.pageY - rect.top,
    };
    const x = clamp(0, Math.floor(this.#raw.x / this.#canvas.offsetWidth * this.size), this.size - 1);
    const y = clamp(0, Math.floor(this.#raw.y / this.#canvas.offsetHeight * (this.size - 1)), this.size - 2);
    return Pos({ x, y });
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

  get size() {
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
    this.#loopTile(({ top, left }) => {
      if ((left + top) % 2) {
        ctx.fillRect(left * this.#tileSize, top * this.#tileSize, this.#tileSize, this.#tileSize);
      }
    })
  }

  #drawDrop(ctx) {
    const pos = this.#states.pointerPos;
    this.#loopTile(({ top, left }) => {
      const hold = this.#mode === "puzzle" && pos.x === left && pos.y === top;
      this.#states.board[top][left].draw(ctx, { size: this.#tileSize, x: left, y: top, hold, disables: this.#states.disables });
    });
  }

  #drawGhost() {
    //少し大きく表示
    const displayTileSize = this.#canvas.offsetWidth / this.size * 1.2;
    const sizes = {
      width: `${displayTileSize}px`,
      height: `${displayTileSize}px`,
    };
    const pos = this.#states.pointerPos;
    if (!pos.empty) {
      Object.assign(this.#ghost.style, sizes);
      const drop = this.#states.board[pos.y][pos.x];
      drop.createGhost(this.#ghost);
    }
  }

  #moveGhost() {
    if (this.#mode === "palette") {
      return;
    }
    this.#ghost.style.display = this.#states.pointerDown ? "block" : "none";
    if (!this.#states.pointerDown) {
      return;
    }
    //少し大きく表示
    const displayTileSize = this.#canvas.offsetWidth / this.size * 1.2;
    const offset = displayTileSize / 2;
    this.#ghost.style.transform = `translate(${this.#raw.x - offset}px,${this.#raw.y - offset * 1.5}px)`;
  }

  render() {
    const ctx = this.#canvas.getContext("2d");
    this.#drawBG(ctx);
    this.#drawDrop(ctx);
  }

  clearBoard() {
    this.#states.board = newBoard(this.#states.size, () => new Drop(-1));
  }
  random() {
    this.#states.board = newBoard(this.#states.size, () => new Drop(Math.floor(Math.random() * 6)))
  }
}
customElements.define("pad-board", PADBoard);