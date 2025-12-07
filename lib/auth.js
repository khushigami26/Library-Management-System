import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { headers } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// This function only verifies the JWT token without checking the database
// Safe to use in middleware
export const verifyJWT = (token) => {
  try {
    if (!token) {
      return null;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== 'object') {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error("JWT verification error:", error.message);
    return null;
  }
};

// Extract token from request
export const getTokenFromRequest = async (req) => {
  try {
    let token;
    
    // Try to get token from request headers
    if (req && req.headers) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    // If no token in header, try cookies
    if (!token) {
      const cookiesList = await cookies();
      const tokenCookie = cookiesList.get("token");
      token = tokenCookie ? tokenCookie.value : null;
    }

    return token;
  } catch (error) {
    console.error("Get token error:", error);
    return null;
  }
};

// Full auth verification including database check
// DO NOT use in middleware, only in API routes
export const verifyAuth = async (req) => {
  try {
    const token = await getTokenFromRequest(req);
    
    if (!token) {
      console.log("No token found");
      return null;
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return null;
    }

    // Dynamically import User to avoid Edge runtime issues
    const User = (await import("@/app/models/User")).default;
    
    // Check if user exists and is not suspended
    const user = await User.findById(decoded.userId);
    if (!user || user.status === "suspended") {
      console.log("User not found or suspended");
      return null;
    }

    return {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      status: user.status
    };
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
};

export const generateToken = (user) => {
  if (!user._id) {
    throw new Error("User ID is required");
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      version: '1.0' // Add version for future compatibility
    },
    JWT_SECRET,
    { 
      expiresIn: "30d", // Extend to 30 days for persistent login
      algorithm: 'HS256'
    }
  );
};

export const refreshToken = async (token) => {
  try {
    // Verify the existing token
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    
    // Check if token has required fields
    if (!decoded.userId) {
      throw new Error("Invalid token structure");
    }

    // Dynamically import User to avoid Edge runtime issues
    const User = (await import("@/app/models/User")).default;
    
    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.status === "suspended") {
      throw new Error("User is suspended");
    }

    // Generate new token
    return generateToken(user);
  } catch (error) {
    console.error("Token refresh error:", error.message);
    throw new Error("Invalid or expired token");
  }
};

export const isAdmin = async (req) => {
  const auth = await verifyAuth(req);
  return auth?.role === "admin";
};

export const isLibrarian = async (req) => {
  const auth = await verifyAuth(req);
  return auth?.role === "librarian";
};

export const isStudent = async (req) => {
  const auth = await verifyAuth(req);
  return auth?.role === "student";
};
