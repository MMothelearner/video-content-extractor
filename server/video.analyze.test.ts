import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("video.analyze", () => {
  it("should work without authentication (personal tool mode)", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    // Should not throw authentication error
    const result = await caller.video.analyze({ 
      videoUrl: "https://www.douyin.com/video/7448118827402972455" 
    });
    
    expect(result).toBeDefined();
    expect(result.analysisId).toBeGreaterThan(0);
  }, 10000);

  it("should reject invalid URLs", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.video.analyze({ videoUrl: "not-a-valid-url" })
    ).rejects.toThrow();
  });

  it("should create analysis record for valid URL", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Use a valid Douyin URL for testing
    const result = await caller.video.analyze({
      videoUrl: "https://www.douyin.com/video/7448118827402972455",
    });

    expect(result).toBeDefined();
    expect(result.analysisId).toBeGreaterThan(0);
  }, 10000); // 10 second timeout for database operations
});

describe("video.getHistory", () => {
  it("should work without authentication (personal tool mode)", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    // Should not throw authentication error
    const history = await caller.video.getHistory();
    expect(Array.isArray(history)).toBe(true);
  }, 10000);

  it("should return user's analysis history", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const history = await caller.video.getHistory();

    expect(Array.isArray(history)).toBe(true);
  }, 10000);
});
