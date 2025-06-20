"""
Tổng hợp các controller: ...
"""
from fastapi import APIRouter, HTTPException, Query, Path, Depends, FastAPI, WebSocket, WebSocketDisconnect, Request
from typing import List, Dict, Any
import logging
import asyncio
from starlette.websockets import WebSocketState
from app.services.tong_quan_service import (
    calculate_total_capital_for_all_stocks,
    fetch_all_news,
    fetch_news_by_id,
    get_market_data_service,
    MarketDataService,
    FinancialService,
    IndexService
)
from app.models.tong_quan_model import MarketCapItem, FinancialDataPoint, StockModel
from app.config import settings
from app.cache_manager import cache_manager_instance, cached

logger = logging.getLogger(__name__)

# --- Router API (JSON) ---
router = APIRouter()

# ================= TỔNG VỐN HÓA API =================
@router.get("/capital/total", summary="Tính tổng nguồn vốn cho các cổ phiếu dựa trên tiêu chí")
async def get_total_capital_api_endpoint(
    year: int = Query(2024, description="Năm tài chính, ví dụ: 2023"),
    quarter: str = Query("Q4", description="Quý tài chính, ví dụ: Q1, Q2, Q3, Q4"),
    line_item_id: int = Query(88, description="ID của chỉ tiêu dòng (line item) trong báo cáo tài chính")
):
    logger.info(f"API request to /capital/total with params: year={year}, quarter='{quarter}', line_item_id={line_item_id}")
    
    # Check cache first
    cache_key = "total_capital"
    cached_result = await cache_manager_instance.get(cache_key, year=year, quarter=quarter, line_item_id=line_item_id)
    
    if cached_result:
        logger.info(f"💾 Cache hit for total capital: year={year}, quarter='{quarter}', line_item_id={line_item_id}")
        return cached_result
    
    try:
        total_capital = calculate_total_capital_for_all_stocks(
            year=year,
            quarter=quarter,
            line_item_id=line_item_id
        )
        logger.info(f"Calculated total capital: {total_capital} for params: year={year}, quarter='{quarter}', line_item_id={line_item_id}")
        
        result = {
            "year_queried": year,
            "quarter_queried": quarter,
            "line_item_id_queried": line_item_id,
            "calculated_total_capital": total_capital
        }
        
        # Cache the result for 10 minutes
        await cache_manager_instance.set(cache_key, result, ttl=600, year=year, quarter=quarter, line_item_id=line_item_id)
        
        return result
    except Exception as e:
        logger.exception(f"Lỗi trong API /capital/total: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi máy chủ nội bộ khi tính toán tổng nguồn vốn: {str(e)}")

# ================= NEWS API =================
@router.get("/news", response_model=List[Dict[str, Any]], summary="Get All News")
async def get_news_list():
    # Check cache first
    cache_key = "all_news"
    cached_result = await cache_manager_instance.get(cache_key)
    
    if cached_result:
        logger.info("💾 Cache hit for news list")
        return cached_result
    
    news_list = fetch_all_news()
    
    # Cache for 5 minutes
    await cache_manager_instance.set(cache_key, news_list, ttl=300)
    
    return news_list

@router.get("/news/{news_id}", response_model=Dict[str, Any], summary="Get News By ID")
async def get_news_item_by_id(news_id: int):
    # Check cache first
    cache_key = "news_item"
    cached_result = await cache_manager_instance.get(cache_key, news_id=news_id)
    
    if cached_result:
        logger.info(f"💾 Cache hit for news item: {news_id}")
        return cached_result
    
    news_item = fetch_news_by_id(news_id)
    if news_item is None:
        raise HTTPException(status_code=404, detail="News not found")
    
    # Cache for 10 minutes
    await cache_manager_instance.set(cache_key, news_item, ttl=600, news_id=news_id)
    
    return news_item

