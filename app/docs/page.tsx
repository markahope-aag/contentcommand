"use client";

import { useEffect, useRef } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function DocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Custom CSS for better integration with our app theme
    const style = document.createElement("style");
    style.textContent = `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { color: #1f2937; }
      .swagger-ui .scheme-container { background: #f9fafb; }
      .swagger-ui .opblock.opblock-post { border-color: #059669; }
      .swagger-ui .opblock.opblock-get { border-color: #0ea5e9; }
      .swagger-ui .opblock.opblock-put { border-color: #f59e0b; }
      .swagger-ui .opblock.opblock-delete { border-color: #dc2626; }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
          <p className="mt-1 text-sm text-gray-600">
            Interactive API documentation for Content Command
          </p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8" ref={containerRef}>
        <SwaggerUI
          url="/api/docs"
          docExpansion="list"
          defaultModelsExpandDepth={1}
          defaultModelExpandDepth={1}
          displayOperationId={false}
          displayRequestDuration={true}
          filter={true}
          showExtensions={true}
          showCommonExtensions={true}
          tryItOutEnabled={true}
          requestInterceptor={(req) => {
            // Add auth header if user is authenticated
            const token = localStorage.getItem("supabase.auth.token");
            if (token) {
              req.headers.Authorization = `Bearer ${token}`;
            }
            return req;
          }}
          onComplete={() => {
            // Custom completion handler
            console.log("Swagger UI loaded successfully");
          }}
        />
      </div>
    </div>
  );
}