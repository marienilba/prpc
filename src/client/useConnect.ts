import { AnyRouter } from "@trpc/server";
import { Channel, Members, PresenceChannel } from "pusher-js";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { PusherEvent } from "../shared/types";
import {
  PRPCResponse,
  parseChannelName,
  reproduceTRPCMutate,
  setChannelName,
} from "../shared/utils";
import {
  AnyPresenceOptions,
  AnyRoute,
  ConnectOptions,
  InferEventInput,
  InferEventOutput,
  InferRouteUser,
  InternalConnect,
  PusherUser,
  TRPCRouterEvent,
} from "./types";
import { usePRPC } from "./usePRPCContext";
import { listen, mute } from "./ws-interceptor";

export function useConnect<
  TPresence extends boolean = true,
  TRPCRouter extends AnyRouter = any,
  TRPCRoute extends AnyRouter = any,
  TRoute extends AnyRoute = any,
  TChannel extends keyof TRPCRouter = any
>(
  id: string,
  options: ConnectOptions<TPresence, InferRouteUser<TRoute>>,
  binding: () => void,
  deps: any[],
  internal: InternalConnect<TRPCRoute>
) {
  const { pusher, setAuth, api } = usePRPC();
  const { getQueryKey } = api[internal.channel_name];

  const isPresence = !!(options as ConnectOptions<true, any>).userDataOnAuth;
  const channel_name = setChannelName(
    isPresence ? "presence" : undefined,
    internal.channel_name,
    id
  );

  const socket_id = useRef<string>("");
  const [me, setMe] =
    useState<
      TPresence extends true
        ? PusherUser<z.infer<InferRouteUser<TRoute>>>
        : undefined
    >();
  const [members, setMembers] =
    useState<
      TPresence extends true
        ? { [id: string]: z.infer<InferRouteUser<TRoute>> }
        : undefined
    >();

  const [isSubscribe, setisSubscribe] = useState<boolean | undefined>();
  const [isSubscribeError, setSubscribeError] = useState<boolean | undefined>();
  const channel = useRef<Channel | PresenceChannel | undefined>();

  useEffect(() => {
    if (isPresence) {
      setAuth((options as AnyPresenceOptions).userDataOnAuth);
    }
    if (pusher) {
      if (options.subscribeOnMount) {
        subscribe();
        if (channel.current) {
          setisSubscribe(false);

          channel.current.bind(
            "pusher:subscription_succeeded",
            (members: Members) => {
              setisSubscribe(true);
              setMembers(members.members as any);
              setMe(members.me as any);
            }
          );

          channel.current.bind("pusher:subscription_error", () => {
            setisSubscribe(true);
            setSubscribeError(true);
          });
          if (isPresence) {
            channel.current.bind(
              "pusher:member_added",
              (user: PusherUser<z.infer<InferRouteUser<TRoute>>>) => {
                if (!user) {
                  return;
                }
                setMembers(
                  (members) => ({ ...members, [user.id]: user.info } as any)
                );
              }
            );

            channel.current.bind(
              "pusher:member_removed",
              (user: PusherUser<z.infer<InferRouteUser<TRoute>>>) => {
                if (!user) {
                  return;
                }
                setMembers((members) => {
                  members && delete members[user.id];
                  return { ...members } as any;
                });
              }
            );
          }
        }
      }
    }

    return () => {
      if (pusher && channel.current) {
        unsubscribe();
      }
    };
  }, [pusher]);

  useEffect(() => {
    // @TODO Find a proper way to get back socket_id
    listen((data: { event: string; data: any }) => {
      if (data.event === "pusher:connection_established") {
        socket_id.current = data.data.socket_id;
        mute();
      }
    });

    return () => {
      mute();
    };
  }, []);

  // Handle binding after channel and pusher are done
  useEffect(() => {
    let cleanup: any;
    if (isSubscribe) {
      cleanup = binding();
    }

    return () => {
      if (isSubscribe) {
        if (cleanup instanceof Function) {
          cleanup();
        }
      }
    };
  }, [isSubscribe, ...deps]);

  function bind<T extends string & (TRPCRouterEvent<TRPCRoute> | PusherEvent)>(
    event: T,
    callback: (
      data: T extends PusherEvent
        ? PusherUser<z.infer<InferRouteUser<TRoute>>>
        : InferEventOutput<TRPCRouter, TChannel, T>
    ) => void
  ) {
    channel.current?.bind(event, callback);
  }

  function unbind<
    T extends string & (TRPCRouterEvent<TRPCRoute> | PusherEvent)
  >(
    event: T,
    callback?: (data: InferEventOutput<TRPCRouter, TChannel, T>) => void
  ) {
    channel.current?.unbind(event, callback);
  }

  // @TODO Set to never when there's no data input on route
  async function send<T extends string & TRPCRouterEvent<TRPCRoute>>(
    event: T,
    data: InferEventInput<TRPCRouter, TChannel, T> | undefined = undefined,
    callback?: (
      result: PRPCResponse<
        InferEventOutput<TRPCRouter, TChannel, T> | undefined
      >
    ) => void
  ) {
    const input = {
      prpc: {
        channel_type: isPresence ? "presence" : "public",
        channel_id: id,
        channel_name: internal.channel_name,
        channel_event: event,
        socket_id: socket_id.current,
      },
      ...data,
    };

    if (isPresence) {
      (input.prpc as any)["me"] =
        me || (channel.current as PresenceChannel)?.members.me;
      (input.prpc as any)["members"] = (
        channel.current as PresenceChannel
      )?.members?.members;
    }

    const json = await (await reproduceTRPCMutate(getQueryKey, input)).json();

    if (callback && callback instanceof Function && json instanceof Array) {
      callback(
        new PRPCResponse<any>(json, {
          channel: parseChannelName(channel_name),
          user: me || (channel.current as PresenceChannel).members.me,
        })
      );
    }

    return;
  }

  function subscribe() {
    channel.current = pusher?.subscribe(channel_name);
  }
  function unsubscribe() {
    channel.current?.unsubscribe();
  }

  function unbind_all() {
    channel.current && channel.current.unbind_all();
  }

  return {
    me,
    members,
    isSubscribe,
    isSubscribeError,
    bind,
    unbind,
    send,
    subscribe,
    unsubscribe,
    unbind_all,
  };
}
