
const clamp = (min, x, max) => min > x ? min : (x < max ? x : max);
const purifyObj = obj => Object.assign(Object.create(null), obj);

export {clamp, purifyObj};