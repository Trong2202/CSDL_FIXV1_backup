"""
Optimized Stock Model with async operations and caching
"""
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
from vnstock import Vnstock
from app.config import get_supabase_client, settings
from app.services.cache_service import cache_service, cache_stock_data, CacheKeys

logger = logging.getLogger(__name__)

class StockModelOptimized:
    """High-performance async stock model with caching"""
    
    def __init__(self, symbol: Optional[str] = None):
        self.symbol = symbol
        self._vnstock_client = None
        self._supabase_client = None
        
    @property
    def vnstock_client(self):
        """Lazy loading of vnstock client"""
        if self._vnstock_client is None:
            self._vnstock_client = Vnstock()
        return self._vnstock_client
    
    @property
    def supabase_client(self):
        """Lazy loading of supabase client"""
        if self._supabase_client is None:
            self._supabase_client = get_supabase_client()
        return self._supabase_client

    @cache_stock_data(ttl=settings.CACHE_STOCK_TTL)
    async def get_company_profile_cached(self, symbol: str) -> tuple:
        """Cached company profile with async operations"""
        try:
            # Run CPU-bound operations in thread pool
            loop = asyncio.get_event_loop()
            company = self.vnstock_client.stock(symbol=symbol, source='TCBS')
            
            # Execute in thread pool to avoid blocking
            df = await loop.run_in_executor(None, company.company.profile)
            
            company_profile = df["company_profile"].iloc[0]
            key_developments = df["key_developments"].iloc[0]
            
            return company_profile, key_developments
            
        except Exception as e:
            logger.error(f"Error fetching company profile for {symbol}: {e}")
            return "Không thể tải dữ liệu công ty.", "Không thể tải thông tin phát triển."

    @cache_stock_data(ttl=settings.CACHE_STOCK_TTL)
    async def get_officers_html_cached(self, symbol: str) -> str:
        """Cached officers data with async operations"""
        try:
            loop = asyncio.get_event_loop()
            company = self.vnstock_client.stock(symbol=symbol, source='TCBS')
            df = await loop.run_in_executor(None, company.company.officers)
            return df[["officer_name", "officer_position"]].to_html(index=False, border=0)
        except Exception as e:
            logger.error(f"Error fetching officers for {symbol}: {e}")
            return "<p>Không thể tải dữ liệu ban lãnh đạo.</p>"

    @cache_stock_data(ttl=settings.CACHE_STOCK_TTL)
    async def get_shareholders_html_cached(self, symbol: str) -> str:
        """Cached shareholders data with async operations"""
        try:
            loop = asyncio.get_event_loop()
            company = self.vnstock_client.stock(symbol=symbol, source='TCBS')
            df = await loop.run_in_executor(None, company.company.shareholders)
            
            # Process "Khác" category
            if "Khác" in df["share_holder"].values:
                known_share = df[df["share_holder"] != "Khác"]["share_own_percent"].sum()
                df.loc[df['share_holder'] == 'Khác', 'share_own_percent'] = round(1.0 - known_share, 4)
                
            return df[["share_holder", "share_own_percent"]].to_html(index=False, border=0)
        except Exception as e:
            logger.error(f"Error fetching shareholders for {symbol}: {e}")
            return "<p>Không thể tải dữ liệu cổ đông.</p>"

    async def get_realtime_data_optimized(self, symbol: str) -> List[Dict[str, Any]]:
        """Optimized real-time data fetching with caching"""
        cache_key = CacheKeys.STOCK_PRICE.format(symbol=symbol)
        
        # Try cache first
        cached_data = await cache_service.get(cache_key)
        if cached_data:
            logger.debug(f"Cache hit for stock data: {symbol}")
            return cached_data
        
        try:
            loop = asyncio.get_event_loop()
            today = datetime.today().strftime('%Y-%m-%d')
            
            quote = self.vnstock_client.stock(symbol=symbol, source='VCI')
            
            # Run in thread pool to avoid blocking
            df = await loop.run_in_executor(
                None, 
                lambda: quote.quote.history(start="2020-01-04", end=today)
            )
            
            if df is None or df.empty:
                return []
            
            # Process data
            df = df.sort_values("time", ascending=False)
            df["change"] = df["close"].diff(-1).fillna(0)
            df["percent_change"] = df["change"] / df["close"].shift(-1).fillna(1) * 100
            df["change"] = df["change"].round(2)
            df["percent_change"] = df["percent_change"].round(2)
            df["time"] = df["time"].dt.strftime('%Y-%m-%d')
            
            result = df.to_dict(orient="records")
            
            # Cache the result
            await cache_service.set(cache_key, result, ttl=settings.CACHE_STOCK_TTL)
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching real-time data for {symbol}: {e}")
            return []

    async def get_saved_transactions_async(self, symbol: str) -> List[Dict[str, Any]]:
        """Async database operations for saved transactions"""
        try:
            # Use async database operations
            loop = asyncio.get_event_loop()
            
            # Get stock_id
            stock_result = await loop.run_in_executor(
                None,
                lambda: self.supabase_client.table("stocks")
                .select("stock_id")
                .eq("symbol", symbol)
                .single()
                .execute()
            )
            
            if not stock_result.data:
                return []
                
            stock_id = stock_result.data["stock_id"]
            
            # Get transaction data
            transaction_result = await loop.run_in_executor(
                None,
                lambda: self.supabase_client.table("transaction_price")
                .select("*")
                .eq("stock_id", stock_id)
                .order("time", desc=True)
                .execute()
            )
            
            rows = transaction_result.data
            
            # Skip first row and process from second row onwards
            if len(rows) > 1:
                rows = rows[1:]
                
            # Calculate price changes
            for i in range(len(rows) - 1):
                curr = rows[i]
                prev = rows[i + 1]
                change = curr["close"] - prev["close"]
                curr["change"] = round(change, 2)
                curr["percent_change"] = round((change / prev["close"] * 100), 2) if prev["close"] != 0 else 0
                
            if rows:
                rows[-1]["change"] = 0
                rows[-1]["percent_change"] = 0
                
            return rows
            
        except Exception as e:
            logger.error(f"Error fetching saved transactions for {symbol}: {e}")
            return []

