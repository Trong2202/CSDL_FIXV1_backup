"""
Performance Testing Script for Financial Dashboard
Tests the optimized APIs and measures response times
"""
import asyncio
import time
import statistics
from typing import List, Dict, Any
import httpx
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PerformanceTester:
    """Performance testing class for the Financial Dashboard"""
    
    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url
        self.client = None
        self.results = {}
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.client = httpx.AsyncClient(timeout=30.0)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.client:
            await self.client.aclose()
    
    async def measure_endpoint(self, endpoint: str, iterations: int = 5) -> Dict[str, Any]:
        """Measure the performance of a specific endpoint"""
        response_times = []
        errors = 0
        
        logger.info(f"Testing endpoint: {endpoint} ({iterations} iterations)")
        
        for i in range(iterations):
            try:
                start_time = time.time()
                response = await self.client.get(f"{self.base_url}{endpoint}")
                end_time = time.time()
                
                response_time = (end_time - start_time) * 1000  # Convert to milliseconds
                response_times.append(response_time)
                
                if response.status_code != 200:
                    errors += 1
                    logger.warning(f"Non-200 status code for {endpoint}: {response.status_code}")
                
            except Exception as e:
                errors += 1
                logger.error(f"Error testing {endpoint}: {e}")
        
        if response_times:
            return {
                "endpoint": endpoint,
                "iterations": iterations,
                "avg_response_time_ms": statistics.mean(response_times),
                "min_response_time_ms": min(response_times),
                "max_response_time_ms": max(response_times),
                "median_response_time_ms": statistics.median(response_times),
                "errors": errors,
                "success_rate": ((iterations - errors) / iterations) * 100
            }
        else:
            return {
                "endpoint": endpoint,
                "iterations": iterations,
                "errors": errors,
                "success_rate": 0,
                "error": "All requests failed"
            }
    
    async def test_health_check(self):
        """Test the health check endpoint"""
        result = await self.measure_endpoint("/health", 3)
        self.results["health_check"] = result
        return result
    
    async def test_stock_apis(self):
        """Test stock-related APIs"""
        stock_endpoints = [
            "/api/stock/VCB/profile",
            "/api/stock/VCB/price",
            "/api/stock/VCB/officers",
            "/api/stock/VCB/shareholders"
        ]
        
        for endpoint in stock_endpoints:
            result = await self.measure_endpoint(endpoint, 3)
            key = f"stock_{endpoint.split('/')[-1]}"
            self.results[key] = result
    
    async def test_financial_apis(self):
        """Test financial data APIs"""
        financial_endpoints = [
            "/api/financial/chart-data/88",
            "/api/market-cap",
            "/api/capital/total",
            "/api/news"
        ]
        
        for endpoint in financial_endpoints:
            result = await self.measure_endpoint(endpoint, 3)
            key = f"financial_{endpoint.split('/')[-1]}"
            self.results[key] = result
    
    async def test_batch_operations(self):
        """Test batch operations for performance"""
        batch_endpoints = [
            "/api/stocks/batch?symbols=VCB,BID,CTG,TCB,MBB",
            "/api/index/all"
        ]
        
        for endpoint in batch_endpoints:
            result = await self.measure_endpoint(endpoint, 3)
            key = f"batch_{endpoint.split('/')[-1].split('?')[0]}"
            self.results[key] = result
    
    async def test_information_apis(self):
        """Test information service APIs"""
        info_endpoints = [
            "/api/stocks",
            "/api/report_types",
            "/api/line_items?report_type_id=1",
            "/api/financial_data?symbol=VCB&report_type_id=1&period=yearly"
        ]
        
        for endpoint in info_endpoints:
            result = await self.measure_endpoint(endpoint, 3)
            key = f"info_{endpoint.split('/')[-1].split('?')[0]}"
            self.results[key] = result
    
    async def run_all_tests(self):
        """Run all performance tests"""
        logger.info("🚀 Starting Performance Tests...")
        
        # Test health check first
        await self.test_health_check()
        
        # Run other tests in parallel for better performance measurement
        await asyncio.gather(
            self.test_stock_apis(),
            self.test_financial_apis(),
            self.test_batch_operations(),
            self.test_information_apis(),
            return_exceptions=True
        )
        
        logger.info("✅ Performance Tests Completed")
        return self.results
    
    def print_summary(self):
        """Print a summary of test results"""
        print("\n" + "="*80)
        print("📊 PERFORMANCE TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.results)
        successful_tests = sum(1 for r in self.results.values() if r.get("success_rate", 0) > 0)
        
        print(f"Total Endpoints Tested: {total_tests}")
        print(f"Successful Tests: {successful_tests}")
        print(f"Overall Success Rate: {(successful_tests/total_tests)*100:.1f}%")
        print()
        
        # Sort by average response time
        sorted_results = sorted(
            self.results.items(), 
            key=lambda x: x[1].get("avg_response_time_ms", float('inf'))
        )
        
        print(f"{'Endpoint':<30} {'Avg (ms)':<10} {'Min (ms)':<10} {'Max (ms)':<10} {'Success':<8}")
        print("-" * 80)
        
        for name, result in sorted_results:
            if "error" not in result:
                avg = result.get("avg_response_time_ms", 0)
                min_time = result.get("min_response_time_ms", 0)
                max_time = result.get("max_response_time_ms", 0)
                success = result.get("success_rate", 0)
                
                print(f"{name:<30} {avg:<10.2f} {min_time:<10.2f} {max_time:<10.2f} {success:<8.1f}%")
            else:
                print(f"{name:<30} {'ERROR':<10} {'ERROR':<10} {'ERROR':<10} {'0.0%':<8}")
        
        print("="*80)
        
        # Performance insights
        print("\n🔍 PERFORMANCE INSIGHTS:")
        
        # Find fastest and slowest endpoints
        valid_results = [(name, r) for name, r in self.results.items() if "error" not in r]
        if valid_results:
            fastest = min(valid_results, key=lambda x: x[1]["avg_response_time_ms"])
            slowest = max(valid_results, key=lambda x: x[1]["avg_response_time_ms"])
            
            print(f"⚡ Fastest endpoint: {fastest[0]} ({fastest[1]['avg_response_time_ms']:.2f}ms)")
            print(f"🐌 Slowest endpoint: {slowest[0]} ({slowest[1]['avg_response_time_ms']:.2f}ms)")
            
            # Performance categories
            fast_count = sum(1 for _, r in valid_results if r["avg_response_time_ms"] < 100)
            medium_count = sum(1 for _, r in valid_results if 100 <= r["avg_response_time_ms"] < 500)
            slow_count = sum(1 for _, r in valid_results if r["avg_response_time_ms"] >= 500)
            
            print(f"🟢 Fast endpoints (<100ms): {fast_count}")
            print(f"🟡 Medium endpoints (100-500ms): {medium_count}")
            print(f"🔴 Slow endpoints (>500ms): {slow_count}")

async def main():
    """Main testing function"""
    async with PerformanceTester() as tester:
        try:
            results = await tester.run_all_tests()
            tester.print_summary()
            
            # Save results to file
            import json
            with open("performance_results.json", "w") as f:
                json.dump(results, f, indent=2)
            
            print(f"\n💾 Results saved to performance_results.json")
            
        except Exception as e:
            logger.error(f"Error during performance testing: {e}")

if __name__ == "__main__":
    print("🔧 Financial Dashboard Performance Tester")
    print("Make sure the application is running on http://127.0.0.1:8000")
    print()
    
    asyncio.run(main()) 