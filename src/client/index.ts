import { AnyRouter } from "@trpc/server";
import { AnyPRPCRouter } from "../shared/types";
import { PRPCNext, PusherContextOptions } from "./types";
import { useConnect } from "./useConnect";
import { usePRPCContext } from "./usePRPCContext";

export function createPRPCNext<
  TRPCRouter extends AnyRouter,
  PRPCRouter extends AnyPRPCRouter
>(
  api: any,
  pusher_opts: { app_key: string; options: PusherContextOptions; log?: boolean }
) {
  return new Proxy(
    {},
    {
      get(target: any, p: any) {
        if (p === "context") {
          return { opts: pusher_opts, api: api };
        }
        if (p === "withPRPC") {
          return usePRPCContext;
        }

        return {
          useConnect: (id: any, options: any, binding: any, deps: any = []) =>
            useConnect(id, options, binding, deps, { channel_name: p }),
        };
      },
    }
  ) as PRPCNext<TRPCRouter, PRPCRouter> & {
    withPRPC: typeof usePRPCContext;
    context: { opts: PusherContextOptions; api: TRPCRouter };
  };
}
