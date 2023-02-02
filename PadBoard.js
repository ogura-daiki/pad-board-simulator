
const States = (init, callback)=>{
  const keys = new Set(Object.keys(init));
  const values = new Map(Object.entries(init).map(([name, o])=>[name, o.value]));
  const defaultChecker = (oldVal, newVal) => oldVal !== newVal;

  const update = (updates) => {
    let someValuesUpdated = false;
    for(const [name, newValue] of Object.entries(updates)){
      if(!keys.has(name)) continue;
      const oldValue = values.get(name);
      const hasChanged = init[name]?.hasChanged ?? defaultChecker;
      let updated = false;
      if(!values.has()){
        updated = true;
      }
      else{
        updated = hasChanged(oldValue, newValue);
      }
      if(updated){
        values.set(name, newValue);
        someValuesUpdated = true;
      }
    }
    return someValuesUpdated;
  }
  return new Proxy(Object.create(null), {
    set(target, name, newValue){
      if(update({[name]:newValue})){
        callback();
      }
      return true;
    },
    get(target, name, receiver){
      //一括アップデート
      if(name === "updateStates"){
        return updates => {
          if(update(updates)){
            callback();
          }
        }
      }
      if(!keys.has(name)) return undefined;
      return values.get(name);
    }
  })
}

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
  #states;
  #tileSize=128;
  constructor(){
    super();
    this.attachShadow({mode:"open"});
    this.shadowRoot.innerHTML = `
      <style>${this.constructor.style}</style>
      <canvas id="canvas"></canvas>
    `;

    this.#states = States({
      size:{
        value:6,
      },
    }, ()=> this.render());

    this.#canvas = this.shadowRoot.querySelector("#canvas");

    this.size = 6;
  }

  #start;
  set start(board){
    this.#start = board;
  }

  set size(long){
    this.#canvas.width = long*this.#tileSize;
    this.#canvas.height = (long-1)*this.#tileSize;
    this.#states.size = long;
  }

  #bgColor=['rgb(40, 20, 0)', 'rgb(60, 40, 0)'];
  #drawBG(ctx){
    const size = this.#states.size;
    ctx.fillStyle = this.#bgColor[0];
    ctx.fillRect(0, 0, size*this.#tileSize, size*this.#tileSize);

    ctx.fillStyle = this.#bgColor[1];
    for(let leftNeedle=0;leftNeedle<size;leftNeedle+=1){
      for(let topNeedle=0;topNeedle<size-1;topNeedle+=1){
        if((leftNeedle+topNeedle)%2){
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