using Prometheus;

namespace WorkerServiceRaMedia.Observability;

public static class WorkerMetrics
{
    public static readonly Counter JobsStarted = Metrics.CreateCounter(
        "ra_media_worker_jobs_started_total",
        "Total media transcode jobs started."
    );

    public static readonly Counter JobsCompleted = Metrics.CreateCounter(
        "ra_media_worker_jobs_completed_total",
        "Total media transcode jobs completed."
    );

    public static readonly Counter JobsFailed = Metrics.CreateCounter(
        "ra_media_worker_jobs_failed_total",
        "Total media transcode jobs failed."
    );

    public static readonly Gauge ActiveJobs = Metrics.CreateGauge(
        "ra_media_worker_active_jobs",
        "Current active media transcode jobs."
    );
}
