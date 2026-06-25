import { Platform } from "react-native";
import { Directory, File } from "expo-file-system";

import { moveScannedImage } from "@/hooks/scan/fileManagement.service";

jest.mock("expo-file-system", () => ({
  Paths: { document: "mock-document-dir" },
  Directory: jest.fn(),
  File: jest.fn(),
}));

const textElements = [{ text: "McDonald's Amersfoort" }];
const receiptInfo = {
  date: new Date("2026-06-25"),
  total: 12.5,
  taxLow: 0,
  taxHigh: 2.18,
};

describe("moveScannedImage", () => {
  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { get: () => "ios" });
  });

  it("moves the scanned file into the Bonnen directory and returns its uri", async () => {
    const move = jest.fn().mockResolvedValue(undefined);
    (File as unknown as jest.Mock).mockImplementation(() => ({
      move,
      uri: "file:///docs/Bonnen/bon_mcdonalds_amersfoort_20260625_123.jpg",
    }));
    (Directory as unknown as jest.Mock).mockImplementation(() => ({
      exists: false,
      create: jest.fn(),
    }));

    const result = await moveScannedImage(
      "/tmp/scan1.jpg",
      textElements,
      receiptInfo,
    );

    expect(move).toHaveBeenCalled();
    expect(result).toBe(
      "file:///docs/Bonnen/bon_mcdonalds_amersfoort_20260625_123.jpg",
    );
  });

  it("creates the Bonnen directory only if it doesn't already exist", async () => {
    const create = jest.fn();
    (File as unknown as jest.Mock).mockImplementation(() => ({
      move: jest.fn().mockResolvedValue(undefined),
      uri: "unused",
    }));
    (Directory as unknown as jest.Mock).mockImplementation(() => ({
      exists: true,
      create,
    }));

    await moveScannedImage("/tmp/scan1.jpg", textElements, receiptInfo);

    expect(create).not.toHaveBeenCalled();
  });

  it("returns the source path unchanged on web", async () => {
    Object.defineProperty(Platform, "OS", { get: () => "web" });

    const result = await moveScannedImage(
      "/tmp/scan1.jpg",
      textElements,
      receiptInfo,
    );

    expect(result).toBe("/tmp/scan1.jpg");
  });

  it("falls back to the source path if the move fails", async () => {
    (File as unknown as jest.Mock).mockImplementation(() => ({
      move: jest.fn().mockRejectedValue(new Error("disk full")),
      uri: "unused",
    }));
    (Directory as unknown as jest.Mock).mockImplementation(() => ({
      exists: true,
      create: jest.fn(),
    }));

    const result = await moveScannedImage(
      "/tmp/scan1.jpg",
      textElements,
      receiptInfo,
    );

    expect(result).toBe("/tmp/scan1.jpg");
  });
});
