using Microsoft.Extensions.Options;
using Minio;
using Minio.DataModel.Args;
using WorkerServiceRaMedia.Models;

namespace WorkerServiceRaMedia.Services;

public sealed class MediaStorageService : IMediaStorageService
{
    private readonly IMinioClient _client;
    private readonly StorageOptions _options;
    private readonly MediaOptions _mediaOptions;
    private readonly ILogger<MediaStorageService> _logger;
    private bool _bucketReady;

    public MediaStorageService(
        IOptions<StorageOptions> options,
        IOptions<MediaOptions> mediaOptions,
        ILogger<MediaStorageService> logger
    )
    {
        _options = options.Value;
        _mediaOptions = mediaOptions.Value;
        _logger = logger;

        var builder = new MinioClient()
            .WithEndpoint(_options.Endpoint, _options.Port)
            .WithCredentials(_options.AccessKey, _options.SecretKey);

        if (_options.UseSSL)
        {
            builder = builder.WithSSL();
        }

        _client = builder.Build();
    }

    public async Task<string> DownloadAsync(string objectKey, string targetDirectory, CancellationToken cancellationToken)
    {
        await EnsureBucketAsync(cancellationToken);

        Directory.CreateDirectory(targetDirectory);
        var localPath = Path.Combine(targetDirectory, Path.GetFileName(objectKey));

        var args = new GetObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(objectKey)
            .WithFile(localPath);

        await _client.GetObjectAsync(args, cancellationToken);
        _logger.LogInformation("Downloaded {ObjectKey} to {LocalPath}", objectKey, localPath);

        return localPath;
    }

    public async Task UploadFileAsync(string localPath, string objectKey, string contentType, CancellationToken cancellationToken)
    {
        await EnsureBucketAsync(cancellationToken);

        var args = new PutObjectArgs()
            .WithBucket(_options.Bucket)
            .WithObject(objectKey)
            .WithFileName(localPath)
            .WithContentType(contentType);

        await _client.PutObjectAsync(args, cancellationToken);
        _logger.LogInformation("Uploaded {LocalPath} to {ObjectKey}", localPath, objectKey);
    }

    public string GetPublicUrl(string objectKey) =>
        $"{_mediaOptions.PublicBaseUrl.TrimEnd('/')}/{objectKey.Replace("\\", "/")}";

    private async Task EnsureBucketAsync(CancellationToken cancellationToken)
    {
        if (_bucketReady) return;

        var exists = await _client.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(_options.Bucket),
            cancellationToken
        );

        if (!exists)
        {
            await _client.MakeBucketAsync(
                new MakeBucketArgs().WithBucket(_options.Bucket),
                cancellationToken
            );
            _logger.LogInformation("Created media bucket {Bucket}", _options.Bucket);
        }

        _bucketReady = true;
    }
}
