import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Video analysis tasks table
 * Stores information about each video analysis request
 */
export const videoAnalyses = mysqlTable("video_analyses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Foreign key to users table
  
  // Video source information
  videoUrl: text("videoUrl").notNull(), // Original video URL provided by user
  platform: varchar("platform", { length: 64 }), // Platform name (douyin, tiktok, youtube, etc.)
  videoId: varchar("videoId", { length: 255 }), // Platform-specific video ID
  
  // Video metadata from TikHub API
  title: text("title"),
  description: text("description"),
  author: varchar("author", { length: 255 }),
  authorId: varchar("authorId", { length: 255 }),
  coverUrl: text("coverUrl"),
  playUrl: text("playUrl"), // High quality video play URL
  duration: int("duration"), // Video duration in seconds
  hashtags: json("hashtags").$type<string[]>(), // Array of hashtags
  
  // Statistics
  viewCount: bigint("viewCount", { mode: "number" }),
  likeCount: bigint("likeCount", { mode: "number" }),
  commentCount: bigint("commentCount", { mode: "number" }),
  shareCount: bigint("shareCount", { mode: "number" }),
  
  // Analysis status and results
  status: mysqlEnum("status", ["pending", "downloading", "extracting", "analyzing", "completed", "failed"]).default("pending").notNull(),
  progress: int("progress").default(0), // Progress percentage (0-100)
  errorMessage: text("errorMessage"), // Error message if failed
  
  // Analysis results
  subtitles: text("subtitles"), // Video subtitles if available
  transcript: text("transcript"), // Speech-to-text transcript from audio
  transcriptLanguage: varchar("transcriptLanguage", { length: 10 }), // Detected language of transcript
  ocrText: text("ocrText"), // Text extracted from video frames via OCR
  frameAnalysis: json("frameAnalysis").$type<Array<{
    timestamp: number;
    frameUrl: string;
    description: string;
    objects: string[];
    scene: string;
  }>>(), // AI analysis of key frames
  
  // Summary and insights
  contentSummary: text("contentSummary"), // Overall content summary
  keyPoints: json("keyPoints").$type<string[]>(), // Key points extracted
  
  // Storage
  videoFileKey: varchar("videoFileKey", { length: 512 }), // S3 key for downloaded video
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type VideoAnalysis = typeof videoAnalyses.$inferSelect;
export type InsertVideoAnalysis = typeof videoAnalyses.$inferInsert;
