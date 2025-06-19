"""
Redis Cache Manager cho cải thiện hiệu suất
Quản lý cache dữ liệu API với Redis
"""

import json
import asyncio
import logging
from typing import Any, Optional, Union, Dict
from functools import wraps
import redis.asyncio as redis
from datetime import timedelta
import pickle
import hashlib

logger = logging.getLogger(__name__)

class CacheManager:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        self.default_ttl = 300  # 5 minutes
        self.fallback_cache = {}  # Fallback in-memory cache
        self.max_fallback_size = 100
        
    async def connect(self):
        """Kết nối tới Redis"""
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=False  # We'll handle serialization ourselves
            )
            await self.redis_client.ping()
            logger.info("✅ Redis connected successfully")
            return True
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}. Using fallback cache.")
            self.redis_client = None
            return False

    async def disconnect(self):
        """Đóng kết nối Redis"""
        if self.redis_client:
            await self.redis_client.aclose()
            logger.info("Redis disconnected")

    def _generate_key(self, key: str, **kwargs) -> str:
        """Tạo cache key từ string và parameters"""
        if kwargs:
            # Create deterministic key from parameters
            sorted_params = sorted(kwargs.items())
            param_str = json.dumps(sorted_params, sort_keys=True)
            param_hash = hashlib.md5(param_str.encode()).hexdigest()[:8]
            return f"{key}:{param_hash}"
        return key

    def _serialize_data(self, data: Any) -> bytes:
        """Serialize dữ liệu để lưu vào Redis"""
        try:
            return pickle.dumps(data)
        except Exception as e:
            logger.error(f"Serialization error: {e}")
            return json.dumps(data, default=str).encode()

    def _deserialize_data(self, data: bytes) -> Any:
        """Deserialize dữ liệu từ Redis"""
        try:
            return pickle.loads(data)
        except Exception:
            try:
                return json.loads(data.decode())
            except Exception as e:
                logger.error(f"Deserialization error: {e}")
                return None

    async def get(self, key: str, **kwargs) -> Optional[Any]:
        """Lấy dữ liệu từ cache"""
        cache_key = self._generate_key(key, **kwargs)
        
        # Try Redis first
        if self.redis_client:
            try:
                data = await self.redis_client.get(cache_key)
                if data:
                    logger.debug(f"💾 Redis cache hit: {cache_key}")
                    return self._deserialize_data(data)
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        # Fallback to in-memory cache
        if cache_key in self.fallback_cache:
            logger.debug(f"💾 Fallback cache hit: {cache_key}")
            item = self.fallback_cache[cache_key]
            return item['data']
        
        return None

    async def set(self, key: str, data: Any, ttl: Optional[int] = None, **kwargs):
        """Lưu dữ liệu vào cache"""
        cache_key = self._generate_key(key, **kwargs)
        ttl = ttl or self.default_ttl
        
        # Try Redis first
        if self.redis_client:
            try:
                serialized_data = self._serialize_data(data)
                await self.redis_client.setex(cache_key, ttl, serialized_data)
                logger.debug(f"💾 Data cached in Redis: {cache_key}")
                return
            except Exception as e:
                logger.error(f"Redis set error: {e}")
        
        # Fallback to in-memory cache
        if len(self.fallback_cache) >= self.max_fallback_size:
            # Remove oldest item
            oldest_key = next(iter(self.fallback_cache))
            del self.fallback_cache[oldest_key]
        
        self.fallback_cache[cache_key] = {
            'data': data,
            'timestamp': asyncio.get_event_loop().time()
        }
        logger.debug(f"💾 Data cached in fallback: {cache_key}")

    async def delete(self, key: str, **kwargs):
        """Xóa dữ liệu khỏi cache"""
        cache_key = self._generate_key(key, **kwargs)
        
        if self.redis_client:
            try:
                await self.redis_client.delete(cache_key)
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
        
        self.fallback_cache.pop(cache_key, None)
        logger.debug(f"🗑️ Cache deleted: {cache_key}")

    async def clear_all(self):
        """Xóa toàn bộ cache"""
        if self.redis_client:
            try:
                await self.redis_client.flushdb()
            except Exception as e:
                logger.error(f"Redis flush error: {e}")
        
        self.fallback_cache.clear()
        logger.info("🗑️ All cache cleared")

    async def get_stats(self) -> Dict[str, Any]:
        """Lấy thống kê cache"""
        stats = {
            'redis_connected': self.redis_client is not None,
            'fallback_cache_size': len(self.fallback_cache),
        }
        
        if self.redis_client:
            try:
                info = await self.redis_client.info('memory')
                stats.update({
                    'redis_memory_used': info.get('used_memory_human', 'N/A'),
                    'redis_connected_clients': info.get('connected_clients', 0)
                })
            except Exception as e:
                logger.error(f"Redis info error: {e}")
        
        return stats

# Decorator cho caching
def cached(key: str, ttl: int = 300):
    """Decorator để cache kết quả function"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_manager = cache_manager_instance
            
            # Generate cache key from function arguments
            cache_key = f"{key}:{func.__name__}"
            cached_result = await cache_manager.get(cache_key, **kwargs)
            
            if cached_result is not None:
                logger.debug(f"🎯 Cache hit for {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache_manager.set(cache_key, result, ttl=ttl, **kwargs)
            logger.debug(f"💾 Cached result for {func.__name__}")
            return result
        
        return wrapper
    return decorator

# Global cache manager instance
cache_manager_instance = CacheManager()

async def init_cache():
    """Khởi tạo cache manager"""
    await cache_manager_instance.connect()

async def cleanup_cache():
    """Cleanup cache manager"""
    await cache_manager_instance.disconnect()

# Export instance
__all__ = ['cache_manager_instance', 'cached', 'init_cache', 'cleanup_cache', 'CacheManager'] 