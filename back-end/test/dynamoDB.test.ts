// import { DynamoDBService } from '../src/services/dynamoDBService';
// import { 
//     UserTableItem,
//     UserGroupTableItem,
//     PackageTableItem, 
//     PackageVersionTableItem,
//     PackageMetricsTableItem,
//     DownloadTableItem
// } from '../src/types';
// import { 
//     DynamoDBClient,
//     ScanCommand,
//     BatchWriteItemCommand 
// } from "@aws-sdk/client-dynamodb";
// import { 
//     DynamoDBDocumentClient, 
//     PutCommand, 
//     QueryCommand, 
//     GetCommand, 
//     UpdateCommand
// } from "@aws-sdk/lib-dynamodb";

// describe('DynamoDBService', () => {
//     let service: DynamoDBService;
//     let mockDocClientSend: jest.Mock;
//     let mockBaseClientSend: jest.Mock;

//     beforeEach(() => {
//         jest.clearAllMocks();
//         mockDocClientSend = jest.fn();
//         mockBaseClientSend = jest.fn();
        
//         // Mock both clients
//         service = new DynamoDBService();
//         (service as any).docClient.send = mockDocClientSend;
//         (service as any).baseClient.send = mockBaseClientSend;
//     });

//     describe('User Operations', () => {
//         describe('createUser', () => {
//             it('should create a new user successfully', async () => {
//                 mockDocClientSend.mockResolvedValueOnce({ Items: [] }); // No existing user
//                 mockDocClientSend.mockResolvedValueOnce({}); // Successful put

//                 await service.createUser('testuser', 'password123', 'uploader');

//                 expect(mockDocClientSend).toHaveBeenLastCalledWith(
//                     expect.objectContaining({
//                         input: {
//                             TableName: 'Users',
//                             Item: expect.objectContaining({
//                                 username: 'testuser',
//                                 role: 'uploader',
//                                 user_id: expect.any(String),
//                                 password_hash: expect.any(String),
//                                 created_at: expect.any(String)
//                             })
//                         }
//                     })
//                 );
//             });

//             it('should throw error if username already exists', async () => {
//                 const existingUser: UserTableItem = {
//                     user_id: 'existing-uuid',
//                     username: 'testuser',
//                     password_hash: 'hash',
//                     role: 'uploader',
//                     created_at: new Date().toISOString()
//                 };

//                 mockDocClientSend.mockResolvedValueOnce({ Items: [existingUser] });

//                 await expect(service.createUser('testuser', 'password123', 'uploader'))
//                     .rejects.toThrow('Username testuser already exists');
//             });
//         });

//         describe('createAdminUser', () => {
//             it('should create an admin user successfully', async () => {
//                 mockDocClientSend.mockResolvedValueOnce({ Items: [] });
//                 mockDocClientSend.mockResolvedValueOnce({});

//                 await service.createAdminUser('admin', 'adminpass');

//                 expect(mockDocClientSend).toHaveBeenLastCalledWith(
//                     expect.objectContaining({
//                         input: {
//                             TableName: 'Users',
//                             Item: expect.objectContaining({
//                                 username: 'admin',
//                                 role: 'admin'
//                             })
//                         }
//                     })
//                 );
//             });
//         });
//     });

//     describe('Group Operations', () => {
//         describe('createGroup', () => {
//             it('should create a new group successfully', async () => {
//                 mockDocClientSend.mockResolvedValueOnce({ Items: [] });
//                 mockDocClientSend.mockResolvedValueOnce({});

//                 await service.createGroup('developers');

//                 expect(mockDocClientSend).toHaveBeenLastCalledWith(
//                     expect.objectContaining({
//                         input: {
//                             TableName: 'UserGroups',
//                             Item: expect.objectContaining({
//                                 group_name: 'developers',
//                                 group_id: expect.any(String)
//                             })
//                         }
//                     })
//                 );
//             });
//         });

