using WorkerServiceRaMedia.Models;

namespace WorkerServiceRaMedia.Services;

public interface IFfmpegTranscodeService
{
    Task<TranscodeOutput> TranscodeAsync(
        MediaTranscodeJob job,
        string sourcePath,
        string outputDirectory,
        Func<TranscodeProgress, Task> onProgress,
        CancellationToken cancellationToken
    );
}
