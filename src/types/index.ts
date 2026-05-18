export interface PackageInfo {
  name: string;
  isPrimary?: boolean;
  content: Record<string, any>;
}

export interface StartOptions {
  source: string;
  destination: string;
  packages: string[] | string;
  logErrors?: boolean;
  alreadyParsed?: boolean;
}

export interface PackageLockFormat {
  name: string;
  version: string;
  lockfileVersion: number;
  requires: boolean;
  packages: Record<string, any>;
  dependencies: Record<string, any>;
}

export interface GenerateLockOptions {
  isNPM?: boolean;
  force?: boolean;
  yarn?: boolean;
}
