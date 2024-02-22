import type {
  AnyProcedure,
  AnyRouter,
  inferRouterInputs,
  inferRouterOutputs,
} from "@trpc/server";
import type { Options } from "pusher-js";
import { z, type ZodObject } from "zod";
import {
  PRPCPresenceRouteTRPC,
  PRPCPublicRouteTRPC,
} from "../server/PRPCRouteTRPC";
import { AnyPRPCRouter } from "../shared/types";
import { useConnect } from "./useConnect";

export type PusherContextOptions = Options;
export type PRPCNext<
  TRPCRouter extends AnyRouter,
  PRPCRouter extends AnyPRPCRouter
> = {
  [P in keyof TRPCRouter as TRPCRouter[P] extends AnyRouter
    ? P extends keyof PRPCRouter
      ? P
      : never
    : never]: TRPCRouter[P] extends AnyRouter
    ? PRPCRouter[P] extends AnyPublicRoute
      ? PRPCRoute<TRPCRouter, TRPCRouter[P], false, PRPCRouter[P], P>
      : PRPCRoute<TRPCRouter, TRPCRouter[P], true, PRPCRouter[P], P>
    : never;
};

export type WhichRoute<TPresence extends boolean> = TPresence extends true
  ? AnyPresenceRoute
  : AnyPublicRoute;
export type AnyRoute = AnyPublicRoute | AnyPresenceRoute;
export type AnyPublicRoute = Omit<PRPCPublicRouteTRPC<any, any>, "_defs">;
export type AnyPresenceRoute = Omit<
  PRPCPresenceRouteTRPC<any, any, any>,
  "_defs"
>;

export type TRPCProcedures<TRouter extends any> = {
  [P in keyof TRouter as TRouter[P] extends AnyProcedure
    ? P
    : never]: TRouter[P];
};

export type TRPCRouters<TRouter extends any> = {
  [P in keyof TRouter as TRouter[P] extends AnyRouter ? P : never]: TRouter[P];
};

export type PRPCRoute<
  TRPCRouter extends AnyRouter,
  TRPCRoute extends AnyRouter,
  TPresence extends boolean,
  TRoute extends AnyRoute,
  TChannel extends keyof TRPCRouter
> = {
  useConnect: (
    id: Parameters<
      typeof useConnect<TPresence, TRPCRouter, TRPCRoute, TRoute, TChannel>
    >[0],
    options: Parameters<
      typeof useConnect<TPresence, TRPCRouter, TRPCRoute, TRoute, TChannel>
    >[1],
    binding: Parameters<
      typeof useConnect<TPresence, TRPCRouter, TRPCRoute, TRoute, TChannel>
    >[2],
    deps?: Parameters<
      typeof useConnect<TPresence, TRPCRouter, TRPCRoute, TRoute, TChannel>
    >[3]
  ) => ReturnType<
    typeof useConnect<TPresence, TRPCRouter, TRPCRoute, TRoute, TChannel>
  >;
};

export type InferRouteUser<T extends AnyRoute> = T extends Omit<
  PRPCPublicRouteTRPC<any, any>,
  "_defs"
>
  ? never
  : T extends Omit<PRPCPresenceRouteTRPC<any, infer U, any>, "_defs">
  ? U
  : never;

export type ConnectOptions<
  TPresence extends boolean,
  TUser extends ZodObject<any>
> = TPresence extends true
  ? {
      subscribeOnMount?: boolean;
      userDataOnAuth: Partial<z.infer<TUser>>;
    }
  : {
      subscribeOnMount: boolean;
    };

export type InternalConnect<TRPCRouter extends AnyRouter> = {
  channel_name: keyof TRPCRouters<TRPCRouter>;
};

export type AnyPresenceOptions = {
  subscribeOnMount?: true;
  userDataOnAuth: Record<string, string>;
};

export type PusherUser<T extends object> = {
  id: string;
  info: T;
};

export type TRPCRouterEvent<TRPCRouter extends AnyRouter> =
  keyof TRPCProcedures<TRPCRouter>;

export type InferEventOutput<
  TRPCRouter extends AnyRouter,
  TChannel extends keyof TRPCRouter,
  TEvent
> = TEvent extends keyof TRPCRouter[TChannel]
  ? inferRouterOutputs<TRPCRouter>[TChannel][TEvent]
  : never;
export type InferEventInput<
  TRPCRouter extends AnyRouter,
  TChannel extends keyof TRPCRouter,
  TEvent
> = TEvent extends keyof TRPCRouter[TChannel]
  ? Omit<inferRouterInputs<TRPCRouter>[TChannel][TEvent], "prpc">
  : never;
