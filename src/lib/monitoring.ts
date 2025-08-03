// lib/monitoring.ts - Basic performance monitoring
export const trackMetric = (metric: string, value: number, tags?: Record<string, string>) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Metric: ${metric} = ${value}`, tags);
    return;
  }

  // In production, send to monitoring service
  // Examples: DataDog, New Relic, Sentry, etc.
  try {
    // Example with simple logging
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric,
        value,
        timestamp: Date.now(),
        tags
      })
    }).catch(() => {}); // Silent fail for metrics
  } catch (error) {
    // Silent fail for metrics
  }
};

// Usage in your APIs
export const withMetrics = (handler: any) => {
  return async (req: any, res: any) => {
    const start = Date.now();
    
    try {
      const result = await handler(req, res);
      trackMetric('api.request.duration', Date.now() - start, {
        endpoint: req.url,
        method: req.method,
        status: 'success'
      });
      return result;
    } catch (error) {
      trackMetric('api.request.duration', Date.now() - start, {
        endpoint: req.url,
        method: req.method,
        status: 'error'
      });
      throw error;
    }
  };
};