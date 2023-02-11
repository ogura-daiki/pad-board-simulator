import { LitElement, css, html, styleMap } from "./Lit.js";

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
      fit:{type:String},
    }
  }

  constructor(){
    super();
    this.ratio = 1/2;
    this.fit = "height";

    let timerId;
    new ResizeObserver(()=>{
      clearTimeout(timerId);
      timerId = requestAnimationFrame(()=>{
        this.requestUpdate();
      });
    }).observe(this);
  }

  #rotateOrientation(orientation){
    return {
      width:"height",
      height:"width",
    }[orientation];
  }

  render(){
    const style = {
      aspectRatio:this.ratio,
    };
    style[this.#rotateOrientation(this.fit)] = "100%";
    if(this.fit === "height"){
      style.maxWidth = this.clientHeight*this.ratio +"px";
    }
    else if(this.fit === "width"){
      style.maxHeight = this.clientWidth/this.ratio +"px";
    }
    return html`
    <div id="container" style=${styleMap(style)}><slot></slot></div>
    `;
  }
}
customElements.define("aspect-container", AspectContainer);