using System.Diagnostics;
using System.Globalization;
using Microsoft.Extensions.Options;
using WorkerServiceRaMedia.Models;

namespace WorkerServiceRaMedia.Services;

public sealed class FfmpegTranscodeService(
    IOptions<FfmpegOptions> options,
    ILogger<FfmpegTranscodeService> logger
) : IFfmpegTranscodeService
{
    private readonly FfmpegOptions _options = options.Value;

    public async Task<TranscodeOutput> TranscodeAsync(
        MediaTranscodeJob job,
        string sourcePath,
        string outputDirectory,
        Func<TranscodeProgress, Task> onProgress,
        CancellationToken cancellationToken
    )
    {
        Directory.CreateDirectory(outputDirectory);

        var duration = await ProbeDurationAsync(sourcePath, cancellationToken);
        var playbackObjectKey = MediaOutputPaths.PlaybackObjectKey(job.UserId, job.JobId, job.MediaType);

        if (job.IsVideo)
        {
            var playlistPath = Path.Combine(outputDirectory, "index.m3u8");
            var segmentPattern = Path.Combine(outputDirectory, "segment_%03d.ts");
            var args =
                $"-y -i {Quote(sourcePath)} -map 0:v:0 -map 0:a? -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename {Quote(segmentPattern)} {Quote(playlistPath)} -progress pipe:1 -nostats";

            await RunFfmpegAsync(args, duration, onProgress, cancellationToken);
            await onProgress(new TranscodeProgress("thumbnail", 90, "Gerando cover do video"));
            var coverPath = await TryGenerateVideoCoverAsync(sourcePath, outputDirectory, cancellationToken);
            var files = Directory.GetFiles(outputDirectory).OrderBy(path => path, StringComparer.OrdinalIgnoreCase).ToArray();

            return new TranscodeOutput(
                playlistPath,
                playbackObjectKey,
                coverPath is null ? null : MediaOutputPaths.CoverObjectKey(job.UserId, job.JobId),
                ToDurationSeconds(duration),
                files
            );
        }

        if (job.IsAudio)
        {
            var playlistPath = Path.Combine(outputDirectory, "index.m3u8");
            var segmentPattern = Path.Combine(outputDirectory, "segment_%03d.ts");
            var args =
                $"-y -i {Quote(sourcePath)} -vn -c:a aac -b:a 128k -f hls -hls_time 6 -hls_playlist_type vod -hls_segment_filename {Quote(segmentPattern)} {Quote(playlistPath)} -progress pipe:1 -nostats";

            await RunFfmpegAsync(args, duration, onProgress, cancellationToken);
            var files = Directory.GetFiles(outputDirectory).OrderBy(path => path, StringComparer.OrdinalIgnoreCase).ToArray();

            return new TranscodeOutput(
                playlistPath,
                playbackObjectKey,
                null,
                ToDurationSeconds(duration),
                files
            );
        }

        throw new InvalidOperationException($"Unsupported media type: {job.MediaType}");
    }

    public static decimal? TryParseProgressPercentage(string line, TimeSpan? duration)
    {
        if (duration is null || duration.Value.TotalMilliseconds <= 0)
        {
            return null;
        }

        const string prefix = "out_time_ms=";
        if (!line.StartsWith(prefix, StringComparison.Ordinal))
        {
            return null;
        }

        if (!decimal.TryParse(line[prefix.Length..], NumberStyles.Number, CultureInfo.InvariantCulture, out var microseconds))
        {
            return null;
        }

        var totalMicroseconds = (decimal)duration.Value.TotalSeconds * 1_000_000m;
        if (totalMicroseconds <= 0)
        {
            return null;
        }

        var percent = microseconds / totalMicroseconds * 100m;
        return Math.Clamp(percent, 0m, 100m);
    }

    private async Task RunFfmpegAsync(
        string arguments,
        TimeSpan? duration,
        Func<TranscodeProgress, Task> onProgress,
        CancellationToken cancellationToken
    )
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = _options.FfmpegPath,
            Arguments = arguments,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = new Process { StartInfo = startInfo };

        if (!process.Start())
        {
            throw new InvalidOperationException("Failed to start FFmpeg");
        }

        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        var lastProgressAt = DateTime.MinValue;

        while (!process.StandardOutput.EndOfStream)
        {
            var line = await process.StandardOutput.ReadLineAsync(cancellationToken);
            if (line is null)
            {
                break;
            }

            var ffmpegPercent = TryParseProgressPercentage(line, duration);
            if (ffmpegPercent is null)
            {
                continue;
            }

            if ((DateTime.UtcNow - lastProgressAt) < TimeSpan.FromSeconds(1) && ffmpegPercent < 100m)
            {
                continue;
            }

            lastProgressAt = DateTime.UtcNow;
            var overall = 20m + (ffmpegPercent.Value * 0.7m);
            await onProgress(new TranscodeProgress(
                "transcoding",
                Math.Round(overall, 2),
                "Processando midia com FFmpeg"
            ));
        }

        await process.WaitForExitAsync(cancellationToken);
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            logger.LogError("FFmpeg failed with exit code {ExitCode}: {Error}", process.ExitCode, stderr);
            throw new InvalidOperationException($"FFmpeg failed with exit code {process.ExitCode}: {stderr}");
        }
    }

    private async Task<string?> TryGenerateVideoCoverAsync(
        string sourcePath,
        string outputDirectory,
        CancellationToken cancellationToken
    )
    {
        var coverPath = Path.Combine(outputDirectory, "cover.jpg");
        var args =
            $"-y -ss 00:00:01 -i {Quote(sourcePath)} -frames:v 1 -vf scale=640:-2 -q:v 3 {Quote(coverPath)}";

        try
        {
            await RunFfmpegAsync(args, null, _ => Task.CompletedTask, cancellationToken);
            return File.Exists(coverPath) ? coverPath : null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Unable to generate video cover for {SourcePath}", sourcePath);
            return null;
        }
    }

    private async Task<TimeSpan?> ProbeDurationAsync(string sourcePath, CancellationToken cancellationToken)
    {
        try
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = _options.FfprobePath,
                Arguments = $"-v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 {Quote(sourcePath)}",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(startInfo);
            if (process is null)
            {
                return null;
            }

            var output = await process.StandardOutput.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);

            if (process.ExitCode != 0)
            {
                return null;
            }

            return double.TryParse(output.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var seconds)
                ? TimeSpan.FromSeconds(seconds)
                : null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Unable to probe media duration for {SourcePath}", sourcePath);
            return null;
        }
    }

    private static int? ToDurationSeconds(TimeSpan? duration) =>
        duration is null ? null : (int)Math.Round(duration.Value.TotalSeconds);

    private static string Quote(string value) => $"\"{value.Replace("\"", "\\\"")}\"";
}
