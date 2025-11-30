import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get the global feed count
export const getGlobalCount = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db.query("globalStats").first();
    return stats?.totalFeeds ?? 0;
  },
});

// Get a specific visitor's feed count
export const getVisitorCount = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const visitor = await ctx.db
      .query("visitors")
      .filter((q) => q.eq(q.field("visitorId"), args.visitorId))
      .first();
    return visitor?.count ?? 0;
  },
});

// Increment both the visitor's count and the global count
export const feedPlatypus = mutation({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    // Update or create visitor record
    const existingVisitor = await ctx.db
      .query("visitors")
      .filter((q) => q.eq(q.field("visitorId"), args.visitorId))
      .first();

    if (existingVisitor) {
      await ctx.db.patch(existingVisitor._id, {
        count: existingVisitor.count + 1,
      });
    } else {
      await ctx.db.insert("visitors", {
        visitorId: args.visitorId,
        count: 1,
      });
    }

    // Update or create global stats
    const globalStats = await ctx.db.query("globalStats").first();

    if (globalStats) {
      await ctx.db.patch(globalStats._id, {
        totalFeeds: globalStats.totalFeeds + 1,
      });
    } else {
      await ctx.db.insert("globalStats", {
        totalFeeds: 1,
      });
    }
  },
});
