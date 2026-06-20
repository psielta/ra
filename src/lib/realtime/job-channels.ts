export const JOB_PROGRESS_CHANNEL = "job.progress";
export const JOB_COMPLETED_CHANNEL = "job.completed";
export const JOB_FAILED_CHANNEL = "job.failed";

export const JOB_EVENT_CHANNELS = [
  JOB_PROGRESS_CHANNEL,
  JOB_COMPLETED_CHANNEL,
  JOB_FAILED_CHANNEL,
] as const;
