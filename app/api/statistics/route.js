import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/app/models/User";
import Book from "@/app/models/Book";
import Transaction from "@/app/models/Transaction";

const QUERY_TIMEOUT = 5000; // 5 seconds timeout for individual queries
const TOTAL_TIMEOUT = 15000; // 15 seconds total timeout
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// In-memory cache using Map
const cache = new Map();

// Cache management
function getCachedData(key) {
  try {
    const cached = cache.get(key);
    if (cached) {
      const { data, timestamp } = cached;
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
      // Clean up expired cache
      cache.delete(key);
    }
  } catch (error) {
    console.error('Cache retrieval error:', error);
  }
  return null;
}

function setCachedData(key, data) {
  try {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Cache storage error:', error);
  }
}

// Clean up expired cache entries periodically
setInterval(() => {
  try {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (!value || !value.timestamp || now - value.timestamp >= CACHE_TTL) {
        cache.delete(key);
      }
    }
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
}, Math.min(CACHE_TTL, 5 * 60 * 1000)); // Run cleanup every 5 minutes or TTL, whichever is shorter

// Helper to run a query with timeout and retry logic
async function runQueryWithTimeout(query, timeoutMs = QUERY_TIMEOUT, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        query,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Query timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      console.warn(`Retrying query, attempt ${attempt + 1}/${retries}`);
    }
  }
  throw lastError;
}

export async function GET(request) {
  try {
    // Validate request
    if (!request?.url) {
      throw new Error('Invalid request URL');
    }

    // Get date range from query params (default to last 30 days)
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';
    const numericPeriod = parseInt(period);
    
    // Validate period
    if (isNaN(numericPeriod) || numericPeriod <= 0 || numericPeriod > 365) {
      return NextResponse.json(
        { success: false, error: "Invalid period parameter. Must be between 1 and 365 days." },
        { status: 400 }
      );
    }

    const cacheKey = `statistics_${period}`;
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Connect to database
    try {
      await dbConnect();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { success: false, error: "Database connection failed" },
        { status: 503 }
      );
    }

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(period));

    // Set up an overall timeout for the entire request
    const overallTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Overall request timed out')), TOTAL_TIMEOUT)
    );

    // Basic statistics (parallel queries with individual timeouts)
    const basicStatsPromise = Promise.all([
      runQueryWithTimeout(Book.countDocuments()),
      runQueryWithTimeout(User.countDocuments({ role: "student" })),
      runQueryWithTimeout(User.countDocuments({ role: "librarian" })),
      runQueryWithTimeout(Transaction.countDocuments({ status: "borrowed" })),
      runQueryWithTimeout(Transaction.countDocuments({
        status: "borrowed",
        dueDate: { $lt: new Date() }
      })),
      runQueryWithTimeout(Transaction.countDocuments())
    ]).catch(error => {
      console.error('Basic stats query error:', error);
      // Return fallback values on error
      return [0, 0, 0, 0, 0, 0];
    });

    let basicStats;
    try {
      basicStats = await Promise.race([basicStatsPromise, overallTimeoutPromise]);
    } catch (error) {
      console.error('Basic stats timeout error:', error);
      basicStats = [0, 0, 0, 0, 0, 0];
    }

    const [
      totalBooks,
      totalUsers,
      totalLibrarians,
      activeLoans,
      overdue,
      totalTransactions
    ] = basicStats;

    // Popular books (most borrowed) with timeout
    const popularBooksPromise = runQueryWithTimeout(Transaction.aggregate([
      { 
        $match: { 
          createdAt: { $gte: dateLimit },
          type: 'borrow'
        }
      },
      {
        $group: {
          _id: '$bookId',
          borrowCount: { $sum: 1 }
        }
      },
      { $sort: { borrowCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'bookDetails'
        }
      },
      {
        $unwind: '$bookDetails'
      },
      {
        $project: {
          title: '$bookDetails.title',
          author: '$bookDetails.author',
          borrowCount: 1
        }
      }
    ]));

    // Category distribution
    const categoryStatsPromise = runQueryWithTimeout(Book.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]));

    // Daily transactions trend
    const dailyTransactionsPromise = runQueryWithTimeout(Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: dateLimit }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          borrows: {
            $sum: { $cond: [{ $eq: ['$type', 'borrow'] }, 1, 0] }
          },
          returns: {
            $sum: { $cond: [{ $eq: ['$type', 'return'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]));

    // Most active users
    const activeUsersPromise = runQueryWithTimeout(Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: dateLimit }
        }
      },
      {
        $group: {
          _id: '$userId',
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { transactionCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          name: '$userDetails.name',
          studentId: '$userDetails.studentId',
          transactionCount: 1
        }
      }
    ]));

    // Book availability status
    const availabilityStatusPromise = runQueryWithTimeout(Book.aggregate([
      {
        $group: {
          _id: null,
          totalCopies: { $sum: '$totalCopies' },
          availableCopies: { $sum: '$availableCopies' }
        }
      }
    ]));

    // Fines statistics
    const finesDataPromise = runQueryWithTimeout(Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: dateLimit },
          fineAmount: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          totalFines: { $sum: '$fineAmount' },
          finesPaid: {
            $sum: { $cond: [{ $eq: ['$fineStatus', 'paid'] }, '$fineAmount', 0] }
          },
          unpaidFines: {
            $sum: { $cond: [{ $eq: ['$fineStatus', 'unpaid'] }, '$fineAmount', 0] }
          }
        }
      }
    ]));

    // Wait for all queries to complete with proper error handling
    let detailedStats;
    try {
      detailedStats = await Promise.race([
        Promise.all([
          popularBooksPromise.catch(error => {
            console.error('Popular books query failed:', error);
            return [];
          }),
          categoryStatsPromise.catch(error => {
            console.error('Category stats query failed:', error);
            return [];
          }),
          dailyTransactionsPromise.catch(error => {
            console.error('Daily transactions query failed:', error);
            return [];
          }),
          activeUsersPromise.catch(error => {
            console.error('Active users query failed:', error);
            return [];
          }),
          availabilityStatusPromise.catch(error => {
            console.error('Availability status query failed:', error);
            return [];
          }),
          finesDataPromise.catch(error => {
            console.error('Fines data query failed:', error);
            return [];
          })
        ]),
        overallTimeoutPromise
      ]);
    } catch (error) {
      console.error('Failed to execute queries:', error);
      detailedStats = [[], [], [], [], [], []];
    }

    const [
      popularBooks,
      categoryStats,
      dailyTransactions,
      activeUsers,
      availabilityStatus,
      finesData
    ] = detailedStats;

    const responseData = {
      overview: {
        totalBooks,
        totalUsers,
        totalLibrarians,
        activeLoans,
        overdue,
        totalTransactions,
        availability: availabilityStatus[0] || {
          totalCopies: 0,
          availableCopies: 0
        }
      },
      trends: {
        daily: dailyTransactions,
        categories: categoryStats
      },
      insights: {
        popularBooks,
        activeUsers
      },
      finances: {
        fines: finesData[0] || {
          totalFines: 0,
          finesPaid: 0,
          unpaidFines: 0
        }
      }
    };

    // Cache the successful response
    setCachedData(cacheKey, responseData);

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
