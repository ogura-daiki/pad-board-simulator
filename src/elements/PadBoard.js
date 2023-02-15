import { newBoard, swap, emulateMove, cloneBoard } from "../libs/BoardUtil.js";
import { Drop } from "../libs/Drops.js";
import Pattern from "../libs/Pattern.js";
import { EmptyPos, Pos, Position } from "../libs/Position.js";
import ReactiveStates from "../libs/ReactiveStates.js";
import { clamp } from "../libs/Util.js";

const sounds = {
  move: new Howl({
    preload:true,
    src: [`${rootPath}/src/sounds/move.mp3`],
  }),
};

const range = (start, end) => [...Array(end-start+1)].map((_,i)=>i+start);

const getPosValue = (board, {x, y}) => board[y][x];

const countCombo = (size, board, disables) => {
  disables = new Set(disables);
  disables.add(-1);
  const minCount = 3;

  //コンボ発生をチェック
  const comboCheck = board.map(row=>row.map(()=>false));

  loopTile(size, ({y, x})=>{
    const drop = getPosValue(board, {y,x});

    //消せないドロップは除外
    if(disables.has(drop.id)){
      return;
    }

    //横方向
    const xEnd = x+minCount-1;
    if(xEnd<size){
      const xRange = range(x, xEnd);
      const isXCombo = xRange.every(xNeedle => getPosValue(board, {y, x:xNeedle}).id === drop.id);
      if(isXCombo){
        xRange.forEach(xNeedle => comboCheck[y][xNeedle] = true);
      }
    }

    //縦方向
    const yEnd = y-minCount+1;
    if(yEnd>=0){
      const yRange = range(yEnd, y);
      const isYCombo = yRange.every(yNeedle => getPosValue(board, {y:yNeedle, x}).id === drop.id);
      if(isYCombo){
        yRange.forEach(yNeedle => comboCheck[yNeedle][x] = true);
      }
    }

  });

  const noComboCount = 99999;
  //同一コンボをカウント
  const comboCounter = board.map(row=>row.map(()=>noComboCount));
  const comboPosList = new Map();
  let maxComboId = 0;
  const makeComboId = (v1, v2) => {
    const min = Math.min(v1, v2);
    const max = Math.max(v1, v2);
    
    //コンボがあった
    if(min !== noComboCount){
      //v1, v2ともに別カウントに所属しているのてマージする
      if(max !== noComboCount && min !== max){
        const container = comboPosList.get(min);
        for(const pos of comboPosList.get(max)){
          comboCounter[pos.y][pos.x] = min;
          container.push(pos);
        }
        comboPosList.delete(max);
      }
      //小さい方を返す
      return min;
    }
    
    //コンボが無かったので新しいコンボを追加
    maxComboId++;
    comboPosList.set(maxComboId, []);
    return maxComboId;
  }
  const setCombo = (comboId, posList) => {
    const container = comboPosList.get(comboId);
    for(const pos of posList){
      container.push(pos);
      comboCounter[pos.y][pos.x] = comboId;
    }
  }

  const checkAndSetCombo = (p1, p2) => {
    //どちらかがコンボではない場合
    if([p1, p2].some(p=>!getPosValue(comboCheck, p))){
      return;
    }
    //別ドロップのとき
    if(getPosValue(board, p1).id !== getPosValue(board, p2).id){
      return;
    }
    const comboId = makeComboId(...[p1, p2].map(p=>getPosValue(comboCounter, p)));
    setCombo(comboId, [p1, p2]);
  }

  for(let y=size-2;y>=0;y-=1){
    for(let x=0;x<size;x+=1){
      //横方向
      if(x+1<size){
        checkAndSetCombo(Pos({y,x}), Pos({y,x:x+1}));
      }
      //縦方向
      if(y-1>=0){
        checkAndSetCombo(Pos({y,x}), Pos({x,y:y-1}));
      }
    }
  }


  const comboCount = [...comboPosList.keys()].length;
  const comboList = new Map();
  [...comboPosList.keys()].sort((a,b)=>a-b).forEach((oldKey, index)=>{
    const newKey = index+1;
    console.log({oldKey, newKey})
    comboList.set(newKey, comboPosList.get(oldKey));
  });

  return {count:comboCount, comboList};
}

