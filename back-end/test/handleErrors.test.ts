import axios, { AxiosError, isAxiosError, AxiosResponse } from "axios";
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { 
  _handleError, 
  GitHubRateLimitError, 
  GitHubAuthError, 
  GitHubNotFoundError,
  GitHubClientError,
  GitHubServerError
} from "../src/apiProcess/gitApiProcess";

describe("_handleError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle rate limit exceeded error (403)", async () => {
    const error: AxiosError = new AxiosError(
      "Rate limit exceeded",
      "403",
      undefined,
      {
        url: "https://api.example.com/resource",
        method: "get",
        headers: {
          "Content-Type": "application/json",
          "x-rate-limit-limit": "60",
          "x-rate-limit-remaining": "0",
          "x-rate-limit-reset": "1377013266",
        },
      } as AxiosRequestConfig,
      {
        data: {
          message: "Rate limit exceeded",
        },
        status: 403,
        statusText: "Forbidden",
        headers: {
          "Content-Type": "application/json",
          "x-ratelimit-limit": "60",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1377013266",
        },
        config: {} as InternalAxiosRequestConfig,
        request: {},
      } as AxiosResponse,
    );
    const context = "Rate limit test";

    expect(() => _handleError(error, context)).toThrow(GitHubRateLimitError);
    expect(() => _handleError(error, context)).toThrow("Rate limit exceeded.");
  });

  it("should handle invalid or missing GitHUb Token error (401)", async () => {
    const error: AxiosError = new AxiosError(
      "Invalid token",
      "401",
      undefined,
      {
        url: "https://api.example.com/resource",
        method: "get",
        headers: {},
      } as AxiosRequestConfig,
      {
        data: {
          message: "Invalid token",
        },
        status: 401,
        statusText: "Invalid token",
        headers: {},
        config: {} as InternalAxiosRequestConfig,
        request: {},
      } as AxiosResponse,
    );
    const context = "Invalid token test";

    expect(() => _handleError(error, context)).toThrow(GitHubAuthError);
    expect(() => _handleError(error, context)).toThrow("Unauthorized. Invalid or missing GitHub Token.");
  });

  it("should handle invalid URL (404)", async () => {
    const error: AxiosError = new AxiosError(
      "Not Found",
      "404",
      undefined,
      {
        url: "https://api.example.com/resource",
        method: "get",
        headers: {},
      } as AxiosRequestConfig,
      {
        data: {
          message: "Not Found",
        },
        status: 404,
        statusText: "Not Found",
        headers: {},
        config: {} as InternalAxiosRequestConfig,
        request: {},
      } as AxiosResponse,
    );
    const context = "Invalid URL Test";

    expect(() => _handleError(error, context)).toThrow(GitHubNotFoundError);
    expect(() => _handleError(error, context)).toThrow("Not Found. Invalid URL.");
  });

  it("should handle between 400 and 500 (406)", async () => {
    const error: AxiosError = new AxiosError(
      "Client Error",
      "406",
      undefined,
      {
        url: "https://api.example.com/resource",
        method: "get",
        headers: {},
      } as AxiosRequestConfig,
      {
        data: {
          message: "Client Error",
        },
        status: 406,
        statusText: "Client Error",
        headers: {},
        config: {} as InternalAxiosRequestConfig,
        request: {},
      } as AxiosResponse,
    );
    const context = "Client Error Test";

    expect(() => _handleError(error, context)).toThrow(GitHubClientError);
    expect(() => _handleError(error, context)).toThrow(/Client error: 406/);
  });

  it("should handle between 500 and 600 (506)", async () => {
    const error: AxiosError = new AxiosError(
      "Server Error",
      "506",
      undefined,
      {
        url: "https://api.example.com/resource",
        method: "get",
        headers: {},
      } as AxiosRequestConfig,
      {
        data: {
          message: "Server Error",
        },
        status: 506,
        statusText: "Server Error",
        headers: {},
        config: {} as InternalAxiosRequestConfig,
        request: {},
      } as AxiosResponse,
    );
    const context = "Server Error Test";

    expect(() => _handleError(error, context)).toThrow(GitHubServerError);
    expect(() => _handleError(error, context)).toThrow(/Server error: 506/);
  });

  it("should handle unknown error", async () => {
    const error = new Error("Unknown Error");
    const context = "Unknown Error Test";

    expect(() => _handleError(error, context)).toThrow(Error);
    expect(() => _handleError(error, context)).toThrow(/Unexpected error:/);
  });
});
