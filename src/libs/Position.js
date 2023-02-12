
class Position {
  constructor(obj){
    
    const {x,y,empty} = {...{x:null, y:null, empty:false}, ...(obj||{empty:true})};
    this.empty = empty;
    this.x = x;
    this.y = y;

  }
  clone(){
    return new Position(this);
  }
}
const Pos = obj => new Position(obj);
const EmptyPos = () => Pos();

export {Pos, EmptyPos, Position};