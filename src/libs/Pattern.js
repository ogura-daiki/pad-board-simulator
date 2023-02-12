import { purifyObj } from "./Util.js";

class Pattern {

  #keys;
  #purified;
  constructor(obj){
    this.#keys = new Set(Object.keys(obj));
    this.#purified = purifyObj(obj);
  }

  get(name){
    if(this.#keys.has(name)){
      return this.#purified[name];
    }
    else if(this.#keys.has("default")){
      return this.#purified["default"];
    }
    return undefined;
  }

  do(name){
    const action = this.get(name);
    if(typeof action === "function"){
      action();
      return true;
    }
    return false;
  }
}

export default Pattern;