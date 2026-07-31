<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Verification Using the Mock Server

When verifying new features and bug fixes, do not use the real Raindrop.io API. Instead, use the provided mock server to ensure a consistent and isolated environment.

1.  Run the application in mock mode:
    ```bash
    npm run dev:mock
    ```
2.  This script uses `concurrently` to start both the mock backend server and the Next.js development server. It automatically sets the necessary environment variables (`NEXT_PUBLIC_RAINDROP_API_URL`, `RAINDROP_TOKEN_URL`, and `NEXT_PUBLIC_RAINDROP_AUTH_URL`) to point to the mock server.
3.  Perform your frontend and backend verification using this environment.
