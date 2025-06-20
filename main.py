from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from contextlib import asynccontextmanager
from app.controllers.tong_quan_controller import router as priceboard_router, setup_stock_websocket_routes
from app.controllers.information_controller import router as information_router
from app.controllers.analytics_controller import router as analytics_router
from app.controllers.report_controller import router as report_router
from app.controllers.stock_controller import router as stock_router, get_home
from app.cache_manager import init_cache, cleanup_cache, cache_manager_instance

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_cache()
    yield
    # Shutdown  
    await cleanup_cache()

app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

setup_stock_websocket_routes(app)

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Trang chủ hiển thị priceboard (thị trường)"""
    return templates.TemplateResponse("priceboard.html", {"request": request})

@app.get("/priceboard", response_class=HTMLResponse)
async def priceboard_html(request: Request):
    """Trang tổng quan dashboard"""
    return templates.TemplateResponse("priceboard.html", {"request": request})

@app.get("/information", response_class=HTMLResponse)
async def information_html(request: Request):
    """Trang báo cáo tài chính"""
    return templates.TemplateResponse("information.html", {"request": request})

@app.get("/report", response_class=HTMLResponse)
async def report_html(request: Request):
    """Trang báo cáo"""
    return templates.TemplateResponse("report.html", {"request": request})

@app.get("/analytics", response_class=HTMLResponse)
async def analytics_html(request: Request):
    """Trang phân tích PowerBI"""
    return templates.TemplateResponse("analytics.html", {"request": request})

@app.get("/stock", response_class=HTMLResponse)
async def stock_html(request: Request, bank_code: str = "VCB"):
    """Trang thông tin chi tiết cổ phiếu"""
    return await get_home(request, bank_code)

# === IMPROVED PARTIAL CONTENT API ENDPOINTS ===
async def extract_main_content_from_template(template_name: str, context: dict):
    """Helper function to extract main content from template"""
    try:
        # Render the full template
        response = templates.TemplateResponse(template_name, context)
        content = response.body.decode('utf-8')
        
        # Extract main content using regex
        import re
        # Updated regex to handle multi-line and nested content better
        main_pattern = r'<main[^>]*id=["\']main["\'][^>]*>(.*?)</main>'
        match = re.search(main_pattern, content, re.DOTALL | re.IGNORECASE)
        
        if match:
            main_content = match.group(1).strip()
            
            # Extract extra scripts block
            scripts_pattern = r'{% block extra_scripts %}(.*?){% endblock %}'
            scripts_match = re.search(scripts_pattern, content, re.DOTALL)
            extra_scripts = scripts_match.group(1).strip() if scripts_match else ""
            
            # Also extract any script tags inside the main content
            script_tags_pattern = r'<script[^>]*>(.*?)</script>'
            script_matches = re.findall(script_tags_pattern, main_content, re.DOTALL | re.IGNORECASE)
            inline_scripts = '\n'.join(script_matches) if script_matches else ""
            
            combined_scripts = f"{extra_scripts}\n{inline_scripts}".strip()
            
            return {
                "content": main_content,
                "scripts": combined_scripts
            }
        else:
            return {"error": "Could not extract main content"}
            
    except Exception as e:
        return {"error": f"Template rendering error: {str(e)}"}

@app.get("/api/partial/priceboard")
async def priceboard_partial(request: Request):
    """API trả về chỉ phần main content của priceboard"""
    result = await extract_main_content_from_template("priceboard.html", {"request": request})
    
    if "error" in result:
        return JSONResponse(result, status_code=500)
    
    return JSONResponse({
        "content": result["content"],
        "scripts": result["scripts"],
        "title": "Tổng Quan Tài Chính & Chứng Khoán"
    })

@app.get("/api/partial/information")
async def information_partial(request: Request):
    """API trả về chỉ phần main content của information"""
    result = await extract_main_content_from_template("information.html", {"request": request})
    
    if "error" in result:
        return JSONResponse(result, status_code=500)
    
    return JSONResponse({
        "content": result["content"],
        "scripts": result["scripts"],
        "title": "Báo cáo tài chính"
    })

@app.get("/api/partial/report")
async def report_partial(request: Request):
    """API trả về chỉ phần main content của report"""
    result = await extract_main_content_from_template("report.html", {"request": request})
    
    if "error" in result:
        return JSONResponse(result, status_code=500)
    
    return JSONResponse({
        "content": result["content"],
        "scripts": result["scripts"],
        "title": "Đánh giá"
    })

@app.get("/api/partial/analytics")
async def analytics_partial(request: Request):
    """API trả về chỉ phần main content của analytics"""
    result = await extract_main_content_from_template("analytics.html", {"request": request})
    
    if "error" in result:
        return JSONResponse(result, status_code=500)
    
    return JSONResponse({
        "content": result["content"],
        "scripts": result["scripts"],
        "title": "Phân tích"
    })

@app.get("/api/partial/stock")
async def stock_partial(request: Request, bank_code: str = "VCB"):
    """API trả về chỉ phần main content của stock"""
    try:
        # Get the full response from stock controller
        full_response = await get_home(request, bank_code)
        content = full_response.body.decode('utf-8')
        
        # Extract main content using regex
        import re
        main_pattern = r'<main[^>]*id=["\']main["\'][^>]*>(.*?)</main>'
        match = re.search(main_pattern, content, re.DOTALL | re.IGNORECASE)
        
        if match:
            main_content = match.group(1).strip()
            
            # Extract scripts
            scripts_pattern = r'{% block extra_scripts %}(.*?){% endblock %}'
            scripts_match = re.search(scripts_pattern, content, re.DOTALL)
            extra_scripts = scripts_match.group(1).strip() if scripts_match else ""
            
            # Extract inline scripts
            script_tags_pattern = r'<script[^>]*>(.*?)</script>'
            script_matches = re.findall(script_tags_pattern, main_content, re.DOTALL | re.IGNORECASE)
            inline_scripts = '\n'.join(script_matches) if script_matches else ""
            
            combined_scripts = f"{extra_scripts}\n{inline_scripts}".strip()
            
            return JSONResponse({
                "content": main_content,
                "scripts": combined_scripts,
                "title": f"Thông tin cổ phiếu {bank_code}"
            })
        else:
            return JSONResponse({"error": "Could not extract main content"}, status_code=500)
            
    except Exception as e:
        return JSONResponse({"error": f"Error processing stock data: {str(e)}"}, status_code=500)

# Cache status endpoint for monitoring
@app.get("/api/cache/stats")
async def get_cache_stats():
    """API để kiểm tra trạng thái cache"""
    return await cache_manager_instance.get_stats()

@app.post("/api/cache/clear")
async def clear_cache():
    """API để xóa cache (for admin/debugging)"""
    await cache_manager_instance.clear_all()
    return {"message": "Cache cleared successfully"}

# Include API routers
app.include_router(stock_router, prefix="/api", tags=["Stock API"])
app.include_router(priceboard_router, prefix="/api", tags=["Priceboard API"])
app.include_router(information_router, prefix="/api", tags=["Information API"])
app.include_router(analytics_router, prefix="/api", tags=["Analytics API"])
app.include_router(report_router, prefix="/api", tags=["Report API"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)