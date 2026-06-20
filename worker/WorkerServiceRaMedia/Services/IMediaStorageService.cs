namespace WorkerServiceRaMedia.Services;

public interface IMediaStorageService
{
    Task<string> DownloadAsync(string objectKey, string targetDirectory, CancellationToken cancellationToken);
    Task UploadFileAsync(string localPath, string objectKey, string contentType, CancellationToken cancellationToken);
    string GetPublicUrl(string objectKey);
}
