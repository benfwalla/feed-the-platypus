import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Track individual visitor feed counts
  visitors: defineTable({
    visitorId: v.string(),
    count: v.number(),
  }),
  // Global counter for all feeds worldwide
  globalStats: defineTable({
    totalFeeds: v.number(),
  }),
});
