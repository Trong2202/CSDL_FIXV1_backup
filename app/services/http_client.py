"""
Optimized HTTP Client Service with connection pooling and async operations
"""
import asyncio
import logging
from typing import Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

class HTTPClientService:
    """High-performance async HTTP client with connection pooling"""
    
    def __init__(self):
        self.client: Optional[httpx.AsyncClient] = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize the HTTP client with optimized settings"""
        if not self._initialized:
            # Configure connection limits and timeouts for optimal performance
            limits = httpx.Limits(
                max_keepalive_connections=settings.HTTP_MAX_KEEPALIVE,
                max_connections=settings.HTTP_MAX_CONNECTIONS,
                keepalive_expiry=30.0
            )
            
            timeout = httpx.Timeout(
                connect=10.0,
                read=settings.HTTP_TIMEOUT,
                write=10.0,
                pool=5.0
            )
            
            self.client = httpx.AsyncClient(
                limits=limits,
                timeout=timeout,
                http2=True,  # Enable HTTP/2 for better performance
                verify=False  # Disable SSL verification for faster requests (adjust as needed)
            )
            
            self._initialized = True
            logger.info("✅ HTTP client initialized with connection pooling")
    
    async def close(self):
        """Close the HTTP client and cleanup connections"""
        if self.client:
            await self.client.aclose()
            self._initialized = False
            logger.info("✅ HTTP client closed successfully")
    
    async def get(self, url: str, **kwargs) -> httpx.Response:
        """Async GET request with automatic client initialization"""
        if not self._initialized:
            await self.initialize()
        
        try:
            response = await self.client.get(url, **kwargs)
            return response
        except Exception as e:
            logger.error(f"HTTP GET error for {url}: {e}")
            raise
    
    async def post(self, url: str, **kwargs) -> httpx.Response:
        """Async POST request with automatic client initialization"""
        if not self._initialized:
            await self.initialize()
        
        try:
            response = await self.client.post(url, **kwargs)
            return response
        except Exception as e:
            logger.error(f"HTTP POST error for {url}: {e}")
            raise
    
    async def get_json(self, url: str, **kwargs) -> Dict[str, Any]:
        """Convenience method for JSON GET requests"""
        response = await self.get(url, **kwargs)
        response.raise_for_status()
        return response.json()
    
    async def post_json(self, url: str, **kwargs) -> Dict[str, Any]:
        """Convenience method for JSON POST requests"""
        response = await self.post(url, **kwargs)
        response.raise_for_status()
        return response.json()

# Global HTTP client instance
http_client = HTTPClientService()

# Context manager for HTTP client lifecycle
class HTTPClientManager:
    """Context manager for HTTP client lifecycle management"""
    
    async def __aenter__(self):
        await http_client.initialize()
        return http_client
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await http_client.close()

# Dependency function for FastAPI
async def get_http_client() -> HTTPClientService:
    """Dependency function to get HTTP client instance"""
    if not http_client._initialized:
        await http_client.initialize()
    return http_client 