# Package Dependency Documentation

## Overview
This document describes how package dependencies are stored and managed in the registry system. The system is designed to efficiently handle package dependencies, their costs, and potential circular dependencies while maintaining optimal performance for API calls.

## Data Structure

### Package Version
Each package version stores its complete dependency tree along with cost information:

```typescript
{
    version_id: string;
    package_id: string;
    standalone_cost: number;    // Size of just this package
    total_cost: number;        // Size including all dependencies
    dependencies: {            // Complete dependency tree
        [package_id: string]: DependencyInfo;
    };
}
```

### Dependency Information
Each dependency in the tree contains:

```typescript
{
    package_id: string;          // ID of the dependent package
    version: string;             // Actual version being used
    version_range: string;       // Original version range (e.g., "^1.2.3")
    standalone_cost: number;     // Size of just this dependency
    total_cost: number;         // Size including its dependencies
    is_circular?: boolean;      // Marks circular dependencies
    dependencies?: {            // Nested dependencies
        [package_id: string]: DependencyInfo;
    };
}
```

## Cost Calculation

### Standalone Cost
- Represents the size of just the package itself
- Measured in bytes
- Does not include any dependency sizes

### Total Cost
- For regular packages: sum of standalone_cost + all dependencies' total_costs
- For circular dependencies: only includes standalone_cost to prevent double counting

## Example Structure

Here's an example of how dependencies are stored for a package A that depends on B and C, where C depends back on A:

```json
{
    "version_id": "v1",
    "package_id": "A",
    "standalone_cost": 10.0,
    "total_cost": 60.0,
    "dependencies": {
        "B": {
            "package_id": "B",
            "version": "1.0.0",
            "version_range": "^1.0.0",
            "standalone_cost": 20.0,
            "total_cost": 20.0
        },
        "C": {
            "package_id": "C",
            "version": "2.0.0",
            "version_range": "~2.0.0",
            "standalone_cost": 30.0,
            "total_cost": 40.0,
            "dependencies": {
                "A": {
                    "package_id": "A",
                    "version": "1.0.0",
                    "version_range": "^1.0.0",
                    "standalone_cost": 10.0,
                    "total_cost": 10.0,
                    "is_circular": true,
                    "dependencies": {}  // Empty to break the cycle
                }
            }
        }
    }
}
```

## Circular Dependencies

### Detection
- The system tracks dependency paths during resolution using a path array
- When a package is encountered that exists in the current path, it's marked as circular
- Example path tracking: `["A"] -> ["A", "B"] -> ["A", "B", "C"]`

### Handling
1. Circular dependencies are marked with `is_circular: true`
2. Their dependency tree is truncated (empty object)
3. Their total_cost only includes their standalone_cost
4. The cycle is documented but not followed to prevent infinite recursion

## API Efficiency
- Complete dependency information is stored with each package version
- Cost endpoint returns full dependency tree in a single API call
- No need for recursive API calls to calculate total costs
- Circular dependencies are handled gracefully

## Cost Endpoint Example
For a package with ID 357898765 that depends on 988645763, which depends on 454332198:

```json
{
    "357898765": {
        "standaloneCost": 50.0,
        "totalCost": 95.0
    },
    "988645763": {
        "standaloneCost": 20.0,
        "totalCost": 45.0
    },
    "454332198": {
        "standaloneCost": 25.0,
        "totalCost": 25.0
    }
}
```

## Implementation Notes
- Dependencies are calculated and stored at package upload time
- Updates to any package require recalculation of costs for all dependent packages
- The system prioritizes read performance over write performance
- Circular dependencies are allowed but clearly marked in the dependency tree