//         describe('addUserToGroup', () => {
//             it('should add user to group successfully', async () => {
//                 const mockUser: UserTableItem = {
//                     user_id: 'user-uuid',
//                     username: 'testuser',
//                     password_hash: 'hash',
//                     role: 'uploader',
//                     created_at: new Date().toISOString()
//                 };

//                 const mockGroup: UserGroupTableItem = {
//                     group_id: 'group-uuid',
//                     group_name: 'developers'
//                 };

//                 mockDocClientSend.mockResolvedValueOnce({ Item: mockUser });
//                 mockDocClientSend.mockResolvedValueOnce({ Item: mockGroup });
//                 mockDocClientSend.mockResolvedValueOnce({});

//                 await service.addUserToGroup('user-uuid', 'group-uuid');

//                 expect(mockDocClientSend).toHaveBeenLastCalledWith(
//                     expect.objectContaining({
//                         input: {
//                             TableName: 'Users',
//                             Key: { user_id: 'user-uuid' },
//                             UpdateExpression: 'SET group_id = :groupId',
//                             ExpressionAttributeValues: { ':groupId': 'group-uuid' }
//                         }
//                     })
//                 );
//             });
//         });
//         describe('Package Operations', () => {
//             describe('createPackageEntry', () => {
//                 it('should create a package entry successfully', async () => {
//                     const mockPackage: PackageTableItem = {
//                         package_id: 'pkg-123',
//                         name: 'test-package',
//                         latest_version: '1.0.0',
//                         description: 'Test package',
//                         created_at: new Date().toISOString(),
//                         user_id: 'user-123'
//                     };
        
//                     mockDocClientSend.mockResolvedValueOnce({ Items: [] }); // No existing package
//                     mockDocClientSend.mockResolvedValueOnce({}); // Successful put
        
//                     await service.createPackageEntry(mockPackage);
        
//                     expect(mockDocClientSend).toHaveBeenLastCalledWith(
//                         expect.objectContaining({
//                             input: {
//                                 TableName: 'Packages',
//                                 Item: mockPackage
//                             }
//                         })
//                     );
//                 });
        
//                 it('should throw error if package already exists', async () => {
//                     const mockPackage: PackageTableItem = {
//                         package_id: 'pkg-123',
//                         name: 'test-package',
//                         latest_version: '1.0.0',
//                         description: 'Test package',
//                         created_at: new Date().toISOString(),
//                         user_id: 'user-123'
//                     };
        
//                     mockDocClientSend.mockResolvedValueOnce({ Items: [mockPackage] });
        
//                     await expect(service.createPackageEntry(mockPackage))
//                         .rejects.toThrow(`Package ${mockPackage.name} already exists`);
//                 });
//             });
        
//             describe('getPackageByName', () => {
//                 it('should return package when found', async () => {
//                     const mockPackage: PackageTableItem = {
//                         package_id: 'pkg-123',
//                         name: 'test-package',
//                         latest_version: '1.0.0',
//                         description: 'Test package',
//                         created_at: new Date().toISOString(),
//                         user_id: 'user-123'
//                     };
        
//                     mockDocClientSend.mockResolvedValue({ Items: [mockPackage] });
        
//                     const result = await service.getPackageByName('test-package');
//                     expect(result).toEqual(mockPackage);
//                 });
        
//                 it('should return null when package not found', async () => {
//                     mockDocClientSend.mockResolvedValue({ Items: [] });
//                     const result = await service.getPackageByName('nonexistent');
//                     expect(result).toBeNull();
//                 });
//             });
        
