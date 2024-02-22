import type Pusher from "pusher";
import { Exact } from "../shared/types";
import { isChannelWithMember } from "../shared/utils";
import { PRPCPusher } from "./PRPCPusher";
import { PRPCRouteBuilder } from "./PRPCRouteBuilder";
import { PRPCPresenceRouteTRPC, PRPCPublicRouteTRPC } from "./PRPCRouteTRPC";
import type {
  BuilderCreateParameters,
  PRPCRoute,
  PRPCRoutePresence,
  PRPCRoutePublic,
  PRPCRouter,
  PRPCRouterProcedures,
} from "./types";

export class PRPC<TConfig extends BuilderCreateParameters> {
  private pusher: Pusher;
  private context: (opts: any) => any;
  constructor(pusher: Pusher, context: (opts: any) => Promise<any>) {
    this.pusher = pusher;
    this.context = context;
  }

  createPRPCRouter<T extends PRPCRouter>(config: T) {
    for (const name in config) {
      if (isChannelWithMember(config[name]!._defs.type)) {
        config[name] = new PRPCPresenceRouteTRPC(
          config[name]!,
          config[name]!._defs.procedure,
          new PRPCPusher<true>(this.pusher, name, config[name]!._defs.type)
        ) as any;
      } else {
        config[name] = new PRPCPublicRouteTRPC(
          config[name]!,
          config[name]!._defs.procedure,
          new PRPCPusher(this.pusher, name, config[name]!._defs.type)
        ) as any;
      }
    }
    (config as any)._defs = {
      pusher: this.pusher,
      ctx: this.context,
    };

    return config as any as PRPCRouterProcedures<T, TConfig["transformer"]>;
  }

  presenceRoute<T extends PRPCRoutePresence>(route: T) {
    return new PRPCRouteBuilder<T, "presence", T["user"], TConfig["context"]>(
      route,
      "presence"
    );
  }
  publicRoute<T extends PRPCRoute>(
    route: T extends Exact<T, PRPCRoutePublic> ? T : never
  ) {
    return new PRPCRouteBuilder<T, "public", any>(route, "public");
  }
}
