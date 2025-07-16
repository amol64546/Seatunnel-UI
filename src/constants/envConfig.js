export const defaultEnvConfig = {
  "job.mode": "BATCH",
  "parallelism": 1,
  "job.retry.times": 3,
  "job.retry.interval.seconds": 3,
  "checkpoint.interval": 30000,
  "checkpoint.timeout": 30000,
  "read_limit.rows_per_second": 400,
  "read_limit.bytes_per_second": 7000000
};