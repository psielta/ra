namespace WorkerServiceRaMedia.Services;

public interface IRabbitMqConsumerService : IDisposable
{
    void StartConsuming();
    void StopConsuming();
    bool IsHealthy();
    bool TryReconnect();
}
