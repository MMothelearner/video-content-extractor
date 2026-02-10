import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { fetchVideoData } from "./tikhub";
import { 
  downloadVideo, 
  extractAudioFromVideo,
  transcribeVideoAudio,
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
      progress: 25,
    });

    // Step 3: Extract audio from video
    await db.updateVideoAnalysis(analysisId, {
      status: 'extracting',
      progress: 30,
    });

    const audioPath = await extractAudioFromVideo(videoPath, analysisId);
    
    await db.updateVideoAnalysis(analysisId, {
      progress: 35,
    });

    // Step 4: Transcribe audio to text (ASR)
    await db.updateVideoAnalysis(analysisId, {
      status: 'analyzing',
      progress: 40,
    });

    let transcript = '';
    let transcriptLanguage = '';
    try {
      const transcriptionResult = await transcribeVideoAudio(audioPath);
      transcript = transcriptionResult.text;
      transcriptLanguage = transcriptionResult.language;
      
      await db.updateVideoAnalysis(analysisId, {
        transcript,
        transcriptLanguage,
        progress: 55,
      });
      
      console.log(`[VideoAnalysis] Transcription completed: ${transcript.length} chars in ${transcriptLanguage}`);
    } catch (error: any) {
      console.error(`[VideoAnalysis] Transcription failed for ${analysisId}:`, error);
      // Continue processing even if transcription fails
      await db.updateVideoAnalysis(analysisId, {
        progress: 55,
      });
    }

    // Step 5: Extract key frames
    await db.updateVideoAnalysis(analysisId, {
      status: 'extracting',
      progress: 60,
    });

    const frames = await extractKeyFrames(videoPath, analysisId, metadata.duration);
    
    await db.updateVideoAnalysis(analysisId, {
      progress: 65,
    });

    // Step 6: OCR text extraction
    const ocrText = await extractTextFromFrames(frames);
    
    await db.updateVideoAnalysis(analysisId, {
      ocrText,
      progress: 70,
    });

    // Step 7: AI frame analysis
    await db.updateVideoAnalysis(analysisId, {
      status: 'analyzing',
      progress: 75,
    });

    const frameAnalysis = await analyzeFramesWithAI(frames, analysisId);
    
    await db.updateVideoAnalysis(analysisId, {
      frameAnalysis,
      progress: 85,
    });

    // Step 8: Generate summary (using transcript if available)
    const { summary, keyPoints } = await generateContentSummary(metadata, frameAnalysis, ocrText, transcript);
    
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
    // Handle multiple possible data structures from Xiaohongshu API
    const note = videoData.note_info || videoData.data?.note_info || videoData;
    console.log('[Metadata] Xiaohongshu data structure:', JSON.stringify(note, null, 2).substring(0, 500));
    
    // Try multiple possible paths for video URL
    let playUrl = '';
    if (note.video) {
      playUrl = note.video.media?.stream?.h264?.[0]?.master_url 
        || note.video.media?.stream?.h264?.[0]?.backup_urls?.[0]
        || note.video.consumer?.origin_video_key
        || note.video.url
        || '';
    }
    
    return {
      videoId: note.note_id || note.id || '',
      title: note.title || note.desc || note.description || '',
      description: note.desc || note.description || '',
      author: note.user?.nickname || note.user?.nick_name || note.author?.nickname || '',
      authorId: note.user?.user_id || note.user?.id || '',
      coverUrl: note.image_list?.[0]?.url_default || note.cover?.url_default || note.images?.[0] || '',
      playUrl,
      duration: Math.floor((note.video?.consumer?.video_duration || note.video?.duration || 0) / 1000), // Convert ms to seconds
      hashtags: note.tag_list?.map((tag: any) => tag.name || tag.tag_name).filter(Boolean) || [],
      viewCount: note.interact_info?.view_count || note.view_count || 0,
      likeCount: note.interact_info?.liked_count || note.like_count || 0,
      commentCount: note.interact_info?.comment_count || note.comment_count || 0,
      shareCount: note.interact_info?.share_count || note.share_count || 0,
    };
  } else if (platform === 'bilibili') {
    // Handle multiple possible data structures from Bilibili API
    const video = videoData.View || videoData.data?.View || videoData;
    console.log('[Metadata] Bilibili data structure:', JSON.stringify(video, null, 2).substring(0, 500));
    
    // Try multiple possible paths for video URL
    // Note: Bilibili video URLs often require authentication and may not be directly accessible
    // The playUrl might need to be fetched through a separate API call
    let playUrl = '';
    if (video.durl && video.durl.length > 0) {
      playUrl = video.durl[0].url;
    } else if (video.dash?.video && video.dash.video.length > 0) {
      // DASH format - prefer highest quality
      playUrl = video.dash.video[0].baseUrl || video.dash.video[0].base_url;
    }
    
    return {
      videoId: video.bvid || video.aid?.toString() || '',
      title: video.title || '',
      description: video.desc || video.dynamic || '',
      author: video.owner?.name || video.author || '',
      authorId: video.owner?.mid?.toString() || '',
      coverUrl: video.pic || video.cover || '',
      playUrl,
      duration: video.duration || 0,
      hashtags: video.tag?.split(',').filter(Boolean) || [],
      viewCount: video.stat?.view || video.view || 0,
      likeCount: video.stat?.like || video.like || 0,
      commentCount: video.stat?.reply || video.reply || 0,
      shareCount: video.stat?.share || video.share || 0,
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
