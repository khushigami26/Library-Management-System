// Types for statistics
export interface Statistics {
  totalUsers: number;
  totalLibrarians: number;
  totalBooks: number;
  activeLoans: number;
  overdue?: number;
}

// Types for statistics API response
export interface StatisticsResponse {
  success: boolean;
  data: {
    overview: {
      totalUsers: number;
      totalLibrarians: number;
      totalBooks: number;
      activeLoans: number;
      overdue: number;
    };
  };
}

// Helper types for caching
export interface CachedData<T> {
  data: T;
  timestamp: number;
}

// Helper functions for statistics management
export const getCachedStatistics = (): Statistics | null => {
  try {
    const cachedStats = localStorage.getItem("admin_statistics_cache");
    if (cachedStats) {
      const { statistics, timestamp } = JSON.parse(cachedStats);
      if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 minute cache
        return statistics;
      }
    }
  } catch (error) {
    console.error("Error loading cached statistics:", error);
  }
  return null;
};

export const cacheStatistics = (statistics: Statistics): void => {
  try {
    localStorage.setItem("admin_statistics_cache", JSON.stringify({
      statistics,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error("Error caching statistics:", error);
  }
};

export const createStatisticsFetcher = (
  setStatistics: (stats: Statistics) => void,
  showError: (message: string) => void
) => {
  return async (): Promise<void> => {
    // First try to use cached data
    const cachedStats = getCachedStatistics();
    if (cachedStats) {
      setStatistics(cachedStats);
    }

    // Then fetch fresh data with retries
    let attempts = 0;
    const maxAttempts = 3;
    const baseTimeout = 5000; // 5 second base timeout

    while (attempts < maxAttempts) {
      try {
        const timeoutMs = baseTimeout * Math.pow(1.5, attempts);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const response = await fetch('/api/statistics', {
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json() as StatisticsResponse;
          
          if (data.success && data.data?.overview) {
            const newStats: Statistics = {
              totalUsers: data.data.overview.totalUsers || 0,
              totalLibrarians: data.data.overview.totalLibrarians || 0,
              totalBooks: data.data.overview.totalBooks || 0,
              activeLoans: data.data.overview.activeLoans || 0,
              overdue: data.data.overview.overdue || 0
            };

            setStatistics(newStats);
            cacheStatistics(newStats);
            return;
          }

          throw new Error('Invalid data format received');
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        attempts++;
        const error = err as Error;
        
        // Check if we need to retry
        if (attempts < maxAttempts) {
          console.warn(`Fetch attempt ${attempts} failed:`, error.message);
          // Wait with exponential backoff before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
          continue;
        }
        
        // All attempts failed
        console.error('All fetch attempts failed:', error);
        showError(
          error.name === 'AbortError' 
            ? "Statistics are taking longer than usual to load. Using cached data."
            : "Could not fetch latest statistics. Using cached data."
        );
        
        // Already using cached data from earlier, no need to set it again
        return;
      }
    }
  };
};