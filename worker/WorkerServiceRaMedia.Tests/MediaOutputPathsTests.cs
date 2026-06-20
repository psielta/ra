using WorkerServiceRaMedia.Services;
using Xunit;

namespace WorkerServiceRaMedia.Tests;

public class MediaOutputPathsTests
{
    [Theory]
    [InlineData("video")]
    [InlineData("audio")]
    public void PlaybackObjectKey_UsesHlsIndexForAllMediaTypes(string mediaType)
    {
        var key = MediaOutputPaths.PlaybackObjectKey("user-1", "job-1", mediaType);

        Assert.Equal("outputs/user-1/job-1/index.m3u8", key);
    }

    [Fact]
    public void CoverObjectKey_UsesCoverJpg()
    {
        var key = MediaOutputPaths.CoverObjectKey("user-1", "job-1");

        Assert.Equal("outputs/user-1/job-1/cover.jpg", key);
    }

    [Theory]
    [InlineData("index.m3u8", "application/vnd.apple.mpegurl")]
    [InlineData("segment_001.ts", "video/mp2t")]
    [InlineData("cover.jpg", "image/jpeg")]
    [InlineData("track.mp3", "audio/mpeg")]
    public void ContentTypeForPath_ReturnsStreamingMimeTypes(string path, string expected)
    {
        Assert.Equal(expected, MediaOutputPaths.ContentTypeForPath(path));
    }
}
