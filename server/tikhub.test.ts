import { describe, expect, it } from "vitest";
import { detectPlatform, fetchVideoData } from "./tikhub";

describe("TikHub API Integration", () => {
  it("should detect platform from URL correctly", () => {
    expect(detectPlatform("https://www.douyin.com/video/123456")).toBe("douyin");
    expect(detectPlatform("https://www.tiktok.com/@user/video/123456")).toBe("tiktok");
    expect(detectPlatform("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("youtube");
    expect(detectPlatform("https://youtu.be/dQw4w9WgXcQ")).toBe("youtube");
    expect(detectPlatform("https://www.xiaohongshu.com/explore/123456")).toBe("xiaohongshu");
    expect(detectPlatform("https://www.bilibili.com/video/BV123456")).toBe("bilibili");
    expect(detectPlatform("https://invalid-url.com")).toBe(null);
  });

  it("should validate TikHub API token with a real API call", async () => {
    const token = process.env.TIKHUB_API_TOKEN;
    
    if (!token) {
      throw new Error("TIKHUB_API_TOKEN environment variable is not set");
    }

    // Use a known public Douyin video URL for testing
    // This is a minimal test to verify the token works
    const testUrl = "https://www.douyin.com/video/7448118827402972455";
    
    try {
      const result = await fetchVideoData(testUrl, token);
      
      // If we get here without throwing, the token is valid
      expect(result).toBeDefined();
      expect(result.platform).toBe("douyin");
      expect(result.data).toBeDefined();
    } catch (error: any) {
      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error("Invalid TikHub API token - authentication failed");
      }
      
      // Other errors might be network issues or video not found, which is acceptable for this test
      // As long as we got a response from the API, the token is likely valid
      if (error.response?.status) {
        // Got a response from API, token is valid even if video fetch failed
        expect(error.response.status).not.toBe(401);
        expect(error.response.status).not.toBe(403);
      } else {
        // Network error or other issue
        throw error;
      }
    }
  }, 30000); // 30 second timeout for API call
});