class StockBatchProcessor:
    """Batch processor for multiple stocks with async operations"""
    
    def __init__(self, symbols: List[str]):
        self.symbols = symbols
        self.vnstock_client = Vnstock()
    
    @cache_stock_data(ttl=30)  # 30-second cache for real-time data
    async def fetch_multiple_stocks_parallel(self) -> List[Dict[str, Any]]:
        """Fetch multiple stock data in parallel for performance"""
        cache_key = CacheKeys.STOCK_REALTIME.format(symbols=",".join(sorted(self.symbols)))
        
        # Check cache first
        cached_data = await cache_service.get(cache_key)
        if cached_data:
            logger.debug(f"Cache hit for multiple stocks: {len(self.symbols)} symbols")
            return cached_data
        
        try:
            loop = asyncio.get_event_loop()
            
            # Run the heavy pandas operation in thread pool
            price_board = await loop.run_in_executor(
                None,
                self._fetch_price_board_sync
            )
            
            if price_board is None or price_board.empty:
                logger.warning("No data from vnstock or empty data.")
                return []
            
            # Process the data
            result = await loop.run_in_executor(
                None,
                self._process_price_board,
                price_board
            )
            
            # Cache the result
            await cache_service.set(cache_key, result, ttl=30)
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching multiple stocks: {e}")
            return []
    
    def _fetch_price_board_sync(self) -> pd.DataFrame:
        """Synchronous price board fetching (run in thread pool)"""
        stock_obj = self.vnstock_client.stock(symbol='VN30F1M', source='VCI')
        return stock_obj.trading.price_board(symbols_list=self.symbols)
    
    def _process_price_board(self, price_board: pd.DataFrame) -> List[Dict[str, Any]]:
        """Process price board data (run in thread pool)"""
        try:
            # Define column mappings
            col_symbol = ('listing', 'symbol')
            col_match_price = ('match', 'match_price')
            col_prior_close = ('listing', 'ref_price')
            col_volume = ('match', 'accumulated_volume')
            
            required_cols_tuples = [col_symbol, col_match_price, col_prior_close, col_volume]
            
            # Check for missing columns
            missing_cols = [col for col in required_cols_tuples if col not in price_board.columns]
            if missing_cols:
                logger.error(f"Missing required columns: {missing_cols}")
                return []
            
            # Select and rename columns
            result = price_board[required_cols_tuples].copy()
            result.columns = ['symbol', 'current_price', 'prior_close', 'volume']
            
            # Convert to numeric
            for col in ['current_price', 'prior_close', 'volume']:
                result[col] = pd.to_numeric(result[col], errors='coerce')
            
            # Calculate changes
            result['price_change'] = result['current_price'] - result['prior_close']
            result['percent_change'] = result.apply(
                lambda row: round((row['price_change'] / row['prior_close'] * 100), 2)
                if pd.notnull(row['prior_close']) and row['prior_close'] != 0 and pd.notnull(row['price_change'])
                else None,
                axis=1
            )
            
            # Handle NaN values
            result = result.astype(object).where(pd.notnull(result), None)
            
            return result.to_dict(orient='records')
            
        except Exception as e:
            logger.error(f"Error processing price board: {e}")
            return [] 