import dbConnect from "./db";
import User from "../app/models/User";

/**
 * Generates a unique student ID in the format: STU + YYYY + 4-digit sequence
 * Example: STU20240001, STU20240002, etc.
 */
export async function generateStudentId() {
  try {
    await dbConnect();
    
    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Find the highest student ID for the current year
    const pattern = new RegExp(`^STU${currentYear}\\d{4}$`);
    const lastStudent = await User.findOne({
      studentId: pattern
    }).sort({ studentId: -1 });
    
    let sequence = 1;
    
    if (lastStudent && lastStudent.studentId) {
      // Extract the sequence number from the last student ID
      const lastSequence = parseInt(lastStudent.studentId.slice(-4));
      sequence = lastSequence + 1;
    }
    
    // Format: STU + YYYY + 4-digit sequence (padded with zeros)
    const studentId = `STU${currentYear}${sequence.toString().padStart(4, '0')}`;
    
    return studentId;
  } catch (error) {
    console.error("Error generating student ID:", error);
    // Fallback: use timestamp if database operation fails
    const timestamp = Date.now().toString().slice(-6);
    return `STU${new Date().getFullYear()}${timestamp}`;
  }
}

/**
 * Generates a unique librarian ID in the format: LIB + YYYY + 4-digit sequence
 * Example: LIB20240001, LIB20240002, etc.
 */
export async function generateLibrarianId() {
  try {
    await dbConnect();
    
    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Find the highest librarian ID for the current year
    const pattern = new RegExp(`^LIB${currentYear}\\d{4}$`);
    const lastLibrarian = await User.findOne({
      librarianId: pattern
    }).sort({ librarianId: -1 });
    
    let sequence = 1;
    
    if (lastLibrarian && lastLibrarian.librarianId) {
      // Extract the sequence number from the last librarian ID
      const lastSequence = parseInt(lastLibrarian.librarianId.slice(-4));
      sequence = lastSequence + 1;
    }
    
    // Format: LIB + YYYY + 4-digit sequence (padded with zeros)
    const librarianId = `LIB${currentYear}${sequence.toString().padStart(4, '0')}`;
    
    return librarianId;
  } catch (error) {
    console.error("Error generating librarian ID:", error);
    // Fallback: use timestamp if database operation fails
    const timestamp = Date.now().toString().slice(-6);
    return `LIB${new Date().getFullYear()}${timestamp}`;
  }
}

/**
 * Validates if a student ID follows the correct format
 */
export function validateStudentId(studentId) {
  if (!studentId) return false;
  
  // Format: STU + YYYY + 4 digits
  const pattern = /^STU\d{8}$/;
  return pattern.test(studentId);
}

/**
 * Checks if a student ID already exists
 */
export async function isStudentIdUnique(studentId) {
  try {
    await dbConnect();
    const existingUser = await User.findOne({ studentId });
    return !existingUser;
  } catch (error) {
    console.error("Error checking student ID uniqueness:", error);
    return false;
  }
}
