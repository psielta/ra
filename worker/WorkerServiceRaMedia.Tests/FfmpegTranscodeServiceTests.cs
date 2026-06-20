using WorkerServiceRaMedia.Services;
using Xunit;

namespace WorkerServiceRaMedia.Tests;

public class FfmpegTranscodeServiceTests
{
    [Fact]
    public void TryParseProgressPercentage_MapsOutTimeToPercent()
    {
        var percent = FfmpegTranscodeService.TryParseProgressPercentage(
            "out_time_ms=5000000",
            TimeSpan.FromSeconds(10)
        );

        Assert.Equal(50m, percent);
    }

    [Fact]
    public void TryParseProgressPercentage_ClampsOverDuration()
    {
        var percent = FfmpegTranscodeService.TryParseProgressPercentage(
            "out_time_ms=15000000",
            TimeSpan.FromSeconds(10)
        );

        Assert.Equal(100m, percent);
    }
}
