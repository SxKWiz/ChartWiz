// Performance monitoring utilities

export const performanceMetrics = {
  // Measure component render time
  measureRender: (componentName: string, fn: () => void) => {
    if (typeof performance !== 'undefined') {
      const start = performance.now();
      fn();
      const end = performance.now();
      console.log(`${componentName} render time: ${end - start}ms`);
    } else {
      fn();
    }
  },

  // Debounce function for performance optimization
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function for performance optimization
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Lazy load images with intersection observer
  lazyLoadImage: (img: HTMLImageElement, src: string) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });
    observer.observe(img);
  },

  // Measure bundle size impact
  measureBundleSize: () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      const jsSize = resourceEntries
        .filter(entry => entry.name.includes('.js'))
        .reduce((total, entry) => total + (entry.transferSize || 0), 0);
      
      const cssSize = resourceEntries
        .filter(entry => entry.name.includes('.css'))
        .reduce((total, entry) => total + (entry.transferSize || 0), 0);

      console.log('Performance Metrics:', {
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        jsSize: `${(jsSize / 1024).toFixed(2)} KB`,
        cssSize: `${(cssSize / 1024).toFixed(2)} KB`,
        totalAssetSize: `${((jsSize + cssSize) / 1024).toFixed(2)} KB`
      });
    }
  },

  // Monitor Core Web Vitals
  measureCoreWebVitals: () => {
    if (typeof window !== 'undefined' && 'web-vitals' in window) {
      // This would require the web-vitals library
      // For now, we'll use performance API
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          console.log(`${entry.name}: ${entry.startTime}ms`);
        });
      });
      
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
    }
  },

  // Memory usage monitoring
  monitorMemoryUsage: () => {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      console.log('Memory Usage:', {
        used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
      });
    }
  }
};

// React performance hooks
export const usePerformanceMonitor = (componentName: string) => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`${componentName} mounted`);
    
    return {
      measureRender: (fn: () => void) => performanceMetrics.measureRender(componentName, fn),
      debounce: performanceMetrics.debounce,
      throttle: performanceMetrics.throttle
    };
  }
  
  return {
    measureRender: (fn: () => void) => fn(),
    debounce: performanceMetrics.debounce,
    throttle: performanceMetrics.throttle
  };
};

// Bundle size analyzer
export const analyzeBundleSize = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      performanceMetrics.measureBundleSize();
      performanceMetrics.monitorMemoryUsage();
    }, 2000);
  }
};