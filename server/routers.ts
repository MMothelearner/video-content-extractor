import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { fetchVideoData } from "./tikhub";
import { 
  downloadVideo, 
  extractKeyFrames, 
  extractTextFromFrames, 
  analyzeFramesWithAI,
  generateContentSummary,
  cleanupTempFiles 
} from "./videoProcessor";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  video: router({
    // Start video analysis
    analyze: publicProcedure
      .input(z.object({
        videoUrl: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        const token = process.env.TIKHUB_API_TOKEN;
        if (!token) {
          throw new Error('TikHub API token not configured');
        }

        // Create initial analysis record (using fixed user ID 1 for personal tool)
        const analysis = await db.createVideoAnalysis({
          userId: 1,
          videoUrl: input.videoUrl,
          status: 'pending',
          progress: 0,
        });

        // Start async processing (don't await)
        processVideoAnalysis(analysis.id, input.videoUrl, token).catch((error: any) => {
          console.error(`[VideoAnalysis] Failed to process video ${analysis.id}:`, error);
          db.updateVideoAnalysis(analysis.id, {
            status: 'failed',
            errorMessage: error.message || 'Unknown error',
          });
        });

        return { analysisId: analysis.id };
      }),

    // Get analysis status and results
    getAnalysis: publicProcedure
      .input(z.object({
        analysisId: z.number(),
      }))
      .query(async ({ input }) => {
        const analysis = await db.getVideoAnalysisById(input.analysisId);
        
        if (!analysis) {
          throw new Error('Analysis not found');
        }
        
        return analysis;
      }),

    // Get user's analysis history
    getHistory: publicProcedure
      .query(async () => {
        // For personal tool, show all analyses (using fixed user ID 1)
        return db.getUserVideoAnalyses(1);
      }),

    // Delete analysis
    deleteAnalysis: publicProcedure
      .input(z.object({
        analysisId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const analysis = await db.getVideoAnalysisById(input.analysisId);
        
        if (!analysis) {
          throw new Error('Analysis not found');
        }
        
        // In a real app, you'd delete from database
        // For now, just mark as failed
        await db.updateVideoAnalysis(input.analysisId, {
          status: 'failed',
          errorMessage: 'Deleted by user',
        });
        
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;


/**
 * Background video processing function
 */
async function processVideoAnalysis(analysisId: number, videoUrl: string, token: string) {
  try {
    // Step 1: Fetch video metadata from TikHub
    await db.updateVideoAnalysis(analysisId, {
      status: 'downloading',
      progress: 10,
    });

    const { platform, data: videoData } = await fetchVideoData(videoUrl, token);
    
    // Extract metadata based on platform
    const metadata = extractMetadata(videoData, platform);
    
    await db.updateVideoAnalysis(analysisId, {
      platform,
      videoId: metadata.videoId,
      title: metadata.title,
      description: metadata.description,
      author: metadata.author,
      authorId: metadata.authorId,
      coverUrl: metadata.coverUrl,
      playUrl: metadata.playUrl,
      duration: metadata.duration,
      hashtags: metadata.hashtags,
      viewCount: metadata.viewCount,
      likeCount: metadata.likeCount,
      commentCount: metadata.commentCount,
      shareCount: metadata.shareCount,
      progress: 20,
    });

    // Step 2: Download video
    await db.updateVideoAnalysis(analysisId, {
      status: 'downloading',
      progress: 30,
    });

    const videoPath = await downloadVideo(metadata.playUrl, analysisId);
    
    await db.updateVideoAnalysis(analysisId, {
      progress: 40,
    });

    // Step 3: Extract key frames
    await db.updateVideoAnalysis(analysisId, {
      status: 'extracting',
      progress: 50,
    });

    const frames = await extractKeyFrames(videoPath, analysisId, metadata.duration);
    
    await db.updateVideoAnalysis(analysisId, {
      progress: 60,
    });

    // Step 4: OCR text extraction
    const ocrText = await extractTextFromFrames(frames);
    
    await db.updateVideoAnalysis(analysisId, {
      ocrText,
      progress: 70,
    });

    // Step 5: AI frame analysis
    await db.updateVideoAnalysis(analysisId, {
      status: 'analyzing',
      progress: 75,
    });

    const frameAnalysis = await analyzeFramesWithAI(frames, analysisId);
    
    await db.updateVideoAnalysis(analysisId, {
      frameAnalysis,
      progress: 85,
    });

    // Step 6: Generate summary
    const { summary, keyPoints } = await generateContentSummary(metadata, frameAnalysis, ocrText);
    
    await db.updateVideoAnalysis(analysisId, {
      contentSummary: summary,
      keyPoints,
      progress: 95,
    });

    // Step 7: Complete
    await db.updateVideoAnalysis(analysisId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
    });

    // Cleanup temp files
    await cleanupTempFiles(analysisId);

  } catch (error: any) {
    console.error(`[VideoAnalysis] Processing failed for ${analysisId}:`, error);
    await db.updateVideoAnalysis(analysisId, {
      status: 'failed',
      errorMessage: error.message || 'Processing failed',
    });
    
    // Cleanup temp files even on error
    await cleanupTempFiles(analysisId);
  }
}

/**
 * Extract metadata from platform-specific video data
 */
function extractMetadata(videoData: any, platform: string) {
  // This is a simplified version - you'd need to handle each platform's data structure
  if (platform === 'douyin' || platform === 'tiktok') {
    const aweme = videoData.aweme_detail || videoData;
    return {
      videoId: aweme.aweme_id || '',
      title: aweme.desc || '',
      description: aweme.desc || '',
      author: aweme.author?.nickname || '',
      authorId: aweme.author?.unique_id || '',
      coverUrl: aweme.video?.cover?.url_list?.[0] || '',
      playUrl: aweme.video?.play_addr?.url_list?.[0] || aweme.video?.download_addr?.url_list?.[0] || '',
      duration: aweme.video?.duration || 0,
      hashtags: aweme.text_extra?.map((tag: any) => tag.hashtag_name).filter(Boolean) || [],
      viewCount: aweme.statistics?.play_count || 0,
      likeCount: aweme.statistics?.digg_count || 0,
      commentCount: aweme.statistics?.comment_count || 0,
      shareCount: aweme.statistics?.share_count || 0,
    };
  } else if (platform === 'youtube') {
    return {
      videoId: videoData.videoDetails?.videoId || '',
      title: videoData.videoDetails?.title || '',
      description: videoData.videoDetails?.shortDescription || '',
      author: videoData.videoDetails?.author || '',
      authorId: videoData.videoDetails?.channelId || '',
      coverUrl: videoData.videoDetails?.thumbnail?.thumbnails?.[0]?.url || '',
      playUrl: videoData.streamingData?.formats?.[0]?.url || '',
      duration: parseInt(videoData.videoDetails?.lengthSeconds || '0'),
      hashtags: [],
      viewCount: parseInt(videoData.videoDetails?.viewCount || '0'),
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
    };
  } else if (platform === 'xiaohongshu') {
    const note = videoData.note_info || videoData;
    return {
      videoId: note.note_id || '',
      title: note.title || note.desc || '',
      description: note.desc || '',
      author: note.user?.nickname || note.user?.nick_name || '',
      authorId: note.user?.user_id || '',
      coverUrl: note.image_list?.[0]?.url_default || note.cover?.url_default || '',
      playUrl: note.video?.media?.stream?.h264?.[0]?.master_url || note.video?.consumer?.origin_video_key || '',
      duration: note.video?.consumer?.video_duration || 0,
      hashtags: note.tag_list?.map((tag: any) => tag.name).filter(Boolean) || [],
      viewCount: note.interact_info?.view_count || 0,
      likeCount: note.interact_info?.liked_count || 0,
      commentCount: note.interact_info?.comment_count || 0,
      shareCount: note.interact_info?.share_count || 0,
    };
  } else if (platform === 'bilibili') {
    const video = videoData.View || videoData;
    return {
      videoId: video.bvid || video.aid?.toString() || '',
      title: video.title || '',
      description: video.desc || '',
      author: video.owner?.name || '',
      authorId: video.owner?.mid?.toString() || '',
      coverUrl: video.pic || '',
      playUrl: video.durl?.[0]?.url || video.dash?.video?.[0]?.baseUrl || '',
      duration: video.duration || 0,
      hashtags: [],
      viewCount: video.stat?.view || 0,
      likeCount: video.stat?.like || 0,
      commentCount: video.stat?.reply || 0,
      shareCount: video.stat?.share || 0,
    };
  }
  
  // Default fallback
  return {
    videoId: '',
    title: '',
    description: '',
    author: '',
    authorId: '',
    coverUrl: '',
    playUrl: '',
    duration: 0,
    hashtags: [],
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
  };
}
