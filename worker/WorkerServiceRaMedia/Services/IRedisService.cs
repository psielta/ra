using WorkerServiceRaMedia.Models;

namespace WorkerServiceRaMedia.Services;

public interface IRedisService : IDisposable
{
    Task PublishProgressAsync(JobProgressEvent progressEvent);
    Task PublishCompletedAsync(JobCompletedEvent completedEvent);
    Task PublishFailedAsync(JobFailedEvent failedEvent);
    bool IsHealthy();
}
