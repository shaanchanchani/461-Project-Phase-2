// src/types.ts

// Core API Types from OpenAPI spec
export type PackageName = string;
export type PackageID = string;
export type AuthenticationToken = string;

// User Authentication Types
export interface User {
    name: string;
    isAdmin: boolean;
}

export interface UserAuthenticationInfo {
    password: string;
}

export interface AuthenticationRequest {
    User: User;
    Secret: UserAuthenticationInfo;
}

// Package Types
export interface PackageMetadata {
    Name: PackageName;
    Version: string;
    ID: PackageID;
}

export interface PackageData {
    Content?: string;    // Base64 encoded zip file
    URL?: string;        // Package URL for ingest
    JSProgram?: string;  // JavaScript program
    debloat?: boolean;   // Optional debloat flag
}

export interface Package {
    metadata: PackageMetadata;
    data: PackageData;
}

// Search and Query Types
export interface PackageQuery {
    Version?: string;
    Name: PackageName;
}

export interface PackageRegEx {
    RegEx: string;
}

// Rating Types
export interface PackageRating {
    BusFactor: number;
    Correctness: number;
    RampUp: number;
    ResponsiveMaintainer: number;
    LicenseScore: number;
    GoodPinningPractice: number;
    PullRequest: number;
    NetScore: number;
    
    // Latency metrics
    BusFactorLatency: number;
    CorrectnessLatency: number;
    RampUpLatency: number;
    ResponsiveMaintainerLatency: number;
    LicenseScoreLatency: number;
    GoodPinningPracticeLatency: number;
    PullRequestLatency: number;
    NetScoreLatency: number;
}

// Cost Types
export interface PackageCost {
    [key: PackageID]: {
        standaloneCost?: number;
        totalCost: number;
    }
}

// History Types
export type PackageAction = 'CREATE' | 'UPDATE' | 'DOWNLOAD' | 'RATE';

export interface PackageHistoryEntry {
    User: User;
    Date: string;  // ISO-8601 datetime in UTC
    PackageMetadata: PackageMetadata;
    Action: PackageAction;
}

// Database Types (if using DynamoDB)
export namespace DB {
    export interface DynamoPackageItem {
        PK: string;              // PKG#${ID}
        SK: string;              // METADATA#${Version}
        type: 'package';
        metadata: PackageMetadata;
        data: PackageData;
        createdAt: string;
    }

    export interface DynamoRatingItem {
        PK: string;              // PKG#${ID}
        SK: string;              // RATING#${Version}
        type: 'rating';
        rating: PackageRating;
        updatedAt: string;
    }

    export interface DynamoCostItem {
        PK: string;              // PKG#${ID}
        SK: string;              // COST#${Version}
        type: 'cost';
        costs: PackageCost;
        updatedAt: string;
    }

    export interface DynamoHistoryItem {
        PK: string;              // PKG#${Name}
        SK: string;              // HISTORY#${Timestamp}
        type: 'history';
        entry: PackageHistoryEntry;
    }

    // Conversion helpers
    export function toAPIPackage(item: DynamoPackageItem): Package {
        return {
            metadata: item.metadata,
            data: item.data
        };
    }

    export function toDynamoPackage(pkg: Package): Omit<DynamoPackageItem, 'PK' | 'SK'> {
        return {
            type: 'package',
            metadata: pkg.metadata,
            data: pkg.data,
            createdAt: new Date().toISOString()
        };
    }
}