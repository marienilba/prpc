import Pusher from "pusher-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DEFAULT_API_ENDPOINT } from "../shared/utils";
import { PusherContextOptions } from "./types";
export const PRPCContext = createContext<
  | {
      pusher: Pusher | undefined;
      setAuth: (params: Record<string, string>) => void;
      api: any;
    }
  | undefined
>(undefined);

export const usePRPCContext = (props: any) => {
  const { opts, api, log } = props as {
    opts: {
      app_key: string;
      options: PusherContextOptions;
    };
    api: any;
    log?: boolean;
  };

  Pusher.logToConsole = true;

  const auth = useRef<Record<string, string>>({});
  const pusher = useRef<Pusher | undefined>();
  const [, triggerUpdate] = useState(0);
  useEffect(() => {
    pusher.current = new Pusher(opts.app_key, {
      ...opts.options,
      authEndpoint:
        (opts.options.authEndpoint ?? DEFAULT_API_ENDPOINT) + "auth",
      channelAuthorization: {
        endpoint: (opts.options.authEndpoint ?? DEFAULT_API_ENDPOINT) + "auth",
        transport: "ajax",
        paramsProvider() {
          return auth.current;
        },
      },
    });
    triggerUpdate((t) => t + 1);
  }, []);

  const setAuth = useCallback((params: Record<string, string>) => {
    auth.current = params;
  }, []);

  const value = {
    pusher: pusher.current,
    setAuth: setAuth,
    api: api,
  };

  return <PRPCContext.Provider value={value} {...props} />;
};

export const usePRPC = () => {
  const context = useContext(PRPCContext);
  if (context === undefined) {
    throw new Error(`usePRPCContext must be used within a PRPCContext.`);
  }
  return context;
};
