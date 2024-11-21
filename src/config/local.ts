// src/config/local.ts
export const localConfig = {
    aws: {
        region: 'local',
        endpoint: 'http://localhost:8000',
        credentials: {
            accessKeyId: 'local',
            secretAccessKey: 'local'
        }
    }
};