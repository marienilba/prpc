import { PRPC } from "./PRPC";
import type { BuilderCreateParameters } from "./types";

export class PRPCBuilder {
  constructor() {}
  create<T extends BuilderCreateParameters>(params: T) {
    return new PRPC<T>(params.pusher, params.context);
  }
}
