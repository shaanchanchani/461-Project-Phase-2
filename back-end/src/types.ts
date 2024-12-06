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
// User Types
export interface UserTableItem {
    user_id: string;         // UUID
    username: string;        // Unique username
    password_hash: string;   // Hashed password
    role: 'admin' | 'uploader' | 'downloader';
    group_id?: string;      // Optional UUID foreign key
    created_at: string;     // ISO timestamp
}

// User Group Types
export interface UserGroupTableItem {
    group_id: string;       // UUID
    group_name: string;     // Unique group name
}
// Package Upload Types
export interface PackageZipUploadRequest {
    Content: string;  // Base64 encoded zip file
    JSProgram?: string;
    debloat?: boolean;
}

export interface PackageUrlUploadRequest {
    URL: string;
    JSProgram?: string;
    debloat?: boolean;
}

export interface PackageUploadResponse {
    metadata: {
        Name: string;
        Version: string;
        ID: string;
    };
    data: {
        Content: string;
        JSProgram?: string;
    };
}

// DynamoDB Schema Types
export interface PackageTableItem {
    package_id: string;
    name: string;
    latest_version: string;
    description: string;
    created_at: string;
    user_id: string;  // Added user_id field
}

export interface PackageVersionTableItem {
    version_id: string;
    package_id: string;
    version: string;
    zip_file_path: string;
    debloated: boolean;
    created_at: string;
    standalone_cost: number;        // Size in bytes of just this version
    total_cost: number;            // Total size including all dependencies // not supported yet
}

export interface PackageMetricsTableItem {
    metric_id: string;      // UUID
    version_id: string;     // UUID reference to package version
    net_score: number;      // Overall package quality score
    bus_factor: number;     // Project maintenance risk metric
    ramp_up: number;        // Project readiness metric
    responsive_maintainer: number;  // Maintainer responsiveness metric
    license_score: number;  // License compliance metric
    good_pinning_practice: number;  // Dependency version control metric
    pull_request: number;   // Code review coverage metric
    correctness: number;    // Code quality assessment
    bus_factor_latency: number;     // Latency for bus factor calculation
    ramp_up_latency: number;        // Latency for ramp up calculation
    responsive_maintainer_latency: number;  // Latency for maintainer responsiveness
    license_score_latency: number;  // Latency for license score calculation
    good_pinning_practice_latency: number;  // Latency for pinning practice
    pull_request_latency: number;   // Latency for pull request metric
    correctness_latency: number;    // Latency for correctness calculation
    net_score_latency: number;      // Latency for net score calculation
}

export interface DownloadTableItem {
    download_id: string;    // UUID
    user_id: string;        // UUID reference to user
    package_id: string;     // UUID reference to package
    version: string;        // Package version
    timestamp: string;      // ISO string timestamp
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

// Processed Package Type
export interface ProcessedPackage {
    url: string;
    metrics: {
        BusFactor: number;
        Correctness: number;
        RampUp: number;
        ResponsiveMaintainer: number;
        LicenseScore: number;
        GoodPinningPractice: number;
        PullRequest: number;
        NetScore: number;
    };
    timestamp: string;
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
    User: {
        name: string;      // Required by OpenAPI spec
        isAdmin: boolean;  // Required by OpenAPI spec
    };
    Date: string;         // ISO-8601 format in UTC
    PackageMetadata: {
        Name: PackageName;  // Required by OpenAPI spec
        Version: string;    // Example: "1.2.3"
        ID: PackageID;      // Must match pattern: ^[a-zA-Z0-9\-]+$
    };
    Action: PackageAction;
}

// API Response Types
export type GetPackageByNameResponse = PackageHistoryEntry[];

// API Request Types
export interface GetPackageByNameRequest {
    name: PackageName;  // Required
}

// Database Types (if using DynamoDB)
export namespace DB {
    export interface DynamoPackageItem {
        PK: string;
        SK: string;
        type: 'package';
        metadata: PackageMetadata;
        data: PackageData;
        createdAt: string;
    }

    export interface DynamoRatingItem {
        PK: string;
        SK: string;
        type: 'rating';
        rating: PackageRating;
        updatedAt: string;
    }

    export interface DynamoCostItem {
        PK: string;
        SK: string;
        type: 'cost';
        costs: PackageCost;
        updatedAt: string;
    }

    export interface DynamoHistoryItem {
        PK: string;
        SK: string;
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
export interface DynamoItem {
    PackageTableItem: PackageTableItem;
    PackageVersionTableItem: PackageVersionTableItem;
    PackageMetricsTableItem: PackageMetricsTableItem;
    DownloadTableItem: DownloadTableItem;
    UserTableItem: UserTableItem;
    UserGroupTableItem: UserGroupTableItem;
}