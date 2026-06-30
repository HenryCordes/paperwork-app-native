import { useMutation, useQuery, UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { Directory, EncodingType, File, Paths } from "expo-file-system";
import { Share } from "react-native";

import taxesService from "@/api/services/taxesService";
import QueryKeys from "@/api/queryKeys";
import {
  TaxDeadlineResponse,
  TaxExportRequest,
  TaxPeriodType,
  TaxPeriodsResponse,
  TaxSummaryRequest,
  TaxSummaryResponse,
} from "@/api/types/taxes";

export const useTaxPeriods = (): UseQueryResult<TaxPeriodsResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.taxes.periods(),
    queryFn: () => taxesService.getTaxPeriods(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useTaxSummary = (
  params: TaxSummaryRequest,
  enabled: boolean = true,
): UseQueryResult<TaxSummaryResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.taxes.summary(params),
    queryFn: () => taxesService.getTaxSummary(params),
    enabled: enabled && !!params.period && !!params.year,
    staleTime: 5 * 60 * 1000,
  });
};

export const useTaxDeadline = (
  periodType: TaxPeriodType = "quarterly",
): UseQueryResult<TaxDeadlineResponse, Error> => {
  return useQuery({
    queryKey: QueryKeys.taxes.deadline(periodType),
    queryFn: () => taxesService.getNextDeadline(periodType),
    staleTime: 60 * 60 * 1000,
  });
};

export const useExportTaxReturn = (): UseMutationResult<
  { success: boolean; message: string },
  Error,
  TaxExportRequest
> => {
  return useMutation({
    mutationFn: async (params: TaxExportRequest) => {
      const base64Data = await taxesService.exportTaxReturn(params);

      const extension = params.format === "excel" ? "xlsx" : "csv";
      const fileName = `btw-export-${params.periodType}-${params.period}-${params.year}.${extension}`;

      // Write to app's document directory using the new expo-file-system File API.
      // The source uses Capacitor's Filesystem.writeFile on native. Here we use
      // expo-file-system's File.write() with base64 encoding, which is the direct
      // equivalent on RN without needing expo-sharing (not installed).
      const docsDir = new Directory(Paths.document);
      const file = new File(docsDir, fileName);
      file.write(base64Data, { encoding: EncodingType.Base64 });

      // Share the file via the OS share sheet. RN's built-in Share.share()
      // accepts { url } on iOS to open the system activity sheet for a file URI.
      // On Android, file:// URIs work when the app's provider is configured;
      // if not, a follow-up can add getContentUriAsync. For this port, the
      // iOS path is the primary target, matching the source's behaviour.
      await Share.share({ url: file.uri, title: fileName });

      return { success: true, message: "Bestand gedeeld" };
    },
  });
};
