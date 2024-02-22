var stopListening = false;
function listenWs(fn) {
  stopListening = false;
  fn = fn || console.log;

  let property = Object.getOwnPropertyDescriptor(
    MessageEvent.prototype,
    "data"
  );

  const data = property.get;

  // wrapper that replaces getter
  function lookAtMessage() {
    let socket = this.currentTarget instanceof WebSocket;

    if (!socket) {
      return data.call(this);
    }

    let msg = data.call(this);

    Object.defineProperty(this, "data", { value: msg }); //anti-loop
    if (stopListening) {
      return msg;
    }
    fn({ data: msg, socket: this.currentTarget, event: this });
    return msg;
  }

  property.get = lookAtMessage;

  Object.defineProperty(MessageEvent.prototype, "data", property);
}

export const listen = (fn) =>
  listenWs(({ data }) => fn(parseJSONRecursive(data)));

export const mute = () => {
  stopListening = true;
};
function parseJSONRecursive(json) {
  return JSON.parse(json, function (key, value) {
    if (typeof value === "string") {
      let json = value.trim();
      if (json.startsWith("{") && json.endsWith("}")) {
        return parseJSONRecursive(json);
      }
    }
    return value;
  });
}
