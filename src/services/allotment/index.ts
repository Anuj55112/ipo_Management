import { ManualProvider } from "./ManualProvider";
import { CSVImportProvider } from "./CSVImportProvider";
import { FutureAPIProvider } from "./FutureAPIProvider";
import { AllotmentProvider } from "./types";

export * from "./types";
export * from "./ManualProvider";
export * from "./CSVImportProvider";
export * from "./FutureAPIProvider";

export const manualProvider = new ManualProvider();
export const csvImportProvider = new CSVImportProvider();
export const futureAPIProvider = new FutureAPIProvider();

export function getAllotmentProvider(source: "MANUAL" | "CSV" | "API"): AllotmentProvider {
  switch (source) {
    case "MANUAL":
      return manualProvider;
    case "CSV":
      return csvImportProvider;
    case "API":
      return futureAPIProvider;
    default:
      throw new Error(`Unsupported allotment provider source: ${source}`);
  }
}
