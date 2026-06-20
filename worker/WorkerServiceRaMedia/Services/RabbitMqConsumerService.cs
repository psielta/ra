using System.Text;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using WorkerServiceRaMedia.Models;

namespace WorkerServiceRaMedia.Services;

public sealed class RabbitMqConsumerService : IRabbitMqConsumerService
{
    private readonly RabbitMqOptions _options;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RabbitMqConsumerService> _logger;
    private IConnection? _connection;
    private IModel? _channel;
    private EventingBasicConsumer? _consumer;
    private bool _disposed;
    private bool _consumerStopped = true;

    public RabbitMqConsumerService(
        IOptions<RabbitMqOptions> options,
        IServiceProvider serviceProvider,
        ILogger<RabbitMqConsumerService> logger
    )
    {
        _options = options.Value;
        _serviceProvider = serviceProvider;
        _logger = logger;
        InitializeConnection();
    }

    public void StartConsuming()
    {
        ObjectDisposedException.ThrowIf(_disposed, nameof(RabbitMqConsumerService));

        if (_connection?.IsOpen != true || _channel?.IsOpen != true)
        {
            _logger.LogWarning("Cannot start consuming because RabbitMQ is unavailable");
            return;
        }

        _consumerStopped = false;
        _consumer = new EventingBasicConsumer(_channel);
        _consumer.Received += async (_, ea) =>
        {
            var message = Encoding.UTF8.GetString(ea.Body.ToArray());

            try
            {
                await ProcessMessageAsync(message, ea.RoutingKey);
                _channel.BasicAck(ea.DeliveryTag, false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing RabbitMQ message with routing key {RoutingKey}", ea.RoutingKey);
                _channel.BasicNack(ea.DeliveryTag, false, true);
            }
        };

        _channel.BasicConsume(_options.QueueName, autoAck: false, consumer: _consumer);
        _logger.LogInformation("Started consuming queue {QueueName}", _options.QueueName);
    }

    public void StopConsuming()
    {
        if (_disposed || _consumerStopped)
        {
            return;
        }

        try
        {
            var tag = _consumer?.ConsumerTags?.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(tag) && _channel?.IsOpen == true)
            {
                _channel.BasicCancel(tag);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error stopping RabbitMQ consumer");
        }
        finally
        {
            _consumerStopped = true;
        }
    }

    public bool IsHealthy()
    {
        try
        {
            return _connection?.IsOpen == true && _channel?.IsOpen == true;
        }
        catch
        {
            return false;
        }
    }

    public bool TryReconnect()
    {
        if (IsHealthy())
        {
            return true;
        }

        try
        {
            CloseConnection();
            InitializeConnection();
            if (IsHealthy())
            {
                StartConsuming();
                return true;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RabbitMQ reconnect failed");
        }

        return false;
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        StopConsuming();
        CloseConnection();
    }

    private void InitializeConnection()
    {
        try
        {
            var factory = new ConnectionFactory
            {
                HostName = _options.Host,
                Port = _options.Port,
                UserName = _options.Username,
                Password = _options.Password,
                VirtualHost = _options.VirtualHost,
                RequestedHeartbeat = TimeSpan.FromSeconds(60),
                NetworkRecoveryInterval = TimeSpan.FromSeconds(10),
                AutomaticRecoveryEnabled = true,
                TopologyRecoveryEnabled = true,
                ContinuationTimeout = TimeSpan.FromSeconds(30),
                HandshakeContinuationTimeout = TimeSpan.FromSeconds(30)
            };

            _connection = factory.CreateConnection("WorkerServiceRaMedia-Consumer");
            _channel = _connection.CreateModel();
            _channel.BasicQos(0, 1, false);
            _channel.ExchangeDeclare(_options.ExchangeName, ExchangeType.Direct, durable: true);
            _channel.QueueDeclare(_options.QueueName, durable: true, exclusive: false, autoDelete: false);
            _channel.QueueBind(_options.QueueName, _options.ExchangeName, _options.RoutingKey);

            _logger.LogInformation("RabbitMQ connected to {Host}:{Port}", _options.Host, _options.Port);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to connect to RabbitMQ. Worker will retry in the health loop");
        }
    }

    private async Task ProcessMessageAsync(string message, string routingKey)
    {
        if (!string.Equals(routingKey, _options.RoutingKey, StringComparison.Ordinal))
        {
            _logger.LogDebug("Ignoring routing key {RoutingKey}", routingKey);
            return;
        }

        var job = JsonConvert.DeserializeObject<MediaTranscodeJob>(message);
        if (job is null || string.IsNullOrWhiteSpace(job.JobId))
        {
            _logger.LogWarning("Ignoring malformed transcode message: {Message}", message);
            return;
        }

        using var scope = _serviceProvider.CreateScope();
        var worker = scope.ServiceProvider.GetRequiredService<IMediaTranscodeWorkerService>();
        await worker.ProcessJobAsync(job, CancellationToken.None);
    }

    private void CloseConnection()
    {
        try
        {
            _channel?.Close();
            _channel?.Dispose();
            _connection?.Close();
            _connection?.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error closing RabbitMQ connection");
        }
        finally
        {
            _channel = null;
            _connection = null;
            _consumer = null;
            _consumerStopped = true;
        }
    }
}
