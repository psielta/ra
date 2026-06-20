using WorkerServiceRaMedia.Models;

namespace WorkerServiceRaMedia.Services;

public interface IMediaTranscodeWorkerService
{
    Task ProcessJobAsync(MediaTranscodeJob job, CancellationToken cancellationToken);
}