const loopTile = (size, callback) => {
  for (let top = 0; top < size - 1; top += 1) {
    for (let left = 0; left < size; left += 1) {
      callback({ top, y:top, left, x:left });
    }
  }
}

const sleep = time => new Promise(r=>setTimeout(()=>r(), time));
const waitAnim = ()=>new Promise(r=>requestAnimationFrame(()=>r()));

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
    #animationLayer{
      position:absolute;
      top:0px;
      left:0px;
      width:100%;
      height:100%;
      user-select:none;
      pointer-events:none;
    }
    @keyframes fadeout{
      from{opacity:1}
      to{opacity:0}
    }

    .animDrop{
      position:absolute;
      display:block;
    }
    `;
  }

  #canvas;
  #ghost;
  #animationLayer;
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

  #moved=false;
  onPointerMoved(nv, ov) {
    if(nv.empty){
      return;
    }
    if(ov.empty && this.#mode !== "palette"){
      return;
    }

    new Pattern({
      palette:()=>this.dispatchDropPush(nv),
      puzzle:()=>{
        sounds.move.play();
        this.#moved = true;
        swap(this.#states.board, ov, nv);
      },
    }).do(this.#mode);

  }

  get __defineStates() {
    return {
      size: {
        value: 6,
      },
      start: {
        value: newBoard(6),
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
      },
      fadeoutDuration:{
        value:0.5,
        hasChanged:(nv, ov) => {
          return (
            v1 !== ov
            && typeof nv === "number"
            && nv > 0.1 && nv < 5
          );
        }
      },
      fallDuration:{
        value:0.5,
        hasChanged:(nv, ov) => {
          return (
            v1 !== ov
            && typeof nv === "number"
            && nv > 0.1 && nv < 5
          );
        }
      },
    }
  }

  #initView(){
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>${this.constructor.style}</style>
      <canvas id="canvas"></canvas>
      <img id="ghost" draggable=false>
      <div id="animationLayer"></div>
    `;

    this.#canvas = this.shadowRoot.querySelector("#canvas");
    this.#ghost = this.shadowRoot.querySelector("#ghost");
    this.#animationLayer = this.shadowRoot.querySelector("#animationLayer");
  }

  #onPointerDown(e){
    if (this.#pointerId !== null) {
      return;
    }
    this.#pointerId = e.pointerId;
    const pointerPos = this.#getPointerTile(e);
    const updates = {
      pointerDown: true,
      pointerPos
    };
    this.#states.updateStates(updates);

    if (this.#mode === "puzzle") {
      this.#drawGhost();
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
    if(this.#mode === "puzzle" && this.#moved){
      this.#onPuzzleFinished();
    }
    this.#moved = false;
    this.#pointerId = null;
    this.#states.updateStates({
      pointerDown: false,
      pointerPos: EmptyPos(),
    });
    this.#moveGhost();
  }

  #createAnimDrop(drop, pos, anim){
    const size = this.#states.size;
    const img = document.createElement("img");
    img.className = "animDrop";
    drop.createGhost(img);
    Object.assign(img.style, {
      left:(100/size * pos.x)+"%",
      top:(100/(size-1) * pos.y)+"%",
      width:(100/size)+"%",
      height:(100/(size-1))+"%",
      ...anim,
    });

    return img;
  }

  #deleteAllAnimObj(){
    while(this.#animationLayer.firstChild){
      this.#animationLayer.firstChild.remove();
    }
  }

  async #animDeleteDrop(){
    //console.log("animstart");
    const board = this.#states.board;
    const size = this.#states.size;
    const fadeoutDuration = this.#states.fadeoutDuration;
    
    const {count, comboList} = countCombo(this.#states.size, this.#states.board, this.#states.disables);

    this.#deleteAllAnimObj();
    
    for(const [comboId, posList] of comboList.entries()){
      for(const pos of posList){
        const drop = getPosValue(board, pos);
        if(drop.id === -1) continue;

        const img = this.#createAnimDrop(drop, pos, {
          animation:`${fadeoutDuration}s fadeout both`,
          "animation-delay":`${(comboId-1)*fadeoutDuration}s`,
        });
        this.#animationLayer.append(img);

        drop.id = -1;
      }
    }
    this.render();
    await sleep(count*fadeoutDuration*1000);
    //console.log("animend");
    return count;
  }

  async #animFallDrop(){
    const original = cloneBoard(this.#states.board);
    const board = original.map(row=>row.map(drop=>drop));
    const fallDuration = this.#states.fallDuration;

    const size = this.#states.size;
    loopTile(this.#states.size, ({y,x})=>{
      for(let needleY=this.#states.size-2;needleY>y;needleY-=1){
        if(getPosValue(board, {x,y:needleY}).id === -1 && getPosValue(board, {x, y:needleY-1}) !== -1){
          getPosValue(board, {x, y:needleY-1}).fallY = needleY;
          swap(board, Pos({x,y:needleY}), Pos({x,y:needleY-1}));
        }
      }
    });
    this.#states.board = newBoard(size, ()=>new Drop(-1));
    await waitAnim();

    this.#deleteAllAnimObj();

    const list = [];
    loopTile(this.#states.size, ({y, x})=>{
      const drop = getPosValue(original, {x,y});
      if(drop.id === -1){
        return;
      }

      const img = this.#createAnimDrop(drop, Pos({x,y}), {
        transition:`top ${fallDuration}s`,
      });
      this.#animationLayer.append(img);
      list.push([drop, img, y]);
    });

    await waitAnim();
    
    for(const [drop, img, originY] of list){
      img.style.top = `${100/(size-1) * ((drop.fallY??originY))}%`;
    }

    await sleep(fallDuration * 1000);
    this.#states.board = board;
    await waitAnim();
    return;
  }

  async #onPuzzleFinished(){
    let allCount = 0;
    while (true){
      const count = await this.#animDeleteDrop();
      allCount+=count;
      if(count <= 0){
        break;
      }
      await this.#animFallDrop();
    }
    this.#deleteAllAnimObj();
    console.log(allCount);
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
    const old = this.#mode;
    this.#mode = value;
    if(old !== value){
      this.#states.board = cloneBoard(this.#states.start);
    }
  }

  modifyDrop(pos, func) {
    const drop = this.#states.start[pos.y][pos.x];
    func({ drop, board: this.#states.start });
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

  set size(size) {
    this.#canvas.width = size * this.#tileSize;
    this.#canvas.height = (size - 1) * this.#tileSize;
    const start = newBoard(size);
    //古い盤面をコピー
    loopTile(Math.min(size, this.#states.size), ({x,y})=>{
      start[y][x] = this.#states.start[y][x];
    });
    this.#states.updateStates({
      size,
      start
    });
  }

  get size() {
    return this.#states.size;
  }

  restoreBoardToStart(){
    this.#states.board = cloneBoard(this.#states.start);
  }

  #drawBG(ctx) {
    const size = this.#states.size;
    ctx.fillStyle = bgColor[0];
    ctx.fillRect(0, 0, size * this.#tileSize, size * this.#tileSize);

    ctx.fillStyle = bgColor[1];
    loopTile(this.#states.size, ({ top, left }) => {
      if ((left + top) % 2) {
        ctx.fillRect(left * this.#tileSize, top * this.#tileSize, this.#tileSize, this.#tileSize);
      }
    })
  }

  #drawDrop(ctx) {
    const pos = this.#states.pointerPos;
    const board = this.#states[this.#mode==="puzzle"?"board":"start"];
    loopTile(this.#states.size, ({ x, y }) => {
      const hold = this.#mode === "puzzle" && pos.x === x && pos.y === y;
      getPosValue(board, {x,y}).draw(ctx, { size: this.#tileSize, x, y, hold, disables: this.#states.disables });
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
      const drop = getPosValue(this.#states.board, pos);
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
    this.#states.start = newBoard(this.#states.size, () => new Drop(-1));
  }
  random() {
    this.#states.start = newBoard(this.#states.size, () => new Drop(Math.floor(Math.random() * 6)))
  }
}
customElements.define("pad-board", PADBoard);