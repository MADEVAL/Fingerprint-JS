export type PrivacyProfile = 'strict' | 'balanced' | 'extended';
export type Sensitivity = 'low' | 'medium' | 'high';

export interface PolicyOptions {
  requireConsent?: boolean;
  redactValues?: boolean;
  maxSensitivity?: Sensitivity;
  includeActive?: boolean;
  includeUnstable?: boolean;
  allowCollectors?: string[];
  denyCollectors?: string[];
  allowCategories?: string[];
  denyCategories?: string[];
}

export interface CollectorPolicy {
  profile: PrivacyProfile;
  requireConsent: boolean;
  redactValues: boolean;
  maxSensitivity: Sensitivity;
  includeActive: boolean;
  includeUnstable: boolean;
  allowCollectors: ReadonlySet<string>;
  denyCollectors: ReadonlySet<string>;
  allowCategories: ReadonlySet<string>;
  denyCategories: ReadonlySet<string>;
}

export function createPolicy(profile?: PrivacyProfile, overrides?: PolicyOptions): CollectorPolicy;
