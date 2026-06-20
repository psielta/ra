using Newtonsoft.Json;

namespace WorkerServiceRaMedia.Models;

public sealed class JobProgressEvent
{
    [JsonProperty("jobId")]
    public string JobId { get; set; } = "";

    [JsonProperty("userId")]
    public string UserId { get; set; } = "";

    [JsonProperty("status")]
    public string Status { get; set; } = "processing";

    [JsonProperty("stage")]
    public string Stage { get; set; } = "";

    [JsonProperty("progressPercentage")]
    public decimal ProgressPercentage { get; set; }

    [JsonProperty("message")]
    public string Message { get; set; } = "";

    [JsonProperty("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public sealed class JobCompletedEvent
{
    [JsonProperty("jobId")]
    public string JobId { get; set; } = "";

    [JsonProperty("userId")]
    public string UserId { get; set; } = "";

    [JsonProperty("status")]
    public string Status { get; set; } = "ready";

    [JsonProperty("progressPercentage")]
    public decimal ProgressPercentage { get; set; } = 100;

    [JsonProperty("playbackUrl")]
    public string PlaybackUrl { get; set; } = "";

    [JsonProperty("coverUrl")]
    public string? CoverUrl { get; set; }

    [JsonProperty("durationSec")]
    public int? DurationSec { get; set; }

    [JsonProperty("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public sealed class JobFailedEvent
{
    [JsonProperty("jobId")]
    public string JobId { get; set; } = "";

    [JsonProperty("userId")]
    public string UserId { get; set; } = "";

    [JsonProperty("status")]
    public string Status { get; set; } = "error";

    [JsonProperty("errorMessage")]
    public string ErrorMessage { get; set; } = "";

    [JsonProperty("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