# ================= MARKET DATA API =================
@router.get("/market-cap", response_model=List[MarketCapItem], summary="Get Market Capitalization Data")
async def get_market_cap_data_api(
    service: MarketDataService = Depends(get_market_data_service)
) -> List[MarketCapItem]:
    target_line_item_id = 88
    target_year = 2024
    target_quarter = "Q4"
    min_stock_id = 1
    max_stock_id = 27
    
    # Check cache first
    cache_key = "market_cap"
    cached_result = await cache_manager_instance.get(
        cache_key, 
        line_item_id=target_line_item_id,
        year=target_year,
        quarter=target_quarter,
        min_stock_id=min_stock_id,
        max_stock_id=max_stock_id
    )
    
    if cached_result:
        logger.info("💾 Cache hit for market cap data")
        return cached_result
    
    try:
        data = service.get_market_cap(
            line_item_id=target_line_item_id,
            year=target_year,
            quarter=target_quarter,
            min_stock_id=min_stock_id,
            max_stock_id=max_stock_id
        )
        
        # Cache for 15 minutes
        await cache_manager_instance.set(
            cache_key, 
            data, 
            ttl=900,
            line_item_id=target_line_item_id,
            year=target_year,
            quarter=target_quarter,
            min_stock_id=min_stock_id,
            max_stock_id=max_stock_id
        )
        
        return data
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error in market_data_controller: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error in market data controller")

# ================= FINANCIAL DATA API =================
@router.get(
    "/financial/chart-data/{line_item_id}",
    response_model=List[FinancialDataPoint],
    summary="Lấy dữ liệu tài chính cho biểu đồ theo Line Item ID"
)
async def get_financial_data_for_chart_endpoint(
    line_item_id: int = Path(..., description="ID của chỉ số tài chính cần lấy", ge=1),
    service: FinancialService = Depends(FinancialService)
):
    logger.info(f"Controller: Received request at /financial/chart-data/{line_item_id}")
    
    # Check cache first
    cache_key = "financial_chart_data"
    cached_result = await cache_manager_instance.get(cache_key, line_item_id=line_item_id)
    
    if cached_result:
        logger.info(f"💾 Cache hit for financial chart data: {line_item_id}")
        return cached_result
    
    try:
        data = await service.get_chart_data(line_item_id=line_item_id)
        if not data:
            logger.info(f"Controller: No data found for line_item_id={line_item_id}")
        
        # Cache for 20 minutes
        await cache_manager_instance.set(cache_key, data, ttl=1200, line_item_id=line_item_id)
        
        logger.info(f"Controller: Returning data for line_item_id={line_item_id}")
        return data
    except HTTPException as http_exc:
        logger.warning(f"Controller: Re-raising HTTPException from service: {http_exc.status_code} - {http_exc.detail}", exc_info=True)
        raise http_exc
    except Exception as e:
        logger.exception(f"Controller: Unexpected error handling request for line_item_id={line_item_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error in financial data controller")

# ================= INDICES API =================
@router.get("/index/all", summary="Lấy dữ liệu đã xử lý cho tất cả các chỉ số thị trường", response_model=Dict[str, Any])
async def get_all_indices_data_logic(index_service: IndexService = Depends(IndexService)) -> Dict[str, Any]:
    logger.info("API request to /index/all")
    
    # Check cache first
    cache_key = "all_indices"
    cached_result = await cache_manager_instance.get(cache_key)
    
    if cached_result:
        logger.info("💾 Cache hit for all indices data")
        return cached_result
    
    try:
        all_indices_data = await index_service.fetch_and_process_all_indices()
        
        # Cache for 10 minutes (indices data changes frequently)
        await cache_manager_instance.set(cache_key, all_indices_data, ttl=600)
        
        logger.info("Returning data for all market indices via API.")
        return all_indices_data
    except Exception as e:
        logger.exception(f"Unexpected error in API endpoint /index/all: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error while fetching indices data: {str(e)}")

