using System.Net.Http.Headers;
using System.Text;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using WorkerServiceRaMedia.Models;

namespace WorkerServiceRaMedia.Services;

public sealed class WorkerCallbackClient(
    HttpClient httpClient,
    IOptions<WorkerApiOptions> options,
    ILogger<WorkerCallbackClient> logger
) : IWorkerCallbackClient
{
    private readonly WorkerApiOptions _options = options.Value;

    public Task NotifyCompletedAsync(
        string jobId,
        string playbackUrl,
        string? coverUrl,
        int? durationSec,
        CancellationToken cancellationToken
    ) =>
        PatchAsync(
            jobId,
            new
            {
                status = "ready",
                playbackUrl,
                coverUrl,
                durationSec,
                progress = 100
            },
            cancellationToken
        );

    public Task NotifyFailedAsync(string jobId, string errorMessage, CancellationToken cancellationToken) =>
        PatchAsync(
            jobId,
            new
            {
                status = "error",
                errorMessage,
                progress = 0
            },
            cancellationToken
        );

    private async Task PatchAsync(string jobId, object payload, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Patch, $"/api/worker/media/jobs/{jobId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.Token);
        request.Headers.Add("x-worker-token", _options.Token);
        request.Content = new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        logger.LogError(
            "Worker callback failed for job {JobId}. Status {StatusCode}. Body: {Body}",
            jobId,
            (int)response.StatusCode,
            body
        );

        throw new InvalidOperationException($"Worker callback failed with status {(int)response.StatusCode}: {body}");
    }
}
