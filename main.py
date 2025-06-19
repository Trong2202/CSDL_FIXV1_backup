from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
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
async def home(request: Request, bank_code: str = "VCB"):
    """Trang chủ hiển thị thông tin cổ phiếu (stock page)"""
    return await get_home(request, bank_code)

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