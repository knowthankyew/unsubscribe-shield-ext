/**
 * Unsubscribe Forensics TypeScript models matching mailStripper (v1.1.5)
 */

export type UnsubscribeClassification =
  | 'NoUnsubscribeFound'
  | 'OneClickPostCandidate'
  | 'MailtoCandidate'
  | 'HttpLandingCandidate'
  | 'PoisonOrReconTrap';

export type AuthenticationProvenance =
  | 'UnverifiedUpload'
  | 'MissingAuthHeaders'
  | 'SyntheticPastedBody'
  | 'AmbiguousOrForgedHeader'
  | 'TrustedReceivingMx';

export interface UnsubscribeCandidate {
  source: string;
  sanitizedUri: string;
  scheme: string;
  host: string;
  registrableDomain?: string;
  anchorText?: string;
  alignedWithSenderOrEsp: boolean;
  riskFlags: string[];
}

export interface UnsubscribeForensicReport {
  classification: UnsubscribeClassification;
  provenance: AuthenticationProvenance;
  riskScore: number;
  summaryVerdict: string;
  reconWarning: string;
  headerContextAvailable: boolean;
  hasRfc8058OneClickPost: boolean;
  singleUnambiguousHeader: boolean;
  dkimCoversUnsubscribeHeaders: boolean;
  authResultsClaimsDkimPass: boolean;
  authResultsClaimsSpfPass: boolean;
  authResultsClaimsDmarcPass: boolean;
  alignedWithSenderOrKnownEsp: boolean;
  alignmentReason?: string;
  matchedAuthservId?: string;
  expectedAuthservId?: string;
  authservIdVerified: boolean;
  primaryTargetHost?: string;
  sterileCurlCommand?: string;
  sanitizedMailtoUri?: string;
  poisonSignals: string[];
  candidates: UnsubscribeCandidate[];
}

export interface SterileExecutionResult {
  success: boolean;
  status: number;
  targetUri: string;
  executedAt: string;
  warningDisclosed: boolean;
  error?: string;
}
