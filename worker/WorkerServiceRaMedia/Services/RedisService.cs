using Newtonsoft.Json;
using StackExchange.Redis;
using WorkerServiceRaMedia.Models;

namespace WorkerServiceRaMedia.Services;

public sealed class RedisService : IRedisService
{
    private readonly ConnectionMultiplexer _redis;
    private readonly ILogger<RedisService> _logger;
    private bool _disposed;

    public RedisService(IConfiguration configuration, ILogger<RedisService> logger)
    {
        _logger = logger;
        var connectionString =
            configuration.GetConnectionString("Redis")
            ?? configuration.GetValue<string>("Redis:ConnectionString")
            ?? "localhost:6379,abortConnect=false";

        var options = ConfigurationOptions.Parse(connectionString);
        options.AbortOnConnectFail = false;
        options.ConnectRetry = 3;
        options.ConnectTimeout = 5000;
        options.SyncTimeout = 5000;
        options.AsyncTimeout = 5000;
        options.KeepAlive = 60;
        options.ClientName = "WorkerServiceRaMedia";

        _redis = ConnectionMultiplexer.Connect(options);
        _redis.ConnectionFailed += (_, e) =>
            _logger.LogWarning(e.Exception, "Redis connection failed ({FailureType}) to {EndPoint}", e.FailureType, e.EndPoint);
        _redis.ConnectionRestored += (_, e) =>
            _logger.LogInformation("Redis connection restored to {EndPoint}", e.EndPoint);
        _redis.ErrorMessage += (_, e) =>
            _logger.LogWarning("Redis error: {Message}", e.Message);
    }

    public Task PublishProgressAsync(JobProgressEvent progressEvent) =>
        PublishAsync("job.progress", progressEvent);

    public Task PublishCompletedAsync(JobCompletedEvent completedEvent) =>
        PublishAsync("job.completed", completedEvent);

    public Task PublishFailedAsync(JobFailedEvent failedEvent) =>
        PublishAsync("job.failed", failedEvent);

    public bool IsHealthy()
    {
        try
        {
            return _redis.IsConnected;
        }
        catch
        {
            return false;
        }
    }

    private async Task PublishAsync(string channel, object payload)
    {
        ObjectDisposedException.ThrowIf(_disposed, nameof(RedisService));

        var message = JsonConvert.SerializeObject(
            payload,
            new JsonSerializerSettings
            {
                DateFormatHandling = DateFormatHandling.IsoDateFormat,
                DateTimeZoneHandling = DateTimeZoneHandling.Utc
            }
        );

        await _redis.GetSubscriber().PublishAsync(RedisChannel.Literal(channel), message);
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _redis.Close();
        _redis.Dispose();
    }
}
