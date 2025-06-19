"""
Optimized Tong Quan Service with async operations and intelligent caching
"""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any, Optional
import pandas as pd
from datetime import datetime, timedelta

from supabase import Client
from fastapi import Depends, HTTPException
from vnstock import Vnstock

from app.config import get_supabase_client, settings
from app.models.tong_quan_model import MarketCapItem, FinancialDataPoint
from app.services.cache_service import (
    cache_service, cache_financial_data, cache_market_data, 
    cache_news_data, CacheKeys
)

logger = logging.getLogger(__name__)

# ===== OPTIMIZED CAPITAL CALCULATION SERVICE =====
@cache_financial_data(ttl=settings.CACHE_FINANCIAL_TTL)
async def calculate_total_capital_async(
    year: int,
    quarter: str,
    line_item_id: int
) -> float:
    """Async version of total capital calculation with caching"""
    cache_key = CacheKeys.TOTAL_CAPITAL.format(
        year=year, quarter=quarter, line_item_id=line_item_id
    )
    
    # Check cache first
    cached_result = await cache_service.get(cache_key)
    if cached_result is not None:
        logger.debug(f"Cache hit for total capital: {cache_key}")
        return cached_result
    
    supabase = get_supabase_client()
    total_value = 0.0
    
    logger.info(f"Computing total capital for year={year}, quarter='{quarter}', line_item_id={line_item_id}")
    
    try:
        # Run database operations in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        
        # Fetch financial reports
        reports_response = await loop.run_in_executor(
            None,
            lambda: supabase.table("financial_reports")
            .select("report_id")
            .eq("year", year)
            .eq("quarter", quarter)
            .execute()
        )
        
        if hasattr(reports_response, 'error') and reports_response.error:
            logger.error(f"Supabase error fetching reports: {reports_response.error}")
            raise Exception(f"Database error: {reports_response.error.message}")
        
        if not reports_response.data:
            logger.warning(f"No financial reports found for {year} {quarter}")
            return 0.0
        
        report_ids = [report['report_id'] for report in reports_response.data]
        
        if not report_ids:
            return 0.0
        
        # Fetch financial data in parallel
        financial_data_response = await loop.run_in_executor(
            None,
            lambda: supabase.table("financial_data")
            .select("value")
            .in_("report_id", report_ids)
            .eq("line_item_id", line_item_id)
            .execute()
        )
        
        if hasattr(financial_data_response, 'error') and financial_data_response.error:
            logger.error(f"Supabase error fetching financial_data: {financial_data_response.error}")
            raise Exception(f"Database error: {financial_data_response.error.message}")
        
        # Calculate total value
        if financial_data_response.data:
            for item in financial_data_response.data:
                if item.get('value') is not None:
                    try:
                        total_value += float(item['value'])
                    except ValueError:
                        logger.warning(f"Invalid value skipped: {item.get('value')}")
        
        # Cache the result
        await cache_service.set(cache_key, total_value, ttl=settings.CACHE_FINANCIAL_TTL)
        
        logger.info(f"Total capital calculated: {total_value}")
        return total_value
        
    except Exception as e:
        logger.exception(f"Error calculating total capital: {e}")
        raise

# ===== OPTIMIZED FINANCIAL SERVICE =====
class FinancialServiceOptimized:
    """High-performance async financial service with caching"""
    
    def __init__(self, db_client: Client = Depends(get_supabase_client)):
        self.db = db_client
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    @cache_financial_data(ttl=settings.CACHE_FINANCIAL_TTL)
    async def get_chart_data_cached(self, line_item_id: int) -> List[FinancialDataPoint]:
        """Cached financial chart data with async RPC calls"""
        cache_key = CacheKeys.FINANCIAL_CHART.format(line_item_id=line_item_id)
        
        # Check cache first
        cached_data = await cache_service.get(cache_key)
        if cached_data:
            logger.debug(f"Cache hit for financial chart: {line_item_id}")
            return cached_data
        
        rpc_function_name = 'get_financial_data_for_chart'
        rpc_params = {
            'p_line_item_id': line_item_id,
            'p_year': 2024,
            'p_quarter': 'Q4'
        }
        
        logger.info(f"Fetching chart data for line_item_id={line_item_id}")
        
        try:
            # Run RPC call in thread pool
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                self.executor,
                lambda: self.db.rpc(rpc_function_name, rpc_params).execute()
            )
            
            if hasattr(response, 'error') and response.error:
                logger.error(f"RPC error: {response.error}")
                raise HTTPException(status_code=500, detail=f"Database RPC Error: {response.error.get('message', 'Unknown error')}")
            
            data = response.data if response.data else []
            
            # Cache the result
            await cache_service.set(cache_key, data, ttl=settings.CACHE_FINANCIAL_TTL)
            
            logger.info(f"Retrieved {len(data)} data points for line_item_id={line_item_id}")
            return data
            
        except Exception as e:
            logger.exception(f"Error fetching chart data for line_item_id={line_item_id}: {e}")
            raise HTTPException(status_code=500, detail="Internal Server Error while fetching financial data")

