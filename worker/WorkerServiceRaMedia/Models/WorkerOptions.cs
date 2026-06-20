namespace WorkerServiceRaMedia.Models;

public sealed class RabbitMqOptions
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 5672;
    public string Username { get; set; } = "guest";
    public string Password { get; set; } = "guest";
    public string VirtualHost { get; set; } = "/";
    public string ExchangeName { get; set; } = "media-transcode-exchange";
    public string QueueName { get; set; } = "media-transcode-jobs";
    public string RoutingKey { get; set; } = "media.transcode";
}

public sealed class StorageOptions
{
    public string Endpoint { get; set; } = "localhost";
    public int Port { get; set; } = 14007;
    public bool UseSSL { get; set; }
    public string AccessKey { get; set; } = "minio";
    public string SecretKey { get; set; } = "miniosecret";
    public string Bucket { get; set; } = "ra-media";
}

public sealed class MediaOptions
{
    public string PublicBaseUrl { get; set; } = "http://localhost:14009";
}

public sealed class FfmpegOptions
{
    public string FfmpegPath { get; set; } = "ffmpeg";
    public string FfprobePath { get; set; } = "ffprobe";
    public string WorkingDirectory { get; set; } = "";
}

public sealed class WorkerApiOptions
{
    public string BaseUrl { get; set; } = "http://localhost:14001";
    public string Token { get; set; } = "";
}

public sealed record TranscodeProgress(string Stage, decimal ProgressPercentage, string Message);

public sealed record TranscodeOutput(
    string PlaybackFilePath,
    string PlaybackObjectKey,
    string? CoverObjectKey,
    int? DurationSec,
    IReadOnlyList<string> OutputFiles
);