# ================= BATCH API ENDPOINT (NEW) =================
@router.get("/batch/dashboard-data", summary="Lấy tất cả dữ liệu dashboard trong một lần gọi")
async def get_batch_dashboard_data():
    """
    Endpoint mới để lấy tất cả dữ liệu cần thiết cho dashboard trong một lần gọi
    Giúp giảm số lượng request và cải thiện hiệu suất
    """
    logger.info("API request to /batch/dashboard-data")
    
    # Check cache first
    cache_key = "batch_dashboard"
    cached_result = await cache_manager_instance.get(cache_key)
    
    if cached_result:
        logger.info("💾 Cache hit for batch dashboard data")
        return cached_result
    
    try:
        # Fetch all data in parallel
        tasks = [
            get_news_list(),
            get_market_cap_data_api(get_market_data_service()),
            get_all_indices_data_logic(IndexService())
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        batch_data = {
            "news": results[0] if not isinstance(results[0], Exception) else [],
            "market_cap": results[1] if not isinstance(results[1], Exception) else [],
            "indices": results[2] if not isinstance(results[2], Exception) else {},
            "timestamp": asyncio.get_event_loop().time()
        }
        
        # Cache for 5 minutes
        await cache_manager_instance.set(cache_key, batch_data, ttl=300)
        
        logger.info("Returning batch dashboard data")
        return batch_data
        
    except Exception as e:
        logger.exception(f"Unexpected error in batch dashboard data: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error while fetching batch data: {str(e)}")

# --- WebSocket Stock Updates ---
def setup_stock_websocket_routes(app: FastAPI):
    stock_model = StockModel()
    @app.websocket("/ws/stock-updates")
    async def websocket_stock_endpoint(websocket: WebSocket):
        await websocket.accept()
        client_host = websocket.client.host if websocket.client else "unknown"
        client_port = websocket.client.port if websocket.client else "unknown"
        logger.info(f"WebSocket connection accepted from {client_host}:{client_port}")
        try:
            while True:
                if not (websocket.application_state == WebSocketState.CONNECTED and \
                        websocket.client_state == WebSocketState.CONNECTED):
                    logger.info(f"WebSocket no longer connected for {client_host}:{client_port}. Breaking send loop.")
                    break
                data = await stock_model.fetch_stock_data()
                if data is None:
                    logger.warning(f"StockModel returned None for {client_host}:{client_port}. Sending keep-alive or error.")
                    interval = getattr(settings, 'WEBSOCKET_STOCK_INTERVAL_SECONDS', 10)
                    await asyncio.sleep(interval)
                    continue
                if websocket.application_state == WebSocketState.CONNECTED and \
                   websocket.client_state == WebSocketState.CONNECTED:
                    if isinstance(data, dict) and "error" in data:
                        logger.warning(f"Error fetching stock data from model: {data['error']}. Sending to client {client_host}:{client_port}.")
                        await websocket.send_json(data)
                    elif isinstance(data, list) and not data:
                        logger.info(f"StockModel returned empty list for {client_host}:{client_port}. Nothing to send.")
                    else:
                        await websocket.send_json(data)
                else:
                    logger.info(f"WebSocket disconnected before sending data to {client_host}:{client_port}. Breaking loop.")
                    break
                interval = getattr(settings, 'WEBSOCKET_STOCK_INTERVAL_SECONDS', 10)
                await asyncio.sleep(interval)
        except WebSocketDisconnect as e:
            logger.info(f"WebSocket disconnected by client {client_host}:{client_port}. Code: {e.code}. Reason: {e.reason}")
        except asyncio.CancelledError:
            logger.info(f"WebSocket task cancelled for {client_host}:{client_port}.")
        except Exception as e:
            logger.error(f"Unexpected WebSocket error for {client_host}:{client_port}: {e}", exc_info=True)
            if websocket.application_state == WebSocketState.CONNECTED and \
               websocket.client_state == WebSocketState.CONNECTED:
                try:
                    await websocket.send_json({"event": "error", "message": f"Server error: {str(e)}"})
                except Exception as send_error:
                    logger.error(f"Failed to send error message via WebSocket to {client_host}:{client_port}: {send_error}")
        finally:
            logger.info(f"Cleaning up WebSocket connection for {client_host}:{client_port}.")
            if websocket.application_state != WebSocketState.DISCONNECTED:
                try:
                    await websocket.close(code=1000)
                    logger.info(f"WebSocket connection explicitly closed for {client_host}:{client_port}.")
                except RuntimeError as e:
                    logger.warning(f"RuntimeError while trying to close WebSocket for {client_host}:{client_port} (possibly already closed): {e}")
                except Exception as close_error:
                    logger.error(f"Error during WebSocket close for {client_host}:{client_port}: {close_error}", exc_info=True)
            else:
                logger.info(f"WebSocket for {client_host}:{client_port} was already in DISCONNECTED state.")
