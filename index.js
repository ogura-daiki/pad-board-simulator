import { css, html, LitElement, styleMap } from "./src/js/Lit.js";

class AspectContainer extends LitElement {
  static get styles(){
    return css`
    :host{
      display:block;
      width:100%;
      height:100%;
      box-sizing:border-box;
    }
    #container{
      box-sizing:border-box;
    }
    `;
  }

  static get properties(){
    return {
      ratio:{type:Number},
      target:{type:String},
    }
  }

  constructor(){
    super();
    this.ratio = 1/2;
    this.target = "width";

    let timerId;
    new ResizeObserver(()=>{
      clearTimeout(timerId);
      timerId = requestAnimationFrame(()=>{
        this.requestUpdate();
      });
    }).observe(this);
  }

  render(){
    const style = {
      aspectRatio:this.ratio,
    };
    style[this.target] = "100%";
    if(this.target === "width"){
      style.maxWidth = this.clientHeight*this.ratio +"px";
    }
    else if(this.target = "height"){
      style.maxHeight = this.clientWidth/this.ratio +"px";
    }
    return html`
    <div id="container" style=${styleMap(style)}><slot></slot></div>
    `;
  }
}
customElements.define("aspect-container", AspectContainer);

const style = css`
:host{
  display:block;
  width:100%;
  height:100%;
  display:grid;
  place-items:center;
  overflow:hidden;
}
#container{
  background:rgb(32,24,24);
}
#screen{
  background:black;
}
#board{
  background:rgb(60, 30, 0);
  color:white;
}
#menu{
  border:solid lightgray;
  border-width:4px 0px;
  box-sizing:border-box;
  display:flex;
  flex-flow:row;
  overflow-x:auto;
  width:100%;
}
`;

const menuList = [
  "パズル",
  "盤面変更",
];

const sizeList = [
  7,6,5
];

class App extends LitElement{
  static get styles(){
    return [style];
  }

  static get properties(){
    return {
      ratio:{type:Number},
      boardSize:{type:Number},
    }
  }
  constructor(){
    super();
    this.ratio = 1/2;
    this.boardSize = 5/4;
  }
  render(){
    return html`
    <aspect-container .ratio=${this.ratio} id=container style="display:grid;place-items:center;">
      <div id=screen style="width:100%;height:100%;display:grid;grid-template-rows:1fr 0fr">
        <div style="display:flex;flex-flow:column;overflow:hidden;">
          <div style="flex-grow:1;flex-basis:0px; overflow-y:scroll;display:flex;flex-flow:column;">
            ${sizeList.map(long=>html`<button @click=${()=>this.boardSize = long/(long-1)}>${long}×${long-1}</button>`)}
          </div>
          <div id=menu>
            ${menuList.map((label)=>html`<button>${label}</button>`)}
          </div>
        </div>
        <aspect-container .ratio=${this.boardSize} target="height" id=board>
          盤面
        </aspect-container>
      </div>
    </aspect-container>
    `
  }
}
customElements.define("pad-simulator", App);