namespace WorkerServiceRaMedia.Services;

public static class MediaOutputPaths
{
    public static string OutputPrefix(string userId, string jobId) =>
        $"outputs/{userId}/{jobId}";

    public static string PlaybackObjectKey(string userId, string jobId, string mediaType)
    {
        return $"{OutputPrefix(userId, jobId)}/index.m3u8";
    }

    public static string CoverObjectKey(string userId, string jobId) =>
        $"{OutputPrefix(userId, jobId)}/cover.jpg";

    public static string ContentTypeForPath(string path)
    {
        var extension = Path.GetExtension(path).ToLowerInvariant();

        return extension switch
        {
            ".m3u8" => "application/vnd.apple.mpegurl",
            ".ts" => "video/mp2t",
            ".mp3" => "audio/mpeg",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };
    }
}
