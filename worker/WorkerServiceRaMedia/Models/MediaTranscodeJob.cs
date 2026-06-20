using Newtonsoft.Json;

namespace WorkerServiceRaMedia.Models;

public sealed class MediaTranscodeJob
{
    [JsonProperty("jobId")]
    public string JobId { get; set; } = "";

    [JsonProperty("userId")]
    public string UserId { get; set; } = "";

    [JsonProperty("mediaType")]
    public string MediaType { get; set; } = "";

    [JsonProperty("storageKey")]
    public string StorageKey { get; set; } = "";

    [JsonProperty("mimeType")]
    public string MimeType { get; set; } = "";

    public bool IsVideo => string.Equals(MediaType, "video", StringComparison.OrdinalIgnoreCase);
    public bool IsAudio => string.Equals(MediaType, "audio", StringComparison.OrdinalIgnoreCase);
}
