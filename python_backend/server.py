import os
import shutil
import subprocess
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tempfile

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/extract")
async def extract_document(file: UploadFile = File(...)):
    # Create a temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        input_path = os.path.join(temp_dir, file.filename)
        
        # Save uploaded file
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir, exist_ok=True)
        
        try:
            # Run marker_single command
            # For Apple Silicon, marker automatically uses MPS if available
            result = subprocess.run(
                ["marker_single", input_path, "--output_dir", output_dir],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Find the .md file in the output directory tree
            md_content = ""
            for root, dirs, files in os.walk(output_dir):
                for f in files:
                    if f.endswith(".md"):
                        with open(os.path.join(root, f), "r", encoding="utf-8") as md_file:
                            md_content = md_file.read()
                        break
                if md_content:
                    break
            
            if not md_content:
                raise Exception(f"Marker failed to produce markdown. Output log: {result.stdout} {result.stderr}")
                
            return {"status": "success", "markdown": md_content}
            
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"Marker execution failed: {e.stderr}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