//             describe('getPackageVersions', () => {
//                 it('should return all versions of a package', async () => {
//                     const mockVersions: PackageVersionTableItem[] = [
//                         {
//                             version_id: 'v1',
//                             package_id: 'pkg-123',
//                             version: '1.0.0',
//                             zip_file_path: 's3://test/1.0.0',
//                             debloated: false,
//                             created_at: new Date().toISOString()
//                         },
//                         {
//                             version_id: 'v2',
//                             package_id: 'pkg-123',
//                             version: '1.1.0',
//                             zip_file_path: 's3://test/1.1.0',
//                             debloated: false,
//                             created_at: new Date().toISOString()
//                         }
//                     ];
        
//                     mockDocClientSend.mockResolvedValue({ Items: mockVersions });
        
//                     const result = await service.getPackageVersions('pkg-123');
//                     expect(result).toEqual(mockVersions);
//                 });
//             });
        
//             describe('createPackageVersion', () => {
//                 it('should create a package version successfully', async () => {
//                     const mockVersion: PackageVersionTableItem = {
//                         version_id: 'v1',
//                         package_id: 'pkg-123',
//                         version: '1.0.0',
//                         zip_file_path: 's3://test/1.0.0',
//                         debloated: false,
//                         created_at: new Date().toISOString()
//                     };
        
//                     mockDocClientSend.mockResolvedValue({});
        
//                     await service.createPackageVersion(mockVersion);
        
//                     expect(mockDocClientSend).toHaveBeenCalledWith(
//                         expect.objectContaining({
//                             input: {
//                                 TableName: 'PackageVersions',
//                                 Item: mockVersion
//                             }
//                         })
//                     );
//                 });
//             });
//         });
//         describe('Table Clearing Operations', () => {
//             describe('clearTable', () => {
//                 it('should clear all items from a table', async () => {
//                     // Mock initial scan using baseClient
//                     mockBaseClientSend
//                         .mockResolvedValueOnce({ Items: [{ id: '1' }] }) // Initial check
//                         .mockResolvedValueOnce({ // Full scan
//                             Items: [
//                                 { user_id: '1' },
//                                 { user_id: '2' }
//                             ]
//                         })
//                         .mockResolvedValueOnce({}); // Batch delete
    
//                     await service.clearTable('Users');
    
//                     expect(mockBaseClientSend).toHaveBeenCalledWith(
//                         expect.objectContaining({
//                             input: {
//                                 TableName: 'Users',
//                                 Limit: 1
//                             }
//                         })
//                     );
//                 });
    
//                 it('should handle empty table', async () => {
//                     mockBaseClientSend.mockResolvedValueOnce({ Items: [] });
    
//                     await service.clearTable('Users');
    
//                     expect(mockBaseClientSend).toHaveBeenCalledTimes(1);
//                 });
    
//                 it('should handle non-existent table', async () => {
//                     mockBaseClientSend.mockRejectedValueOnce({ 
//                         name: 'ResourceNotFoundException' 
//                     });
    
//                     await service.clearTable('NonExistentTable');
    
//                     expect(mockBaseClientSend).toHaveBeenCalledTimes(1);
//                 });
//             });
    
//             describe('clearAllTables', () => {
//                 it('should attempt to clear all tables', async () => {
//                     // Mock empty responses for all tables
//                     mockBaseClientSend.mockResolvedValue({ Items: [] });
    
//                     await service.clearAllTables();
    
//                     // Should attempt to clear all tables
//                     const expectedTables = [
//                         'Packages', 'PackageVersions', 'PackageMetrics', 
//                         'Downloads', 'Users', 'UserGroups'
//                     ];
    
//                     expectedTables.forEach(tableName => {
//                         expect(mockBaseClientSend).toHaveBeenCalledWith(
//                             expect.objectContaining({
//                                 input: expect.objectContaining({
//                                     TableName: tableName
//                                 })
//                             })
//                         );
//                     });
//                 });
    
//                 it('should handle errors during clearing', async () => {
//                     mockBaseClientSend.mockRejectedValueOnce(new Error('Clear failed'));
    
//                     await expect(service.clearAllTables())
//                         .rejects.toThrow('Clear failed');
//                 });
//             });
//         });
//     });
// });