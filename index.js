import { css, html, LitElement, styleMap } from "./src/elements/Lit.js";
import "./src/elements/AspectContainer.js";
import "./src/elements/PadBoard.js";

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
  background-image:
    linear-gradient(rgba(0,0,0,.5), rgba(0,0,0,.8)),
    url("./src/images/bg.png")
    ;
  display:grid;
  place-items:center;
}
#screen{
  background:black;
  width:100%;
  height:100%;
  display:grid;
  grid-template-rows:1fr 0fr;
}
#board{
  background:rgb(60, 30, 0);
  color:white;
}
#menuContainer{
  display:flex;
  flex-flow:column;
  overflow:hidden;
  background-image:
    linear-gradient(rgba(0,0,0,.8), rgba(0,0,0,.8)),
    url("./src/images/bg.png")
    ;
    color:white;
}
#menuContents{
  flex-grow:1;
  flex-basis:0px;
  overflow-y:scroll;
}
#sizes{
  display:flex;
  flex-flow:row;
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
  {label:"盤面変更", name:"palette"},
  {label:"パズル", name:"puzzle"},
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
      opened:{type:String},
    }
  }
  constructor(){
    super();
    this.ratio = 1/2;
    this.boardSize = 6;
    this.opened = menuList[0].name;
  }

  _puzzle(){
    return html`
      操作時間：<input type=number min=0 max=120 step=1>
    `;
  }
  _palette(){
    return html`
    <div id=sizes>
      ${sizeList.map(long=>html`<button @click=${()=>this.boardSize = long}>${long}×${long-1}</button>`)}
    </div>
    `
  }

  render(){
    return html`
    <aspect-container .ratio=${this.ratio} id=container>
      <div id=screen>
        <div id=menuContainer>
          <div id=menuContents>
            ${this["_"+this.opened]()}
          </div>
          <div id=menu>
            ${menuList.map((menu)=>html`<button @click=${e=>this.opened = menu.name}>${menu.label}</button>`)}
          </div>
        </div>
        <aspect-container .ratio=${this.boardSize/(this.boardSize-1)} fit="width" id=board>
          <pad-board .size=${this.boardSize}></pad-board>
        </aspect-container>
      </div>
    </aspect-container>
    `
  }
}
customElements.define("pad-simulator", App);