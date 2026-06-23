export interface AllotmentResponse {
  status: "ALLOTTED" | "NOT_ALLOTTED" | "PENDING";
  sharesAllotted: number;
  source: string;
  checkedAt: Date;
}

export interface AllotmentProvider {
  checkAllotment(panNumber: string, ipoId: string): Promise<AllotmentResponse>;
  checkBulkAllotment(panNumbers: string[], ipoId: string): Promise<Record<string, AllotmentResponse>>;
  getAllotmentStatus(applicationId: string): Promise<AllotmentResponse>;
}
