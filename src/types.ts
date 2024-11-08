// src/types.ts

// Package Types
export type PackageName = string;
export type PackageID = string;

export interface PackageMetadata {
    Name: PackageName;
    Version: string;
    ID: PackageID;
}

export interface PackageData {
    Content?: string;    // Base64 encoded zip file
    URL?: string;        // Package URL for ingest
    JSProgram?: string;  // JavaScript program
}

export interface Package {
    metadata: PackageMetadata;
    data: PackageData;
}

// API Operation Types
export interface PackageQuery {
    Version?: string;
    Name: PackageName;
}

export interface PackageRegEx {
    RegEx: string;
}

export interface PackageCost {
    [key: PackageID]: {
        standaloneCost?: number;
        totalCost: number;
    }
}

export interface PackageRating {
    // Core metrics from your implementation
    BusFactor: number;
    Correctness: number;
    RampUp: number;
    ResponsiveMaintainer: number;
    LicenseScore: number;
    NetScore: number;

    // Latency metrics from your implementation
    BusFactorLatency: number;
    CorrectnessLatency: number;
    RampUpLatency: number;
    ResponsiveMaintainerLatency: number;
    LicenseScoreLatency: number;
    NetScoreLatency: number;
}