import ReactiveStates from "../libs/ReactiveStates.js";

const dropNames = [
  "fire", "water", "wood", "light", "dark", "heal",
  "poison", "deadlypoison", "trash", "bomb",
];

const loadImage = (filePath) => new Promise((res) => {
  const img = new Image();
  img.addEventListener("load", e=>{
    res(img);
  });
  img.src = filePath;
});
const dropImages = await Promise.allSettled(dropNames.map(dropName => loadImage(`./src/images/drops/${dropName}.png`))).then(results=>results.map(r=>r.value));

class PADBoard extends HTMLElement {

  static get style() {
    return `
    :host{
      display:block;
      width:100%;
      height:100%;
    }
    #canvas{
      display:block;
      width:100%;
      height:100%;
    }
    `;
  }

  #canvas;
  #states;
  #tileSize = 128;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>${this.constructor.style}</style>
      <canvas id="canvas"></canvas>
    `;

    this.#states = ReactiveStates({
      size: {
        value: 6,
      },
      board: {
        value: [...Array(5)].map(() => [...Array(6)].map(() => Math.floor(Math.random() * 6))),
      }
    });
    this.#states.setCallback(() => this.render());

    this.#canvas = this.shadowRoot.querySelector("#canvas");

    this.size = 6;
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
    this.#loopTile(({top, left})=>{
      const drop = this.#states.board[top][left];
      ctx.drawImage(dropImages[drop], left * this.#tileSize, top * this.#tileSize, this.#tileSize, this.#tileSize);
    })
  }

  render() {
    const ctx = this.#canvas.getContext("2d");
    this.#drawBG(ctx);
    this.#drawDrop(ctx);
  }
}
customElements.define("pad-board", PADBoard);