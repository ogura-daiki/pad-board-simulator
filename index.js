import { css, html, LitElement, styleMap, unsafeCSS } from "./src/elements/Lit.js";
import "./src/elements/AspectContainer.js";
import "./src/elements/PadBoard.js";
import { dropEffectImages, modifierList, normalDrops } from "./src/libs/Drops.js";

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

  box-sizing:border-box;
  padding:8px;
  display:flex;
  flex-flow:column;
  gap:16px;
}

#menuContents>.option{
  display:flex;
  flex-flow:column;
  gap:0px;
}
#menuContents>.option>.name{
  font-size:1.2em;
}
#menuContents>.option>.list{
  margin-left:8px;
  display:flex;
  flex-flow:row wrap;
  gap:4px;
}

#menuContents>.option .palette{
  display:block;
  width:64px;
  height:64px;
  border:2px solid;
  border-color:transparent;
  background-image:
    linear-gradient(rgba(128,128,128,.6), rgba(128,128,128,.6)),
    url("./src/images/bg.png")
    ;
  border-radius:8px;
}
#menuContents>.option input:checked+.palette{
  border-color:lightgray;
}

#menuContents>.option .palette.disableDrop{
  position:relative;
}
#menuContents>.option .palette.disableDrop>*{
  position:absolute;
  top:0px;
  left:0px;
  display:block;
  width:100%;
  height:100%;
  background-size: contain;
}
#menuContents>.option input[type=checkbox]:checked+.palette.disableDrop .displayDisable{
  background-image:url(${unsafeCSS(dropEffectImages[3].src)});
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
const ratioList = [
  {label:"2:1", value:1/2},
  {label:"16:9", value:9/16},
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
    this.ratio = ratioList[0];
    this.boardSize = 6;
    this.opened = menuList[0].name;
    this.selectedPalette = modifierList[0];
  }

  _puzzle(){
    return html`
      操作時間：<input type=number min=0 max=120 step=1>
    `;
  }
  #option(name, content){
    return html`
    <div class=option>
      <span class=name>${name}</span>
      ${content}
    </div>
    `;
  }
  #radioList(list, name, {label, value, checked, changed}){
    return html`
      <div class=list
        @change=${changed}
      >
        ${list.map((v, i)=>html`
          <label>
            <input
              type=radio
              name=${name}
              .value=${value(v,i)}
              ?checked=${checked(v,i)}
            >
            <span>${label(v,i)}</span>
          </label>
        `)}
      </div>
    `;
  }
  _palette(){
    return html`
    ${this.#option("画面の縦横比", this.#radioList(
      ratioList, "aspectRatio",
      {
        label:({label})=>label,
        value:(v,i)=>i,
        checked:v=>v===this.ratio,
        changed:e=>this.ratio = ratioList[+e.target.value],
      }
    ))}
    ${this.#option("盤面のサイズ", this.#radioList(
      sizeList, "boardSize",
      {
        label:long=>`${long}×${long-1}`,
        value:v=>v,
        checked:v=>v===this.boardSize,
        changed:e=>this.boardSize = +e.target.value,
      }
    ))}
    <button @click=${e=>{
      const padBoard = this.renderRoot.querySelector("#padBoard");
      padBoard.clearBoard();
    }}>盤面をリセット</button>
    <button @click=${e=>{
      const padBoard = this.renderRoot.querySelector("#padBoard");
      padBoard.random();
    }}>盤面をランダム生成</button>
    ${this.#option("ドロップパレット", html`
      <div class=list
        @change=${e=>this.selectedPalette = modifierList[e.target.value]}
      >
        ${modifierList.map((modifier, index)=>html`
          <label>
            <input
              type=radio
              name=palette
              value=${index}
              ?checked=${modifier === this.selectedPalette}
              style="display:none"
            >
            <img class=palette src=${modifier.image}>
          </label>
        `)}
      </div>
    `)}
    ${this.#option("消せないドロップ", (()=>{
      const padBoard = this.renderRoot.querySelector("#padBoard");
      const isDisableDrop = id => padBoard?padBoard.isDisableDrop(id):false;
      return html`
        <div class=list
          @change=${e=>{
            const padBoard = this.renderRoot.querySelector("#padBoard");
            const dropId = +e.target.value;
            if(e.target.checked){
              padBoard.disableDrop(dropId);
            }
            else {
              padBoard.enableDrop(dropId);
            }
          }}
        >
          ${normalDrops.map(({id, image}, index)=>html`
            <label>
              <input
                type=checkbox
                name=disableDrop
                value=${id}
                ?checked=${isDisableDrop(id)}
                style="display:none"
              >
              <div class="palette disableDrop" src=${image}>
                <img src=${image}>
                <div class="displayDisable"></div>
              </img>
            </label>
          `)}
        </div>
      `
    })())}
    `;
  }

  render(){
    return html`
    <aspect-container .ratio=${this.ratio.value} id=container>
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
          <pad-board
            id="padBoard"
            .size=${this.boardSize}
            .mode=${this.opened}
            @dropPushed=${e=>{
              e.target.modifyDrop(e.detail.pointerPos, this.selectedPalette.modifier);
            }}
          ></pad-board>
        </aspect-container>
      </div>
    </aspect-container>
    `
  }
}
customElements.define("pad-simulator", App);