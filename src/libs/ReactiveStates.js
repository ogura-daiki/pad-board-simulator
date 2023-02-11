
const Updater = (keys, values, hasChanged) => (updates) => {
  let someValuesUpdated = false;
  for (const [name, newValue] of Object.entries(updates)) {
    if (!keys.has(name)) continue;
    let updated = false;
    if (!values.has(name)) {
      updated = true;
    }
    else {
      const oldValue = values.get(name);
      updated = hasChanged(name, newValue, oldValue);
    }
    if (updated) {
      values.set(name, newValue);
      someValuesUpdated = true;
    }
  }
  return someValuesUpdated;
}

const ReactiveStates = (init) => {
  init = Object.assign(Object.create(null), init);
  const keys = new Set(Object.keys(init));
  const values = new Map(Object.entries(init).map(([name, o]) => [name, o.value]));
  const defaultChecker = (oldVal, newVal) => oldVal !== newVal;

  console.log((name => init[name].hasChanged || defaultChecker)("pointerPos"))
  const update = Updater(keys, values, (name, newVal, oldVal) => (init[name].hasChanged || defaultChecker)(newVal, oldVal));

  let onUpdatedCallback = () => { };

  const methods = Object.assign(Object.create(null), {
    //一括アップデート
    updateStates:updates => {
      if (update(updates)) {
        onUpdatedCallback();
      }
    },
    //アップデート発生を通知するコールバックを設定
    setCallback:fn => {
      onUpdatedCallback = fn;
    },
  });

  return new Proxy(Object.create(null), {
    set(target, name, newValue) {
      //console.log(name, newValue, update({ [name]: newValue }));
      if (update({ [name]: newValue })) {
        onUpdatedCallback();
      }
      return true;
    },
    get(target, name, receiver) {
      if (methods[name]) return methods[name];
      if (!keys.has(name)) return undefined;
      return values.get(name);
    }
  })
}


export default ReactiveStates;
