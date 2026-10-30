import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print("=" * 60)
    print(f"🚀 Starting FastAPI Voicebot Backend on http://127.0.0.1:{port}")
    print(f"📖 Interactive Swagger Docs: http://127.0.0.1:{port}/docs")
    print(f"🩺 Health Check Endpoint: http://127.0.0.1:{port}/api/health")
    print("=" * 60)
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)