# ===== OPTIMIZED INDEX SERVICE =====
class IndexServiceOptimized:
    """High-performance async index service with caching and parallel processing"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.vnstock_client = Vnstock()
        self.INDEX_CONFIG = settings.INDEX_CONFIG.copy()
        self.executor = ThreadPoolExecutor(max_workers=3)
        
        # Initialize index type IDs asynchronously
        asyncio.create_task(self._initialize_index_type_ids_async())
    
    async def _initialize_index_type_ids_async(self):
        """Async initialization of index type IDs"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                self.executor,
                lambda: self.supabase.table('index_types').select('id, index_type').execute()
            )
            
            if response.data:
                type_map = {item['index_type']: item['id'] for item in response.data}
                for index_name, config in self.INDEX_CONFIG.items():
                    index_type = config.get('index_type')
                    if index_type in type_map:
                        config['index_type_id'] = type_map[index_type]
                        
                logger.info("Index type IDs initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing index type IDs: {e}")
    
    async def _fetch_from_vnstock_async(self, symbol: str, source: str, start_date: str, end_date: str) -> pd.DataFrame:
        """Async vnstock data fetching with thread pool"""
        try:
            loop = asyncio.get_event_loop()
            
            # Run in thread pool to avoid blocking
            df = await loop.run_in_executor(
                self.executor,
                self._fetch_vnstock_sync,
                symbol, source, start_date, end_date
            )
            
            return df
            
        except Exception as e:
            logger.error(f"Error in async vnstock fetch for {symbol}: {e}")
            return pd.DataFrame()
    
    def _fetch_vnstock_sync(self, symbol: str, source: str, start_date: str, end_date: str) -> pd.DataFrame:
        """Synchronous vnstock fetching (run in thread pool)"""
        try:
            stock_data_fetcher = self.vnstock_client.stock(symbol=symbol, source=source)
            df = stock_data_fetcher.quote.history(start=start_date, end=end_date)
            
            if df is None or df.empty:
                return pd.DataFrame()
            
            # Process the dataframe
            if 'time' not in df.columns and isinstance(df.index, pd.DatetimeIndex):
                df = df.reset_index()
            
            if 'time' not in df.columns:
                logger.error(f"'time' column not found for {symbol}")
                return pd.DataFrame()
            
            df['time'] = pd.to_datetime(df['time']).dt.strftime('%Y-%m-%d')
            df = df.sort_values('time').reset_index(drop=True)
            
            required_cols = ['time', 'open', 'high', 'low', 'close', 'volume']
            existing_cols = [col for col in required_cols if col in df.columns]
            
            return df[existing_cols].copy()
            
        except Exception as e:
            logger.error(f"Error in sync vnstock fetch for {symbol}: {e}")
            return pd.DataFrame()
    
    @cache_market_data(ttl=settings.CACHE_DEFAULT_TTL)
    async def fetch_and_process_all_indices_optimized(self) -> Dict[str, Dict[str, Any]]:
        """Optimized parallel fetching and processing of all indices"""
        cache_key = "index:all_data"
        
        # Check cache first
        cached_data = await cache_service.get(cache_key)
        if cached_data:
            logger.debug("Cache hit for all indices data")
            return cached_data
        
        logger.info("Fetching and processing all indices data")
        
        try:
            # Process all indices in parallel
            tasks = []
            for index_name, config in self.INDEX_CONFIG.items():
                task = self._process_single_index_async(index_name, config)
                tasks.append(task)
            
            # Wait for all tasks to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Combine results
            all_indices_data = {}
            for i, (index_name, result) in enumerate(zip(self.INDEX_CONFIG.keys(), results)):
                if isinstance(result, Exception):
                    logger.error(f"Error processing {index_name}: {result}")
                    all_indices_data[index_name] = {"error": str(result)}
                else:
                    all_indices_data[index_name] = result
            
            # Cache the results
            await cache_service.set(cache_key, all_indices_data, ttl=settings.CACHE_DEFAULT_TTL)
            
            logger.info("All indices data processed successfully")
            return all_indices_data
            
        except Exception as e:
            logger.exception(f"Error in fetch_and_process_all_indices_optimized: {e}")
            raise
    
    async def _process_single_index_async(self, index_name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single index asynchronously"""
        try:
            # Get or update index data
            df = await self.get_and_update_index_data_async(
                index_symbol=index_name,
                index_type_name=config['index_type'],
                source_api=config['source']
            )
            
            if df.empty:
                return {"error": f"No data available for {index_name}"}
            
            # Process for display
            processed_data = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self.process_index_data_for_display,
                df, index_name
            )
            
            return processed_data
            
        except Exception as e:
            logger.error(f"Error processing single index {index_name}: {e}")
            raise
    
    async def get_and_update_index_data_async(self, index_symbol: str, index_type_name: str, source_api: str) -> pd.DataFrame:
        """Async version of get_and_update_index_data"""
        config = self.INDEX_CONFIG.get(index_symbol, {})
        index_type_id = config.get('index_type_id')
        
        if index_type_id is None:
            logger.warning(f"No index_type_id for {index_symbol}")
            return pd.DataFrame()
        
        try:
            # Get latest date from DB and fetch new data in parallel
            latest_date_task = self._get_latest_date_from_db_async(index_type_id)
            
            # Determine date range
            latest_date = await latest_date_task
            start_date = latest_date or config.get('default_start_date', '2020-01-01')
            end_date = datetime.now().strftime('%Y-%m-%d')
            
            # Fetch new data from vnstock
            df_new = await self._fetch_from_vnstock_async(index_symbol, source_api, start_date, end_date)
            
            if not df_new.empty:
                # Save new data
                await self._save_to_supabase_async(df_new, index_type_id, index_type_name)
            
            # Get all data from DB
            df_all = await self._get_all_data_from_db_async(index_type_id, index_type_name)
            
            return df_all
            
        except Exception as e:
            logger.error(f"Error in get_and_update_index_data_async for {index_symbol}: {e}")
            return pd.DataFrame()
    
    async def _get_latest_date_from_db_async(self, index_type_id: int) -> Optional[str]:
        """Async version of getting latest date from DB"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                self.executor,
                lambda: self.supabase.table('index_history')
                .select('time')
                .eq('index_type_id', index_type_id)
                .order('time', desc=True)
                .limit(1)
                .execute()
            )
            
            if response.data:
                latest_date_str = response.data[0]['time']
                latest_date_obj = datetime.strptime(latest_date_str, '%Y-%m-%d')
                next_day = latest_date_obj + timedelta(days=1)
                return next_day.strftime('%Y-%m-%d')
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting latest date for index_type_id {index_type_id}: {e}")
            return None
    
    async def _save_to_supabase_async(self, df_new: pd.DataFrame, index_type_id: int, index_type_name: str) -> int:
        """Async version of saving data to Supabase"""
        try:
            if df_new.empty:
                return 0
            
            # Prepare records
            records = []
            for _, row in df_new.iterrows():
                record = {
                    'index_type_id': index_type_id,
                    'time': row['time'],
                    'open': float(row.get('open', 0)),
                    'high': float(row.get('high', 0)),
                    'low': float(row.get('low', 0)),
                    'close': float(row.get('close', 0)),
                    'volume': int(row.get('volume', 0))
                }
                records.append(record)
            
            # Insert in batches for better performance
            batch_size = 100
            total_inserted = 0
            
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    self.executor,
                    lambda: self.supabase.table('index_history').insert(batch).execute()
                )
                
                if response.data:
                    total_inserted += len(response.data)
            
            logger.info(f"Inserted {total_inserted} records for {index_type_name}")
            return total_inserted
            
        except Exception as e:
            logger.error(f"Error saving to Supabase for {index_type_name}: {e}")
            return 0
    
    async def _get_all_data_from_db_async(self, index_type_id: int, index_type_name: str) -> pd.DataFrame:
        """Async version of getting all data from DB"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                self.executor,
                lambda: self.supabase.table('index_history')
                .select('*')
                .eq('index_type_id', index_type_id)
                .order('time', desc=False)
                .execute()
            )
            
            if response.data:
                df = pd.DataFrame(response.data)
                df['time'] = pd.to_datetime(df['time'])
                return df.sort_values('time').reset_index(drop=True)
            
            return pd.DataFrame()
            
        except Exception as e:
            logger.error(f"Error getting all data for {index_type_name}: {e}")
            return pd.DataFrame()
    
    def process_index_data_for_display(self, df: pd.DataFrame, symbol: str) -> Dict[str, Any]:
        """Process index data for display (runs in thread pool)"""
        if df.empty:
            return {"error": f"No data for {symbol}"}
        
        try:
            # Calculate basic statistics
            latest_row = df.iloc[-1]
            previous_row = df.iloc[-2] if len(df) > 1 else latest_row
            
            change = latest_row['close'] - previous_row['close']
            percent_change = (change / previous_row['close']) * 100 if previous_row['close'] != 0 else 0
            
            # Calculate moving averages
            df['ma5'] = df['close'].rolling(window=5).mean()
            df['ma20'] = df['close'].rolling(window=20).mean()
            
            return {
                "symbol": symbol,
                "current_price": latest_row['close'],
                "change": round(change, 2),
                "percent_change": round(percent_change, 2),
                "volume": latest_row['volume'],
                "high_52w": df['high'].max(),
                "low_52w": df['low'].min(),
                "ma5": latest_row.get('ma5', 0),
                "ma20": latest_row.get('ma20', 0),
                "last_updated": latest_row['time'].strftime('%Y-%m-%d %H:%M:%S')
            }
            
        except Exception as e:
            logger.error(f"Error processing display data for {symbol}: {e}")
            return {"error": f"Processing error for {symbol}"}

# ===== OPTIMIZED MARKET DATA SERVICE =====
class MarketDataServiceOptimized:
    """High-performance market data service with caching"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.executor = ThreadPoolExecutor(max_workers=2)
    
    @cache_market_data(ttl=settings.CACHE_DEFAULT_TTL)
    async def get_market_cap_cached(
        self,
        line_item_id: int,
        year: int,
        quarter: str,
        min_stock_id: int,
        max_stock_id: int
    ) -> List[MarketCapItem]:
        """Cached market cap data with async operations"""
        cache_key = CacheKeys.MARKET_CAP.format(
            year=year, quarter=quarter, line_item_id=line_item_id
        )
        
        # Check cache first
        cached_data = await cache_service.get(cache_key)
        if cached_data:
            logger.debug(f"Cache hit for market cap: {cache_key}")
            return cached_data
        
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                self.executor,
                self._fetch_market_cap_sync,
                line_item_id, year, quarter, min_stock_id, max_stock_id
            )
            
            # Cache the result
            await cache_service.set(cache_key, response, ttl=settings.CACHE_DEFAULT_TTL)
            
            return response
            
        except Exception as e:
            logger.error(f"Error fetching market cap data: {e}")
            raise HTTPException(status_code=500, detail="Internal server error in market data service")
    
    def _fetch_market_cap_sync(self, line_item_id: int, year: int, quarter: str, min_stock_id: int, max_stock_id: int) -> List[MarketCapItem]:
        """Synchronous market cap fetching (run in thread pool)"""
        response = self.supabase.rpc('get_market_cap_data', {
            'p_line_item_id': line_item_id,
            'p_year': year,
            'p_quarter': quarter,
            'p_min_stock_id': min_stock_id,
            'p_max_stock_id': max_stock_id
        }).execute()
        
        if hasattr(response, 'error') and response.error:
            raise Exception(f"Database error: {response.error}")
        
        return [MarketCapItem(**item) for item in response.data] if response.data else []

