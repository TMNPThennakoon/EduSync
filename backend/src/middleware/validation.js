const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation Errors:', errors.array()); // Log detailed errors
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const validateUser = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('first_name').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('last_name').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('role').isIn(['admin', 'lecturer', 'student']).withMessage('Invalid role'),
  // University student specific fields
  body('address').optional().trim().isLength({ min: 1 }).withMessage('Address must not be empty'),
  body('date_of_birth').optional().isISO8601().withMessage('Invalid date of birth format'),
  body('academic_year').optional().isInt({ min: 1, max: 4 }).withMessage('Academic year must be between 1 and 4').toInt(),
  body('semester').optional().isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8').toInt(),
  body('nic').optional().matches(/^([0-9]{9}[VvXx]|[0-9]{12})$/).withMessage('Invalid NIC format (Old: 345677888V or New: 200123456789)'),
  body('student_index').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Student index must be between 1 and 20 characters'),
  body('phone_number').optional().matches(/^\+94\d{9}$/).withMessage('Invalid phone number format (e.g., +94771234567)'),
  body('gender').optional().isIn(['male', 'female']).withMessage('Gender must be male or female'),
  body('lecturer_id').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Lecturer ID must be between 1 and 20 characters'),
  body('lecturer_type').optional().isIn(['senior', 'assistant', 'visiting', 'temporary', 'permanent']).withMessage('Invalid lecturer type'),
  body('department').isIn(['AT', 'ET', 'IAT', 'ICT', 'CS']).withMessage('Department is required and must be valid'),
  body('batch').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Batch is required (e.g. 20/21)'),
  body('profile_image_url')
    .optional()
    .isURL()
    .withMessage('Profile image URL must be a valid URL'),
  handleValidationErrors
];

const validateUserUpdate = [
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('first_name').optional().trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('last_name').optional().trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('role').optional().isIn(['admin', 'lecturer', 'student']).withMessage('Invalid role'),
  // University student specific fields
  body('address').optional().trim().isLength({ min: 1 }).withMessage('Address must not be empty'),
  body('date_of_birth').optional().isISO8601().withMessage('Invalid date of birth format'),
  body('academic_year').optional().isInt({ min: 1, max: 4 }).withMessage('Academic year must be between 1 and 4').toInt(),
  body('semester').optional().isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8').toInt(),
  body('nic').optional().matches(/^([0-9]{9}[VvXx]|[0-9]{12})$/).withMessage('Invalid NIC format (Old: 345677888V or New: 200123456789)'),
  body('student_index').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Student index must be between 1 and 20 characters'),
  body('phone_number').optional().matches(/^\+94\d{9}$/).withMessage('Invalid phone number format (e.g., +94771234567)'),
  body('gender').optional().isIn(['male', 'female']).withMessage('Gender must be male or female'),
  body('lecturer_id').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Lecturer ID must be between 1 and 20 characters'),
  body('lecturer_type').optional().isIn(['senior', 'assistant', 'visiting', 'temporary', 'permanent']).withMessage('Invalid lecturer type'),
  body('department').optional().isIn(['AT', 'ET', 'IAT', 'ICT', 'CS']).withMessage('Department must be valid'),
  body('batch').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Batch must be valid (e.g. 20/21)'),
  body('profile_image_url')
    .optional()
    .isURL()
    .withMessage('Profile image URL must be a valid URL'),
  handleValidationErrors
];

const validateClass = [
  body('name').trim().isLength({ min: 1 }).withMessage('Class name is required'),
  body('subject').trim().isLength({ min: 1 }).withMessage('Subject is required'),
  body('academic_year').trim().isLength({ min: 1 }).withMessage('Academic year is required'),
  body('semester').trim().isLength({ min: 1 }).withMessage('Semester is required'),
  body('department').isIn(['AT', 'ET', 'IAT', 'ICT', 'CS']).withMessage('Department is required and must be valid'),
  handleValidationErrors
];

const validateAttendance = [
  body('class_id').isInt({ min: 1 }).withMessage('Valid class ID is required'),
  body('student_id').isInt({ min: 1 }).withMessage('Valid student ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid attendance status'),
  handleValidationErrors
];

const validateAssignment = [
  body('class_id').trim().isLength({ min: 1 }).withMessage('Valid class ID is required'),
  body('title').trim().isLength({ min: 1 }).withMessage('Assignment title is required'),
  body('description').optional().trim().isLength({ min: 1 }).withMessage('Description must not be empty'),
  body('max_marks').isInt({ min: 1 }).withMessage('Max marks must be a positive integer').toInt(),
  body('due_date').optional().isISO8601().withMessage('Valid due date is required'),
  body('assignment_type').trim().isLength({ min: 1 }).withMessage('Assignment type is required'),
  body('department').isIn(['AT', 'ET', 'IAT', 'ICT', 'CS']).withMessage('Department is required and must be valid'),
  handleValidationErrors
];

const validateGrade = [
  body('assignment_id').isInt({ min: 1 }).withMessage('Valid assignment ID is required'),
  body('student_id').isInt({ min: 1 }).withMessage('Valid student ID is required'),
  body('score').isInt({ min: 0 }).withMessage('Score must be a non-negative integer'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUser,
  validateUserUpdate,
  validateClass,
  validateAttendance,
  validateAssignment,
  validateGrade
};
