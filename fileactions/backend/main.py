from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse, HTMLResponse
from PyPDF2 import PdfMerger
from tempfile import NamedTemporaryFile
import uvicorn
import os
from fastapi import Form
from starlette.background import BackgroundTask

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
        
@app.get("/split-pdf", response_class=HTMLResponse)
async def split_pdf_page(request: Request):
    return templates.TemplateResponse("split_pdf.html", {"request": request})

@app.post("/api/split-pdf/info")
async def get_pdf_info(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        with NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp.flush()
            
            from PyPDF2 import PdfReader
            reader = PdfReader(tmp.name)
            return {"pages": len(reader.pages)}
            
    finally:
        os.unlink(tmp.name)

@app.post("/api/split-pdf/split")
async def split_pdf(
    file: UploadFile = File(...),
    start: int = Form(...),
    end: int = Form(...)
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Save uploaded file temporarily
        with NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp.flush()
            
            # Read PDF and extract pages
            from PyPDF2 import PdfReader, PdfWriter
            reader = PdfReader(tmp.name)
            writer = PdfWriter()
            
            # Validate page range
            if start < 1 or end > len(reader.pages) or start > end:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid page range"
                )
            
            # Add selected pages to new PDF
            for page_num in range(start - 1, end):
                writer.add_page(reader.pages[page_num])
            
            # Save split PDF
            output_file = NamedTemporaryFile(delete=False, suffix=".pdf")
            writer.write(output_file.name)
            
            return FileResponse(
                output_file.name,
                filename="split.pdf",
                media_type="application/pdf",
                background=BackgroundTask(lambda: os.unlink(output_file.name))
            )
            
    finally:
        os.unlink(tmp.name)

# Add similar endpoints for other tools
@app.post("/api/jpg-to-png")
async def jpg_to_png(file: UploadFile = File(...)):
    # Conversion logic would go here
    return {"message": "Conversion endpoint - implement logic"}