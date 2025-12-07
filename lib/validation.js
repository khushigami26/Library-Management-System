/**
 * Validation utilities for email and password requirements
 */

/**
 * Email validation
 */
export const validateEmail = (email) => {
  const errors = [];

  if (!email) {
    errors.push("Email is required");
    return { isValid: false, errors };
  }

  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push("Email must be in valid format (e.g., user@example.com)");
  }

  // Must contain @ symbol
  if (!email.includes("@")) {
    errors.push("Email must contain @ symbol");
  }

  // Must contain .com, .edu, .org, etc.
  const domainRegex =
    /\.(com|edu|org|net|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum)$/i;
  if (!domainRegex.test(email)) {
    errors.push("Email must end with a valid domain (.com, .edu, .org, etc.)");
  }

  // Length check
  if (email.length > 254) {
    errors.push("Email must be less than 254 characters");
  }

  // Local part (before @) length check
  const localPart = email.split("@")[0];
  if (localPart && localPart.length > 64) {
    errors.push("Email local part must be less than 64 characters");
  }

  // No consecutive dots
  if (email.includes("..")) {
    errors.push("Email cannot contain consecutive dots");
  }

  // No leading or trailing dots
  if (email.startsWith(".") || email.endsWith(".")) {
    errors.push("Email cannot start or end with a dot");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Password validation
 */
export const validatePassword = (password) => {
  const errors = [];
  const requirements = [];

  if (!password) {
    errors.push("Password is required");
    return { isValid: false, errors, requirements };
  }

  // Minimum 6 characters
  const hasMinLength = password.length >= 6;
  requirements.push({
    text: "At least 6 characters",
    met: hasMinLength,
  });
  if (!hasMinLength) {
    errors.push("Password must be at least 6 characters long");
  }

  // Must contain at least one letter (uppercase or lowercase), number, or special character
  const hasValidChar =
    /[A-Za-z]/.test(password) ||
    /\d/.test(password) ||
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  requirements.push({
    text: "At least one letter, number, or special character",
    met: hasValidChar,
  });
  if (!hasValidChar) {
    errors.push(
      "Password must contain at least one letter, number, or special character"
    );
  }

  // Calculate password strength
  let strength = 0;
  if (hasMinLength) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 1;
  if (password.length >= 10) strength += 1;

  let strengthText = "Weak";
  let strengthColor = "text-red-600";
  if (strength >= 2) {
    strengthText = "Fair";
    strengthColor = "text-yellow-600";
  }
  if (strength >= 3) {
    strengthText = "Good";
    strengthColor = "text-blue-600";
  }
  if (strength >= 4) {
    strengthText = "Strong";
    strengthColor = "text-green-600";
  }
  if (strength >= 5) {
    strengthText = "Very Strong";
    strengthColor = "text-green-700";
  }

  return {
    isValid: errors.length === 0,
    errors,
    requirements,
    strength: {
      score: strength,
      text: strengthText,
      color: strengthColor,
      percentage: Math.min((strength / 6) * 100, 100),
    },
  };
};

/**
 * Confirm password validation
 */
export const validateConfirmPassword = (password, confirmPassword) => {
  const errors = [];

  if (!confirmPassword) {
    errors.push("Please confirm your password");
    return { isValid: false, errors };
  }

  if (password !== confirmPassword) {
    errors.push("Passwords do not match");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Real-time validation for forms
 */
export const validateForm = (formData, fields = []) => {
  const errors = {};
  let isValid = true;

  fields.forEach((field) => {
    switch (field) {
      case "email":
        const emailValidation = validateEmail(formData.email);
        if (!emailValidation.isValid) {
          errors.email = emailValidation.errors;
          isValid = false;
        }
        break;

      case "password":
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          errors.password = passwordValidation.errors;
          isValid = false;
        }
        break;

      case "confirmPassword":
        const confirmValidation = validateConfirmPassword(
          formData.password,
          formData.confirmPassword
        );
        if (!confirmValidation.isValid) {
          errors.confirmPassword = confirmValidation.errors;
          isValid = false;
        }
        break;

      case "name":
        if (!formData.name || formData.name.trim().length < 2) {
          errors.name = ["Name must be at least 2 characters long"];
          isValid = false;
        }
        break;

      case "role":
        if (!formData.role) {
          errors.role = ["Please select a role"];
          isValid = false;
        }
        break;
    }
  });

  return { isValid, errors };
};

/**
 * Get password strength indicator component data
 */
export const getPasswordStrengthIndicator = (password) => {
  if (!password) return null;

  const validation = validatePassword(password);
  return {
    strength: validation.strength,
    requirements: validation.requirements,
  };
};
