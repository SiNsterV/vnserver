from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse, HTMLResponse
from PyPDF2 import PdfMerger
from tempfile import NamedTemporaryFile
import uvicorn
import os

app = FastAPI()

# Mount static files (CSS, JS)
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# Templates
templates = Jinja2Templates(directory="frontend/templates")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/combine-pdfs", response_class=HTMLResponse)
async def combine_pdfs_page(request: Request):
    return templates.TemplateResponse("combine_pdfs.html", {"request": request})

# Example endpoint for combining PDFs
@app.post("/api/combine-pdfs")
async def combine_pdfs(files: list[UploadFile] = File(...)):
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="At least 2 files required")
    
    merger = PdfMerger()
    
    for file in files:
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="All files must be PDFs")
        
        merger.append(file.file)
    
    # Create a temporary file to store the merged PDF
    with NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        merger.write(tmp.name)
        merger.close()
        
        # Return the file
        return FileResponse(
            tmp.name,
            filename="combined.pdf",
            media_type="application/pdf"
        )

# Add similar endpoints for other tools
@app.post("/api/jpg-to-png")
async def jpg_to_png(file: UploadFile = File(...)):
    # Conversion logic would go here
    return {"message": "Conversion endpoint - implement logic"}