using WorkerServiceRaMedia.Models;
using WorkerServiceRaMedia.Observability;

namespace WorkerServiceRaMedia.Services;

public sealed class MediaTranscodeWorkerService(
    IMediaStorageService storage,
    IFfmpegTranscodeService ffmpeg,
    IRedisService redis,
    IWorkerCallbackClient callbackClient,
    IConfiguration configuration,
    ILogger<MediaTranscodeWorkerService> logger
) : IMediaTranscodeWorkerService
{
    public async Task ProcessJobAsync(MediaTranscodeJob job, CancellationToken cancellationToken)
    {
        var workRoot = GetJobWorkingDirectory(job.JobId);
        var sourceDirectory = Path.Combine(workRoot, "source");
        var outputDirectory = Path.Combine(workRoot, "output");

        WorkerMetrics.JobsStarted.Inc();
        WorkerMetrics.ActiveJobs.Inc();

        try
        {
            ResetDirectory(workRoot);

            await PublishProgressSafeAsync(job, "download", 5, "Baixando original do storage");
            var sourcePath = await storage.DownloadAsync(job.StorageKey, sourceDirectory, cancellationToken);

            await PublishProgressSafeAsync(job, "transcoding", 15, "Preparando FFmpeg");
            var output = await ffmpeg.TranscodeAsync(
                job,
                sourcePath,
                outputDirectory,
                progress => PublishProgressSafeAsync(job, progress.Stage, progress.ProgressPercentage, progress.Message),
                cancellationToken
            );

            await PublishProgressSafeAsync(job, "upload", 92, "Enviando artefatos processados");
            foreach (var file in output.OutputFiles)
            {
                var fileName = Path.GetFileName(file);
                var objectKey = $"{MediaOutputPaths.OutputPrefix(job.UserId, job.JobId)}/{fileName}";
                await storage.UploadFileAsync(file, objectKey, MediaOutputPaths.ContentTypeForPath(file), cancellationToken);
            }

            var playbackUrl = storage.GetPublicUrl(output.PlaybackObjectKey);
            var coverUrl = output.CoverObjectKey is null ? null : storage.GetPublicUrl(output.CoverObjectKey);
            await callbackClient.NotifyCompletedAsync(job.JobId, playbackUrl, coverUrl, output.DurationSec, cancellationToken);
            await PublishCompletedSafeAsync(job, playbackUrl, coverUrl, output.DurationSec);

            WorkerMetrics.JobsCompleted.Inc();
            logger.LogInformation("Job {JobId} completed with playback URL {PlaybackUrl}", job.JobId, playbackUrl);
        }
        catch (Exception ex)
        {
            WorkerMetrics.JobsFailed.Inc();
            logger.LogError(ex, "Job {JobId} failed", job.JobId);

            try
            {
                await callbackClient.NotifyFailedAsync(job.JobId, ex.Message, CancellationToken.None);
            }
            catch (Exception callbackEx)
            {
                logger.LogWarning(callbackEx, "Failed to notify API about failed job {JobId}", job.JobId);
            }

            await PublishFailedSafeAsync(job, ex.Message);
            throw;
        }
        finally
        {
            WorkerMetrics.ActiveJobs.Dec();
            TryDeleteDirectory(workRoot);
        }
    }

    private async Task PublishProgressSafeAsync(MediaTranscodeJob job, string stage, decimal progress, string message)
    {
        try
        {
            await redis.PublishProgressAsync(new JobProgressEvent
            {
                JobId = job.JobId,
                UserId = job.UserId,
                Stage = stage,
                ProgressPercentage = Math.Clamp(progress, 0m, 100m),
                Message = message,
                Timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to publish Redis progress for job {JobId}", job.JobId);
        }
    }

    private async Task PublishCompletedSafeAsync(MediaTranscodeJob job, string playbackUrl, string? coverUrl, int? durationSec)
    {
        try
        {
            await redis.PublishCompletedAsync(new JobCompletedEvent
            {
                JobId = job.JobId,
                UserId = job.UserId,
                PlaybackUrl = playbackUrl,
                CoverUrl = coverUrl,
                DurationSec = durationSec,
                Timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to publish Redis completion for job {JobId}", job.JobId);
        }
    }

    private async Task PublishFailedSafeAsync(MediaTranscodeJob job, string errorMessage)
    {
        try
        {
            await redis.PublishFailedAsync(new JobFailedEvent
            {
                JobId = job.JobId,
                UserId = job.UserId,
                ErrorMessage = errorMessage,
                Timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to publish Redis failure for job {JobId}", job.JobId);
        }
    }

    private string GetJobWorkingDirectory(string jobId)
    {
        var configured = configuration.GetValue<string>("Ffmpeg:WorkingDirectory");
        var root = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(Path.GetTempPath(), "ra-media-worker")
            : configured;

        return Path.Combine(root, jobId);
    }

    private static void ResetDirectory(string directory)
    {
        TryDeleteDirectory(directory);
        Directory.CreateDirectory(directory);
    }

    private static void TryDeleteDirectory(string directory)
    {
        try
        {
            if (Directory.Exists(directory))
            {
                Directory.Delete(directory, recursive: true);
            }
        }
        catch
        {
            // best-effort cleanup only
        }
    }
}
