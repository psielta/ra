namespace WorkerServiceRaMedia.Services;

public interface IWorkerCallbackClient
{
    Task NotifyCompletedAsync(string jobId, string playbackUrl, string? coverUrl, int? durationSec, CancellationToken cancellationToken);
    Task NotifyFailedAsync(string jobId, string errorMessage, CancellationToken cancellationToken);
}
