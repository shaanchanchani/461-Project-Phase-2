import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PackageRegistry from '../PackageRegistry';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

describe('PackageRegistry', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockClear();
    });

    it('should render upload dialog when upload button is clicked', async () => {
        render(<PackageRegistry />);
        
        const uploadButton = screen.getByText(/Upload Package/i);
        await userEvent.click(uploadButton);
        
        expect(screen.getByText(/Upload a Package/i)).toBeInTheDocument();
    });

    it('should validate GitHub URLs correctly', async () => {
        render(<PackageRegistry />);
        
        // Open upload dialog
        const uploadButton = screen.getByText(/Upload Package/i);
        await userEvent.click(uploadButton);
        
        // Find URL input and submit button
        const urlInput = screen.getByPlaceholderText(/Enter package URL/i);
        const submitButton = screen.getByText(/Upload/i);
        
        // Test invalid URL
        await userEvent.type(urlInput, 'invalid-url');
        await userEvent.click(submitButton);
        
        expect(screen.getByText(/Please enter a valid GitHub or npm package URL/i)).toBeInTheDocument();
    });

    it('should handle successful package upload', async () => {
        const mockResponse = {
            metadata: {
                Name: 'test-package',
                Version: '1.0.0',
                ID: '123'
            }
        };
        
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            })
        );

        render(<PackageRegistry />);
        
        // Open upload dialog
        const uploadButton = screen.getByText(/Upload Package/i);
        await userEvent.click(uploadButton);
        
        // Fill and submit form
        const urlInput = screen.getByPlaceholderText(/Enter package URL/i);
        await userEvent.type(urlInput, 'https://github.com/owner/repo');
        
        const submitButton = screen.getByText(/Upload/i);
        await userEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText(/Package test-package@1.0.0 uploaded successfully!/i)).toBeInTheDocument();
        });
    });

    it('should handle duplicate package error', async () => {
        (global.fetch as jest.Mock).mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                status: 409,
                json: () => Promise.resolve({
                    error: 'Package repo already exists in the registry'
                })
            })
        );

        render(<PackageRegistry />);
        
        // Open upload dialog
        const uploadButton = screen.getByText(/Upload Package/i);
        await userEvent.click(uploadButton);
        
        // Fill and submit form
        const urlInput = screen.getByPlaceholderText(/Enter package URL/i);
        await userEvent.type(urlInput, 'https://github.com/owner/repo');
        
        const submitButton = screen.getByText(/Upload/i);
        await userEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText(/Package repo already exists in the registry/i)).toBeInTheDocument();
        });
    });

    it('should handle file upload validation', async () => {
        render(<PackageRegistry />);
        
        // Open upload dialog
        const uploadButton = screen.getByText(/Upload Package/i);
        await userEvent.click(uploadButton);
        
        // Switch to file upload
        const fileTab = screen.getByText(/File Upload/i);
        await userEvent.click(fileTab);
        
        // Create a test file
        const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
        const fileInput = screen.getByLabelText(/Choose file/i);
        
        await userEvent.upload(fileInput, file);
        
        const submitButton = screen.getByText(/Upload/i);
        await userEvent.click(submitButton);
        
        expect(screen.getByText(/File must be a ZIP archive/i)).toBeInTheDocument();
    });
});
