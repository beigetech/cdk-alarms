const GI_TO_BYTES = 1024 * 1024 * 1024;

interface InstanceResources {
  memory: number; // bytes
  cores: number;
}

export const INSTANCE_TYPES: Record<string, InstanceResources> = {
  "db.cv11.18xlarge": { memory: 144 * GI_TO_BYTES, cores: 72 },
  "db.cv11.2xlarge": { memory: 16 * GI_TO_BYTES, cores: 8 },
  "db.cv11.4xlarge": { memory: 32 * GI_TO_BYTES, cores: 16 },
  "db.cv11.9xlarge": { memory: 72 * GI_TO_BYTES, cores: 36 },
  "db.cv11.large": { memory: 4 * GI_TO_BYTES, cores: 2 },
  "db.cv11.medium": { memory: 2 * GI_TO_BYTES, cores: 1 },
  "db.cv11.small": { memory: 1 * GI_TO_BYTES, cores: 1 },
  "db.cv11.xlarge": { memory: 8 * GI_TO_BYTES, cores: 4 },
  "db.m1.large": { memory: 7.5 * GI_TO_BYTES, cores: 2 },
  "db.m1.medium": { memory: 3.75 * GI_TO_BYTES, cores: 1 },
  "db.m1.small": { memory: 1.7 * GI_TO_BYTES, cores: 1 },
  "db.m1.xlarge": { memory: 15 * GI_TO_BYTES, cores: 4 },
  "db.m2.2xlarge": { memory: 34.2 * GI_TO_BYTES, cores: 4 },
  "db.m2.4xlarge": { memory: 68.4 * GI_TO_BYTES, cores: 8 },
  "db.m2.xlarge": { memory: 17.1 * GI_TO_BYTES, cores: 2 },
  "db.m3.2xlarge": { memory: 30 * GI_TO_BYTES, cores: 8 },
  "db.m3.large": { memory: 7.5 * GI_TO_BYTES, cores: 2 },
  "db.m3.medium": { memory: 3.75 * GI_TO_BYTES, cores: 1 },
  "db.m3.xlarge": { memory: 15 * GI_TO_BYTES, cores: 4 },
  "db.m4.10xlarge": { memory: 160 * GI_TO_BYTES, cores: 40 },
  "db.m4.16xlarge": { memory: 256 * GI_TO_BYTES, cores: 64 },
  "db.m4.2xlarge": { memory: 32 * GI_TO_BYTES, cores: 8 },
  "db.m4.4xlarge": { memory: 64 * GI_TO_BYTES, cores: 16 },
  "db.m4.large": { memory: 8 * GI_TO_BYTES, cores: 2 },
  "db.m4.xlarge": { memory: 16 * GI_TO_BYTES, cores: 4 },
  "db.m5.12xlarge": { memory: 192 * GI_TO_BYTES, cores: 48 },
  "db.m5.16xlarge": { memory: 256 * GI_TO_BYTES, cores: 64 },
  "db.m5.24xlarge": { memory: 384 * GI_TO_BYTES, cores: 96 },
  "db.m5.2xlarge": { memory: 32 * GI_TO_BYTES, cores: 8 },
  "db.m5.4xlarge": { memory: 64 * GI_TO_BYTES, cores: 16 },
  "db.m5.8xlarge": { memory: 128 * GI_TO_BYTES, cores: 32 },
  "db.m5.large": { memory: 8 * GI_TO_BYTES, cores: 2 },
  "db.m5.xlarge": { memory: 16 * GI_TO_BYTES, cores: 4 },
  "db.m6g.12xlarge": { memory: 192 * GI_TO_BYTES, cores: 48 },
  "db.m6g.16xlarge": { memory: 256 * GI_TO_BYTES, cores: 64 },
  "db.m6g.2xlarge": { memory: 32 * GI_TO_BYTES, cores: 8 },
  "db.m6g.4xlarge": { memory: 64 * GI_TO_BYTES, cores: 16 },
  "db.m6g.8xlarge": { memory: 128 * GI_TO_BYTES, cores: 32 },
  "db.m6g.large": { memory: 8 * GI_TO_BYTES, cores: 2 },
  "db.m6g.xlarge": { memory: 16 * GI_TO_BYTES, cores: 4 },
  "db.mv11.12xlarge": { memory: 192 * GI_TO_BYTES, cores: 48 },
  "db.mv11.24xlarge": { memory: 384 * GI_TO_BYTES, cores: 96 },
  "db.mv11.2xlarge": { memory: 32 * GI_TO_BYTES, cores: 8 },
  "db.mv11.4xlarge": { memory: 64 * GI_TO_BYTES, cores: 16 },
  "db.mv11.large": { memory: 8 * GI_TO_BYTES, cores: 2 },
  "db.mv11.medium": { memory: 4 * GI_TO_BYTES, cores: 1 },
  "db.mv11.xlarge": { memory: 16 * GI_TO_BYTES, cores: 4 },
  "db.r3.2xlarge": { memory: 61 * GI_TO_BYTES, cores: 8 },
  "db.r3.4xlarge": { memory: 122 * GI_TO_BYTES, cores: 16 },
  "db.r3.8xlarge": { memory: 244 * GI_TO_BYTES, cores: 32 },
  "db.r3.large": { memory: 15.25 * GI_TO_BYTES, cores: 2 },
  "db.r3.xlarge": { memory: 30.5 * GI_TO_BYTES, cores: 4 },
  "db.r4.16xlarge": { memory: 488 * GI_TO_BYTES, cores: 64 },
  "db.r4.2xlarge": { memory: 61 * GI_TO_BYTES, cores: 8 },
  "db.r4.4xlarge": { memory: 122 * GI_TO_BYTES, cores: 16 },
  "db.r4.8xlarge": { memory: 244 * GI_TO_BYTES, cores: 32 },
  "db.r4.large": { memory: 15.25 * GI_TO_BYTES, cores: 2 },
  "db.r4.xlarge": { memory: 30.5 * GI_TO_BYTES, cores: 4 },
  "db.r5.12xlarge": { memory: 384 * GI_TO_BYTES, cores: 48 },
  "db.r5.16xlarge": { memory: 512 * GI_TO_BYTES, cores: 64 },
  "db.r5.24xlarge": { memory: 768 * GI_TO_BYTES, cores: 96 },
  "db.r5.2xlarge": { memory: 64 * GI_TO_BYTES, cores: 8 },
  "db.r5.4xlarge": { memory: 128 * GI_TO_BYTES, cores: 16 },
  "db.r5.8xlarge": { memory: 256 * GI_TO_BYTES, cores: 32 },
  "db.r5.large": { memory: 16 * GI_TO_BYTES, cores: 2 },
  "db.r5.xlarge": { memory: 32 * GI_TO_BYTES, cores: 4 },
  "db.r6g.12xlarge": { memory: 384 * GI_TO_BYTES, cores: 48 },
  "db.r6g.16xlarge": { memory: 512 * GI_TO_BYTES, cores: 64 },
  "db.r6g.2xlarge": { memory: 64 * GI_TO_BYTES, cores: 8 },
  "db.r6g.4xlarge": { memory: 128 * GI_TO_BYTES, cores: 16 },
  "db.r6g.8xlarge": { memory: 256 * GI_TO_BYTES, cores: 32 },
  "db.r6g.large": { memory: 16 * GI_TO_BYTES, cores: 2 },
  "db.r6g.xlarge": { memory: 32 * GI_TO_BYTES, cores: 4 },
  "db.rv11.12xlarge": { memory: 384 * GI_TO_BYTES, cores: 48 },
  "db.rv11.24xlarge": { memory: 768 * GI_TO_BYTES, cores: 96 },
  "db.rv11.2xlarge": { memory: 64 * GI_TO_BYTES, cores: 8 },
  "db.rv11.4xlarge": { memory: 128 * GI_TO_BYTES, cores: 16 },
  "db.rv11.large": { memory: 16 * GI_TO_BYTES, cores: 2 },
  "db.rv11.xlarge": { memory: 32 * GI_TO_BYTES, cores: 4 },
  "db.t1.micro": { memory: 0.613 * GI_TO_BYTES, cores: 1 },
  "db.t2.2xlarge": { memory: 32 * GI_TO_BYTES, cores: 8 },
  "db.t2.large": { memory: 8 * GI_TO_BYTES, cores: 2 },
  "db.t2.medium": { memory: 4 * GI_TO_BYTES, cores: 2 },
  "db.t2.micro": { memory: 1 * GI_TO_BYTES, cores: 1 },
  "db.t2.small": { memory: 2 * GI_TO_BYTES, cores: 1 },
  "db.t2.xlarge": { memory: 16 * GI_TO_BYTES, cores: 4 },
  "db.t3.2xlarge": { memory: 32 * GI_TO_BYTES, cores: 8 },
  "db.t3.large": { memory: 8 * GI_TO_BYTES, cores: 2 },
  "db.t3.medium": { memory: 4 * GI_TO_BYTES, cores: 2 },
  "db.t3.micro": { memory: 1 * GI_TO_BYTES, cores: 2 },
  "db.t3.small": { memory: 2 * GI_TO_BYTES, cores: 2 },
  "db.t3.xlarge": { memory: 16 * GI_TO_BYTES, cores: 4 },
  "db.x1.16xlarge": { memory: 976 * GI_TO_BYTES, cores: 64 },
  "db.x1.32xlarge": { memory: 1952 * GI_TO_BYTES, cores: 128 },
  "db.x1e.16xlarge": { memory: 1952 * GI_TO_BYTES, cores: 64 },
  "db.x1e.2xlarge": { memory: 244 * GI_TO_BYTES, cores: 8 },
  "db.x1e.32xlarge": { memory: 3904 * GI_TO_BYTES, cores: 128 },
  "db.x1e.4xlarge": { memory: 488 * GI_TO_BYTES, cores: 16 },
  "db.x1e.8xlarge": { memory: 976 * GI_TO_BYTES, cores: 32 },
  "db.x1e.xlarge": { memory: 122 * GI_TO_BYTES, cores: 4 },
  "db.z1d.12xlarge": { memory: 384 * GI_TO_BYTES, cores: 48 },
  "db.z1d.2xlarge": { memory: 64 * GI_TO_BYTES, cores: 8 },
  "db.z1d.3xlarge": { memory: 96 * GI_TO_BYTES, cores: 12 },
  "db.z1d.6xlarge": { memory: 192 * GI_TO_BYTES, cores: 24 },
  "db.z1d.large": { memory: 16 * GI_TO_BYTES, cores: 2 },
  "db.z1d.xlarge": { memory: 32 * GI_TO_BYTES, cores: 4 },
};