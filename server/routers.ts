import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { phoneAuthRouter } from "./routers/phoneAuth";
import { publicProcedure, router } from "./_core/trpc";
import { restaurantsRouter } from "./routers/restaurants";
import { ordersRouter } from "./routers/orders";
import { driversRouter } from "./routers/drivers";
import { notificationsRouter, usersRouter } from "./routers/notifications";
import { uploadRouter } from "./routers/upload";
import { citiesRouter } from "./routers/cities";
import { driverRequestsRouter } from "./routers/driverRequests";
import { roundsRouter } from "./routers/rounds";
import { settingsRouter } from "./routers/settings";
import { googlePlacesRouter } from "./routers/googlePlaces";
import { bannersRouter } from "./routers/banners";
import { ratingsRouter } from "./routers/ratings";
import { governmentRouter } from "./routers/government";
import { shopperRouter } from "./routers/shopper";
import { coverageZonesRouter } from "./routers/coverageZones";
import { cityPolygonsRouter } from "./routers/cityPolygons";
import { placeExploreRouter } from "./routers/placeExplore";
import { shopperChatRouter } from "./routers/shopperChat";

export const appRouter = router({
  system: systemRouter,
  phoneAuth: phoneAuthRouter,
  driverRequests: driverRequestsRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  restaurants: restaurantsRouter,
  orders: ordersRouter,
  drivers: driversRouter,
  notifications: notificationsRouter,
  users: usersRouter,
  upload: uploadRouter,
  cities: citiesRouter,
  rounds: roundsRouter,
  settings: settingsRouter,
  googlePlaces: googlePlacesRouter,
  banners: bannersRouter,
  ratings: ratingsRouter,
  government: governmentRouter,
  shopper: shopperRouter,
  coverageZones: coverageZonesRouter,
  cityPolygons: cityPolygonsRouter,
  placeExplore: placeExploreRouter,
  shopperChat: shopperChatRouter,
});

export type AppRouter = typeof appRouter;
