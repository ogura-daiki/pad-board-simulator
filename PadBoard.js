
class PADBoard extends HTMLElement{

  static get style(){
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
  #tileSize=128;
  constructor(){
    super();
    this.attachShadow({mode:"open"});
    this.shadowRoot.innerHTML = `
      <style>${this.constructor.style}</style>
      <canvas id="canvas"></canvas>
    `;

    this.#canvas = this.shadowRoot.querySelector("#canvas");

    this.size = 6;
    this.render();
  }

  #start;
  set start(board){
    this.#start = board;
  }

  #long;
  set size(long){
    this.#long = long;
    this.#canvas.width = long*this.#tileSize;
    this.#canvas.height = (long-1)*this.#tileSize;
    this.render();
  }

  #bgColor=['rgb(40, 20, 0)', 'rgb(60, 40, 0)'];
  #drawBG(ctx){
    ctx.fillStyle = this.#bgColor[0];
    ctx.fillRect(0, 0, this.#long*this.#tileSize, this.#long*this.#tileSize);

    ctx.fillStyle = this.#bgColor[1];
    for(let leftNeedle=0;leftNeedle<this.#long;leftNeedle+=1){
      for(let topNeedle=0;topNeedle<this.#long-1;topNeedle+=1){
        if((leftNeedle+topNeedle)%2){
          console.log(topNeedle, leftNeedle)
          ctx.fillRect(leftNeedle*this.#tileSize, topNeedle*this.#tileSize, this.#tileSize, this.#tileSize);
        }
      }
    }
  }

  render(){
    const ctx = this.#canvas.getContext("2d");
    this.#drawBG(ctx);
  }
}
customElements.define("pad-board", PADBoard);