/**
 * Loading optimization utilities for better performance
 */

/**
 * Fetches data with timeout protection and caching
 * @param url - The API URL to fetch
 * @param timeoutMs - Timeout in milliseconds
 * @param cacheKey - localStorage cache key
 * @param cacheDurationMs - Cache duration in milliseconds
 * @param transform - Optional function to transform the result before caching
 * @returns The fetched data
 */
export async function fetchWithTimeoutAndCache<T>(
  url: string, 
  timeoutMs: number = 5000, 
  cacheKey: string | null = null, 
  cacheDurationMs: number = 5 * 60 * 1000, 
  transform?: ((data: any) => T) | null
): Promise<T> {
  // Try to load from cache if available
  if (cacheKey && typeof window !== 'undefined') {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < cacheDurationMs) {
          return data as T;
        }
      }
    } catch (error) {
      console.error(`Error loading from cache ${cacheKey}:`, error);
    }
  }
  
  try {
    // Create a timeout promise to limit waiting time
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    );
    
    // The fetch request
    const fetchPromise = fetch(url);
    
    // Race between timeout and fetch
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (response.ok) {
      const result = await response.json();
      let dataToCache: any = result;
      
      // Apply transform function if provided
      if (transform && typeof transform === 'function') {
        dataToCache = transform(result);
      }
      
      // Cache the result with timestamp
      if (cacheKey && typeof window !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: dataToCache,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error(`Error caching data for ${cacheKey}:`, error);
        }
      }
      
      return dataToCache as T;
    }
    
    throw new Error(`Request failed with status: ${response.status}`);
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    
    // Try to use stale cache as fallback
    if (cacheKey && typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const { data } = JSON.parse(cachedData);
          return data as T;
        }
      } catch (e) {
        console.error(`Error loading stale cache for ${cacheKey}:`, e);
      }
    }
    
    throw error;
  }
}

/**
 * Delays execution with promise to allow UI to render first
 * @param ms - Delay in milliseconds
 */
export function delay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ProgressiveTask<T> {
  task: () => Promise<T>;
  delay: number;
  name: string;
}

/**
 * Progressively enhances loading by executing tasks with slight delays
 * @param tasks - Array of tasks to execute with delays
 * @returns Results of all tasks
 */
export async function progressiveLoading<T>(tasks: ProgressiveTask<T>[]): Promise<(T | null)[]> {
  const results: (T | null)[] = [];
  
  for (const task of tasks) {
    if (task.delay > 0) {
      await delay(task.delay);
    }
    
    try {
      const result = await task.task();
      results.push(result);
    } catch (error) {
      console.error(`Task ${task.name} failed:`, error);
      results.push(null);
    }
  }
  
  return results;
}

/**
 * Creates a rate-limited function that won't execute more than once within the specified interval
 * @param func - The function to throttle
 * @param limitMs - The minimum interval between executions in milliseconds
 * @returns The throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T, 
  limitMs: number = 1000
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let lastRun = 0;
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    const now = Date.now();
    const elapsed = now - lastRun;
    
    if (elapsed >= limitMs) {
      lastRun = now;
      return func.apply(this, args);
    } else {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        lastRun = Date.now();
        func.apply(this, args);
      }, limitMs - elapsed);
      return undefined;
    }
  };
}
