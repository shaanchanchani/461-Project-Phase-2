import { 
    Package, PackageMetadata, PackageData, User, 
    PackageQuery, ProcessedPackage, PackageRating,
    DB
} from '../src/types';

describe('Types', () => {
    describe('DB Conversion Functions', () => {
        test('toAPIPackage should convert DynamoDB item to Package', () => {
            const dynamoItem: DB.DynamoPackageItem = {
                PK: 'PKG#123',
                SK: 'METADATA#1.0.0',
                type: 'package',
                metadata: {
                    Name: 'test-package',
                    Version: '1.0.0',
                    ID: '123'
                },
                data: {
                    URL: 'https://example.com'
                },
                createdAt: '2024-01-01T00:00:00Z'
            };

            const result = DB.toAPIPackage(dynamoItem);
            expect(result.metadata).toEqual(dynamoItem.metadata);
            expect(result.data).toEqual(dynamoItem.data);
        });

        test('toDynamoPackage should convert Package to DynamoDB item', () => {
            const pkg: Package = {
                metadata: {
                    Name: 'test-package',
                    Version: '1.0.0',
                    ID: '123'
                },
                data: {
                    URL: 'https://example.com'
                }
            };

            const result = DB.toDynamoPackage(pkg);
            expect(result.type).toBe('package');
            expect(result.metadata).toEqual(pkg.metadata);
            expect(result.data).toEqual(pkg.data);
        });
    });
});