import { Drop } from "./Drops.js";

const newBoard = (long, genDrop = () => new Drop(Math.floor(Math.random() * 6))) => [...Array(long - 1)].map(() => [...Array(long)].map(genDrop));
const cloneBoard = board => {
  return board.map(row=>row.map(drop=>drop.clone()));
}

const swap = (board, p1, p2) => {
  const drop = board[p1.y][p1.x];
  board[p1.y][p1.x] = board[p2.y][p2.x];
  board[p2.y][p2.x] = drop;
}

const emulateMove = (from, to, callback) => {

  if(to.empty){
    return;
  }
  if(from.empty){
    callback(to, from);
    return;
  }

  const pos = { ...from };
  const before = { ...pos };

  const factorX = pos.x > to.x ? -1 : 1;
  const factorY = pos.y > to.y ? -1 : 1;

  let cnt = 100;
  while (cnt>0) {
    cnt--;
    let hasDiff = false;
    if (pos.x !== to.x) {
      pos.x += factorX
      hasDiff = true;
    }
    if (pos.y !== to.y) {
      pos.y += factorY;
      hasDiff = true;
    }
    if (!hasDiff) {
      break;
    }
    callback(pos, before);
    before.x = pos.x;
    before.y = pos.y;
  }
}

export {newBoard, cloneBoard, swap, emulateMove};