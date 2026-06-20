using WorkerServiceRaMedia.Services;

namespace WorkerServiceRaMedia;

public sealed class Worker(
    IRabbitMqConsumerService rabbitMqConsumer,
    ILogger<Worker> logger
) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Media worker starting");
        rabbitMqConsumer.StartConsuming();

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (!rabbitMqConsumer.IsHealthy())
                {
                    logger.LogWarning("RabbitMQ consumer is unhealthy; attempting reconnect");
                    rabbitMqConsumer.TryReconnect();
                }

                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Worker health loop failed");
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
        }
    }

    public override Task StopAsync(CancellationToken cancellationToken)
    {
        logger.LogInformation("Media worker stopping");
        rabbitMqConsumer.StopConsuming();
        return base.StopAsync(cancellationToken);
    }
}
