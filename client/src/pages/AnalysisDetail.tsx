
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Loader2, ArrowLeft, Video, User, Hash, Eye, Heart, MessageCircle, Share2, Clock, FileText, Image as ImageIcon, Sparkles, Download } from "lucide-react";

import { toast } from "sonner";

export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const analysisId = parseInt(id || "0");

  const { data: analysis, isLoading, error, refetch } = trpc.video.getAnalysis.useQuery(
    { analysisId },
    {
      enabled: analysisId > 0,
      refetchInterval: (query) => {
        // Auto-refresh every 3 seconds if status is not completed or failed
        const data = query.state.data;
        if (data?.status && !['completed', 'failed'].includes(data.status)) {
          return 3000;
        }
        return false;
      },
    }
  );

  // No auth check needed for personal tool

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>加载失败</CardTitle>
            <CardDescription>{error?.message || "无法加载分析结果"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")}>返回首页</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusText = {
    pending: "等待中",
    downloading: "下载视频中",
    extracting: "提取关键帧中",
    analyzing: "AI 分析中",
    completed: "分析完成",
    failed: "分析失败",
  }[analysis.status] || "未知状态";

  const isProcessing = !['completed', 'failed'].includes(analysis.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            <span className="font-semibold">视频分析详情</span>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-5xl">
        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>分析状态</CardTitle>
              <Badge variant={analysis.status === 'completed' ? 'default' : analysis.status === 'failed' ? 'destructive' : 'secondary'}>
                {statusText}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">进度</span>
                  <span className="font-medium">{analysis.progress}%</span>
                </div>
                <Progress value={analysis.progress} className="h-2" />
              </div>
              
              {analysis.errorMessage && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {analysis.errorMessage}
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在处理，请稍候...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Video Metadata */}
        {analysis.title && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                视频信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis.coverUrl && (
                <img 
                  src={analysis.coverUrl} 
                  alt="视频封面" 
                  className="w-full rounded-lg object-cover max-h-64"
                />
              )}
              
              <div>
                <h3 className="font-semibold text-lg mb-2">{analysis.title}</h3>
                {analysis.description && (
                  <p className="text-muted-foreground text-sm">{analysis.description}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {analysis.author && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{analysis.author}</span>
                  </div>
                )}
                {analysis.duration && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{Math.floor(analysis.duration / 60)}:{(analysis.duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                )}
                {analysis.platform && (
                  <Badge variant="outline">{analysis.platform}</Badge>
                )}
              </div>

              {((analysis.viewCount && analysis.viewCount > 0) || (analysis.likeCount && analysis.likeCount > 0) || (analysis.commentCount && analysis.commentCount > 0) || (analysis.shareCount && analysis.shareCount > 0)) && (
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {analysis.viewCount && analysis.viewCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4" />
                      <span>{analysis.viewCount.toLocaleString()}</span>
                    </div>
                  )}
                  {analysis.likeCount && analysis.likeCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-4 h-4" />
                      <span>{analysis.likeCount.toLocaleString()}</span>
                    </div>
                  )}
                  {analysis.commentCount && analysis.commentCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4" />
                      <span>{analysis.commentCount.toLocaleString()}</span>
                    </div>
                  )}
                  {analysis.shareCount && analysis.shareCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Share2 className="w-4 h-4" />
                      <span>{analysis.shareCount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {analysis.hashtags && analysis.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {analysis.hashtags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      <Hash className="w-3 h-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Video Transcript */}
        {analysis.transcript && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                视频文案
              </CardTitle>
              <CardDescription>
                从视频语音中提取的完整文字稿
                {analysis.transcriptLanguage && (
                  <span className="ml-2">
                    · 语言: {analysis.transcriptLanguage}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {analysis.transcript}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Summary */}
        {analysis.contentSummary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                内容摘要
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{analysis.contentSummary}</p>
              
              {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-sm">关键要点：</h4>
                  <ul className="space-y-1.5">
                    {analysis.keyPoints.map((point, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Frame Analysis */}
        {analysis.frameAnalysis && analysis.frameAnalysis.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                画面分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {analysis.frameAnalysis.map((frame, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <img 
                        src={frame.frameUrl} 
                        alt={`关键帧 ${i + 1}`}
                        className="w-full rounded-lg object-cover"
                      />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{frame.timestamp}s</Badge>
                          <span className="text-xs text-muted-foreground">{frame.scene}</span>
                        </div>
                        <p className="text-sm">{frame.description}</p>
                        {frame.objects && frame.objects.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {frame.objects.map((obj, j) => (
                              <Badge key={j} variant="secondary" className="text-xs">
                                {obj}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* OCR Text */}
        {analysis.ocrText && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                文字识别 (OCR)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
                {analysis.ocrText}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
