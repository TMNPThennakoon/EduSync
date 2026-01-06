const pool = require('../config/database');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { logError, logUserAction } = require('../utils/logger');
const debugLog = require('../utils/debugLogger');

// Get lecture materials for a class
const getLectureMaterials = async (req, res) => {
  try {
    const { classId } = req.params;
    const userRole = req.user?.role;

    debugLog('getLectureMaterials', { classId, userRole });

    let query = `
SELECT
lm.*,
  u.first_name as uploaded_by_first_name,
  u.last_name as uploaded_by_last_name
      FROM lecture_materials lm
      LEFT JOIN users u ON lm.uploaded_by = u.id
      WHERE lm.class_code = $1
  `;

    // Filter out hidden materials for students
    if (userRole === 'student') {
      query += ` AND lm.is_hidden = false`;
    }

    query += ` ORDER BY lm.created_at DESC`;

    const result = await pool.query(query, [classId]);

    debugLog('Found materials for class', { classId, count: result.rows.length });

    res.json({
      success: true,
      data: {
        materials: result.rows
      }
    });
  } catch (error) {
    debugLog('getLectureMaterials error', { error: error.message });
    logError(error, { action: 'get_lecture_materials', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Upload lecture material (link or file)
const uploadLectureMaterial = async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, type, url, is_hidden, section } = req.body;
    const uploadedBy = req.user.id;
    const selectedSection = section || 'General Resources';

    debugLog('uploadLectureMaterial params', { classId, title, type, url, is_hidden, section: selectedSection, uploadedBy, hasFile: !!req.file });

    // Validate required fields
    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }

    if (type === 'link' && !url) {
      return res.status(400).json({ error: 'URL is required for link type' });
    }

    const isHidden = is_hidden === 'true' || is_hidden === true;

    if (type === 'file') {
      // Handle file upload (URL provided by frontend)
      const { fileUrl } = req.body;

      if (!fileUrl) {
        return res.status(400).json({ error: 'File URL is required for file type' });
      }

      const result = await pool.query(`
        INSERT INTO lecture_materials(class_code, title, type, file_url, file_name, uploaded_by, is_hidden, section)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [classId, title, type, fileUrl, title, uploadedBy, isHidden, selectedSection]);

      logUserAction('lecture_material_uploaded', uploadedBy, {
        class_code: classId,
        material_id: result.rows[0].id,
        type: 'file',
        section: selectedSection
      });

      res.status(201).json({
        success: true,
        message: 'Lecture material uploaded successfully',
        data: {
          material: result.rows[0]
        }
      });
    } else {
      // Handle link
      const result = await pool.query(`
        INSERT INTO lecture_materials(class_code, title, type, url, uploaded_by, is_hidden, section)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [classId, title, type, url, uploadedBy, isHidden, selectedSection]);

      logUserAction('lecture_material_uploaded', uploadedBy, {
        class_code: classId,
        material_id: result.rows[0].id,
        type: 'link',
        section: selectedSection
      });

      res.status(201).json({
        success: true,
        message: 'Lecture material added successfully',
        data: {
          material: result.rows[0]
        }
      });
    }
  } catch (error) {
    debugLog('uploadLectureMaterial general error', { error: error.message, stack: error.stack });
    logError(error, { action: 'upload_lecture_material', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Delete lecture material
const deleteLectureMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const userId = req.user.id;

    // Check if material exists
    const materialResult = await pool.query(`
SELECT * FROM lecture_materials WHERE id = $1
  `, [materialId]);

    if (materialResult.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = materialResult.rows[0];

    // Check permission - allow uploader or admin
    if (material.uploaded_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await pool.query('DELETE FROM lecture_materials WHERE id = $1', [materialId]);

    logUserAction('lecture_material_deleted', userId, {
      material_id: materialId,
      class_code: material.class_code
    });

    res.json({
      success: true,
      message: 'Lecture material deleted successfully'
    });
  } catch (error) {
    logError(error, { action: 'delete_lecture_material', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Toggle material visibility
const toggleMaterialVisibility = async (req, res) => {
  try {
    const { materialId } = req.params;
    const userId = req.user.id;

    // Check if material exists
    const materialResult = await pool.query(`
SELECT * FROM lecture_materials WHERE id = $1
  `, [materialId]);

    if (materialResult.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = materialResult.rows[0];

    // Check permissions - allow uploader or admin
    if (parseInt(material.uploaded_by) !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Toggle visibility
    const result = await pool.query(`
      UPDATE lecture_materials 
      SET is_hidden = NOT is_hidden 
      WHERE id = $1
RETURNING *
  `, [materialId]);

    logUserAction('lecture_material_visibility_toggled', userId, {
      material_id: materialId,
      new_status: result.rows[0].is_hidden ? 'hidden' : 'visible'
    });

    res.json({
      success: true,
      message: `Material is now ${result.rows[0].is_hidden ? 'hidden' : 'visible'} `,
      data: {
        material: result.rows[0]
      }
    });
  } catch (error) {
    logError(error, { action: 'toggle_material_visibility', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

module.exports = {
  getLectureMaterials,
  uploadLectureMaterial,
  deleteLectureMaterial,
  toggleMaterialVisibility
};

