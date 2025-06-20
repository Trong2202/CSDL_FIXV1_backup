"""
Cache Service - Redis-based caching for performance optimization
"""
import json
import logging
from typing import Any, Optional, Union, List, Dict
from datetime import timedelta
import redis.asyncio as redis
from aiocache import Cache, cached
from aiocache.serializers import JsonSerializer

# Try to import orjson, fallback to standard json if not available
try:
    import orjson
    ORJSON_AVAILABLE = True
except ImportError:
    ORJSON_AVAILABLE = False
    
from app.config import settings

logger = logging.getLogger(__name__)

class ORJSONSerializer:
    """Custom ORJSON serializer for faster JSON operations with fallback"""
    
    def dumps(self, value: Any) -> bytes:
        if ORJSON_AVAILABLE:
            return orjson.dumps(value)
        else:
            return json.dumps(value).encode('utf-8')
    
    def loads(self, value: bytes) -> Any:
        if ORJSON_AVAILABLE:
            return orjson.loads(value)
        else:
            return json.loads(value.decode('utf-8'))

class CacheService:
    """High-performance caching service using Redis"""
    
    def __init__(self):
        self.redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379')
        self.redis_client: Optional[redis.Redis] = None
        self.cache = Cache(
            Cache.REDIS,
            endpoint=self.redis_url,
            serializer=ORJSONSerializer(),
            namespace="dashboard_finance"
        )
    
    async def connect(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.from_url(self.redis_url, decode_responses=False)
            await self.redis_client.ping()
            logger.info("✅ Redis cache service connected successfully")
        except Exception as e:
            logger.warning(f"⚠️  Redis connection failed: {e}. Falling back to memory cache")
            self.cache = Cache(Cache.MEMORY, serializer=ORJSONSerializer())
    
    async def disconnect(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            return await self.cache.get(key)
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache with TTL (Time To Live)"""
        try:
            await self.cache.set(key, value, ttl=ttl)
            return True
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            await self.cache.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern"""
        try:
            if self.redis_client:
                keys = await self.redis_client.keys(f"dashboard_finance:{pattern}")
                if keys:
                    return await self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache pattern clear error for {pattern}: {e}")
            return 0
    
    def get_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate consistent cache key"""
        key_parts = [prefix]
        for k, v in sorted(kwargs.items()):
            key_parts.append(f"{k}:{v}")
        return ":".join(key_parts)

# Global cache instance
cache_service = CacheService()

# Cache decorators for different data types - Fixed version
def cache_stock_data(ttl: int = 30):
    """Cache decorator for stock data (30 seconds TTL)"""
    return cached(ttl=ttl, cache=Cache.MEMORY, serializer=ORJSONSerializer())

def cache_financial_data(ttl: int = 3600):
    """Cache decorator for financial data (1 hour TTL)"""
    return cached(ttl=ttl, cache=Cache.MEMORY, serializer=ORJSONSerializer())

def cache_market_data(ttl: int = 300):
    """Cache decorator for market data (5 minutes TTL)"""
    return cached(ttl=ttl, cache=Cache.MEMORY, serializer=ORJSONSerializer())

def cache_news_data(ttl: int = 600):
    """Cache decorator for news data (10 minutes TTL)"""
    return cached(ttl=ttl, cache=Cache.MEMORY, serializer=ORJSONSerializer())

# Cache key generators
class CacheKeys:
    """Centralized cache key management"""
    
    STOCK_PRICE = "stock:price:{symbol}"
    STOCK_REALTIME = "stock:realtime:{symbols}"
    FINANCIAL_CHART = "financial:chart:{line_item_id}"
    MARKET_CAP = "market:cap:{year}:{quarter}:{line_item_id}"
    INDEX_DATA = "index:data:{symbol}"
    NEWS_LIST = "news:list"
    NEWS_ITEM = "news:item:{news_id}"
    COMPANY_PROFILE = "company:profile:{symbol}"
    TOTAL_CAPITAL = "capital:total:{year}:{quarter}:{line_item_id}" 