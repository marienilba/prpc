




# **pRPC**

A way to link [tRPC](https://github.com/trpc/trpc) and [pusherJS](https://github.com/pusher/pusher-js)

## Install

    npm install @marienilba/prpc

## Example

   ```typescript
// server.ts
import { initPRPC } from "@marienilba/prpc";
import Pusher from "pusher";
import superjson from "superjson";
import { z } from "zod";
import { createTRPCContext, protectedProcedure } from "./trpc";
   
export const pusherClient = new Pusher({
	  appId: process.env.PUSHER_APP_ID,
	  cluster: process.env.PUSHER_CLUSTER,
	  key: process.env.PUSHER_KEY,
	  secret: process.env.PUSHER_SECRET,
	});

const p = initPRPC.context().create({
	  pusher: pusherClient,
	  transformer: superjson,
	  context: createTRPCContext,
	});

export const prpc = p.createPRPCRouter({
	  game: p
	    .presenceRoute({
	      procedure: protectedProcedure,
	      user: z.object({
	        id: z.string(),
	        name: z.string(),
	        image: z.string(),
	        isHost: z.boolean(),
	      }),
	    })
	    .auth(async ({ ctx, data }) => {
	      return {
	        id: ctx.session?.user?.id || "",
	        name: ctx.session?.user?.name || "",
	        image: ctx.session?.user?.image || "",
	        isHost: data.isHost || false,
	      };
	    }),
	});

export type PRPCRouter = typeof prpc;
   ```
## 

```typescript
// trpc/routes/prpc.ts
import { prpc } from "server/api/prpc";
import { createTRPCRouter, enforceUserIsHost } from "server/api/trpc";
import { z } from "zod";
 
export const prpcRouter = createTRPCRouter({
  join: prpc.game
    .data(
      z.object({
        joined: z.boolean(),
      })
    )
    .trigger(async ({ ctx, input }) => {
      return await ctx.pusher.trigger({
        joined: input.joined,
        user: input.prpc.me,
      });
    }),
  });
```
## 
  

   ```typescript
// client.ts
   import { createPRPCNext } from "@marienilba/prpc";
   import { PRPCRouter } from "server/api/prpc";
   import { AppRouter } from "../server/api/root";
   import { api } from "./api";
     
   export const prpc = createPRPCNext<AppRouter["party"], PRPCRouter>(api.party, {
     app_key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
     options: {
       authEndpoint: "/api/prpc/",
       cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
     },
     log: process.env.NODE_ENV !== "production" && typeof window !== "undefined",
   });
   ```

  ## 
 

   ```typescript
   // index.ts
   const App = () => {
     return (
       <prpc.withPRPC {...prpc.context}>
         <...>
       </prpc.withPRPC>
     );
   };
   ```

  ## 

   ```typescript
   // page.ts
   const { send, bind, members, unbind_all, me } = prpc.game.useConnect(
       id,
       {
         subscribeOnMount: true,
         userDataOnAuth: {
           isHost: false,
         },
       },
       () => {
         bind("pusher:member_removed", (member) => {
         });
   
         bind("join", ({ joined, user }) => {
         });
   
         return () => {
           unbind_all();
         };
       },
       []
     );

   send("join", { joined: !isJoined });
   ```

## NextJS 

 
```typescript
// api/prpc/[prpc].ts
import { createNextApiHandler, createNextWehbookApiHandler } from "@marienilba/prpc";
import { prpc } from "@server/api/prpc";

const webhooks = createNextWehbookApiHandler<typeof prpc>({
  presence: async (data, ctx) => {
    if (data.name === "member_removed") {
      console.log(
        `Member ${data.user_id} removed from ${data.channel.channel}`
      );
    }
  },
});
   
export default createNextApiHandler({
  router: prpc,
  webhooks,
  onError:
    process.env.NODE_ENV === "development"
      ? ({ channel_name, message }) => {
          console.error(
            `❌  failed on ${channel_name ?? "<no-path>"}: ${message}`
          );
        }
      : undefined,
});
```
