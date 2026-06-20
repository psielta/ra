using Prometheus;
using Serilog;
using WorkerServiceRaMedia;
using WorkerServiceRaMedia.Models;
using WorkerServiceRaMedia.Services;

var builder = Host.CreateApplicationBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();

builder.Services.AddSerilog();

builder.Services.Configure<RabbitMqOptions>(builder.Configuration.GetSection("RabbitMQ"));
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection("Storage"));
builder.Services.Configure<MediaOptions>(builder.Configuration.GetSection("Media"));
builder.Services.Configure<FfmpegOptions>(builder.Configuration.GetSection("Ffmpeg"));
builder.Services.Configure<WorkerApiOptions>(builder.Configuration.GetSection("WorkerApi"));

builder.Services.AddHttpClient<IWorkerCallbackClient, WorkerCallbackClient>((sp, client) =>
{
    var options = sp.GetRequiredService<IConfiguration>().GetSection("WorkerApi").Get<WorkerApiOptions>() ?? new WorkerApiOptions();
    client.BaseAddress = new Uri(options.BaseUrl);
    client.Timeout = TimeSpan.FromMinutes(5);
});

builder.Services.AddSingleton<IRedisService, RedisService>();
builder.Services.AddSingleton<IMediaStorageService, MediaStorageService>();
builder.Services.AddSingleton<IFfmpegTranscodeService, FfmpegTranscodeService>();
builder.Services.AddSingleton<IMediaTranscodeWorkerService, MediaTranscodeWorkerService>();
builder.Services.AddSingleton<IRabbitMqConsumerService, RabbitMqConsumerService>();
builder.Services.AddHostedService<Worker>();

builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "WorkerServiceRaMedia";
});

var host = builder.Build();
var logger = host.Services.GetRequiredService<ILogger<Program>>();

KestrelMetricServer? metricsServer = null;
var metricsEnabled = builder.Configuration.GetValue("Observability:Prometheus:Enabled", true);
var metricsPort = builder.Configuration.GetValue("Observability:Prometheus:Port", 14010);

if (metricsEnabled)
{
    try
    {
        metricsServer = new KestrelMetricServer(port: metricsPort);
        metricsServer.Start();
        logger.LogInformation("Prometheus metrics server started on port {Port}", metricsPort);
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Failed to start Prometheus metrics server on port {Port}", metricsPort);
    }
}

try
{
    logger.LogInformation("Starting WorkerServiceRaMedia");
    await host.RunAsync();
}
catch (Exception ex)
{
    logger.LogCritical(ex, "WorkerServiceRaMedia terminated unexpectedly");
    throw;
}
finally
{
    metricsServer?.Stop();
    if (host is IAsyncDisposable asyncDisposable)
    {
        await asyncDisposable.DisposeAsync();
    }
    else
    {
        (host as IDisposable)?.Dispose();
    }

    Log.CloseAndFlush();
}