# ===== OPTIMIZED NEWS SERVICE =====
@cache_news_data(ttl=settings.CACHE_NEWS_TTL)
async def fetch_all_news_async() -> List[Dict[str, Any]]:
    """Async cached news fetching"""
    cache_key = CacheKeys.NEWS_LIST
    
    # Check cache first
    cached_data = await cache_service.get(cache_key)
    if cached_data:
        logger.debug("Cache hit for news list")
        return cached_data
    
    try:
        loop = asyncio.get_event_loop()
        supabase = get_supabase_client()
        
        response = await loop.run_in_executor(
            None,
            lambda: supabase.table("news").select("*").execute()
        )
        
        data = response.data if response.data else []
        
        # Cache the result
        await cache_service.set(cache_key, data, ttl=settings.CACHE_NEWS_TTL)
        
        return data
        
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        return []

@cache_news_data(ttl=settings.CACHE_NEWS_TTL)
async def fetch_news_by_id_async(news_id: int) -> Optional[Dict[str, Any]]:
    """Async cached news item fetching"""
    cache_key = CacheKeys.NEWS_ITEM.format(news_id=news_id)
    
    # Check cache first
    cached_data = await cache_service.get(cache_key)
    if cached_data:
        logger.debug(f"Cache hit for news item: {news_id}")
        return cached_data
    
    try:
        loop = asyncio.get_event_loop()
        supabase = get_supabase_client()
        
        response = await loop.run_in_executor(
            None,
            lambda: supabase.table("news").select("*").eq("id", news_id).execute()
        )
        
        data = response.data[0] if response.data else None
        
        # Cache the result
        if data:
            await cache_service.set(cache_key, data, ttl=settings.CACHE_NEWS_TTL)
        
        return data
        
    except Exception as e:
        logger.error(f"Error fetching news {news_id}: {e}")
        return None

# ===== DEPENDENCY FUNCTIONS =====
def get_market_data_service_optimized() -> MarketDataServiceOptimized:
    """Dependency function for optimized market data service"""
    return MarketDataServiceOptimized() 