const pool = require('../config/database');
const { logError, logUserAction } = require('../utils/logger');
const { jsPDF } = require('jspdf');
const QRCode = require('qrcode');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');

// Helper function to get attendance data
const getAttendanceData = async (filters) => {
  const { class_id, student_id, date, start_date, end_date, report_type } = filters;

  let query = `
    SELECT a.id, a.name, a.index, a.class_code, a.student_id, a.date::text, a.status, a.notes, a.recorded_by, a.created_at,
           u.first_name, u.last_name, u.index_no as student_index, u.academic_year, c.class_name, c.class_code as subject,
           recorded_by_user.first_name as recorded_by_first_name,
           recorded_by_user.last_name as recorded_by_last_name
    FROM attendance a
    JOIN users u ON a.student_id = u.id
    JOIN classes c ON a.class_code = c.class_code
    LEFT JOIN users recorded_by_user ON a.recorded_by = recorded_by_user.id
  `;

  let conditions = [];
  let params = [];
  let paramCount = 0;

  if (class_id) {
    conditions.push(`a.class_code = $${++paramCount}`);
    params.push(class_id);
  }

  if (student_id) {
    conditions.push(`a.student_id = $${++paramCount}`);
    params.push(student_id);
  }

  if (date) {
    conditions.push(`a.date = $${++paramCount}::date`);
    params.push(date);
  }

  if (start_date && end_date) {
    conditions.push(`a.date >= $${++paramCount} AND a.date <= $${++paramCount}`);
    params.push(start_date, end_date);
  } else if (report_type === 'daily' && date) {
    conditions.push(`a.date = $${++paramCount}::date`);
    params.push(date);
  } else if (report_type === 'monthly' && start_date && end_date) {
    conditions.push(`a.date >= $${++paramCount} AND a.date <= $${++paramCount}`);
    params.push(start_date, end_date);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` ORDER BY a.date DESC, a.name ASC`;

  const result = await pool.query(query, params);
  return result.rows;
};

// Export daily attendance report
const exportDailyAttendance = async (req, res) => {
  try {
    const { date, class_id, format = 'csv' } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required for daily report' });
    }

    const attendanceData = await getAttendanceData({
      date,
      class_id,
      report_type: 'daily'
    });

    if (attendanceData.length === 0) {
      return res.status(404).json({ error: 'No attendance data found for the specified date' });
    }

    const reportDate = new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (format.toLowerCase() === 'pdf') {
      await generatePDFReport(res, attendanceData, `Daily Attendance Report - ${reportDate}`, 'daily');
    } else {
      await generateCSVReport(res, attendanceData, `daily_attendance_${date}.csv`, 'daily');
    }

    logUserAction('export_daily_attendance', req.user.id, {
      date,
      class_id,
      format,
      recordCount: attendanceData.length
    });

  } catch (error) {
    logError(error, { action: 'export_daily_attendance', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Export monthly attendance report
const exportMonthlyAttendance = async (req, res) => {
  try {
    const { start_date, end_date, class_id, format = 'csv' } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required for monthly report' });
    }

    const attendanceData = await getAttendanceData({
      start_date,
      end_date,
      class_id,
      report_type: 'monthly'
    });

    if (attendanceData.length === 0) {
      return res.status(404).json({ error: 'No attendance data found for the specified period' });
    }

    const startDate = new Date(start_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const endDate = new Date(end_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (format.toLowerCase() === 'pdf') {
      await generatePDFReport(res, attendanceData, `Monthly Attendance Report - ${startDate} to ${endDate}`, 'monthly');
    } else {
      const filename = `monthly_attendance_${start_date}_to_${end_date}.csv`;
      await generateCSVReport(res, attendanceData, filename, 'monthly');
    }

    logUserAction('export_monthly_attendance', req.user.id, {
      start_date,
      end_date,
      class_id,
      format,
      recordCount: attendanceData.length
    });

  } catch (error) {
    logError(error, { action: 'export_monthly_attendance', userId: req.user?.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to generate QR code for student
const generateQRCode = async (studentData) => {
  try {
    const qrData = {
      studentId: studentData.student_id,
      studentName: studentData.name || `${studentData.first_name} ${studentData.last_name}`,
      studentIndex: studentData.index || studentData.student_index,
      academicYear: studentData.academic_year,
      classId: studentData.class_code,
      className: studentData.class_name
    };

    const qrString = JSON.stringify(qrData);
    const qrCodeDataURL = await QRCode.toDataURL(qrString, {
      width: 60,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('QR Code generation error:', error);
    return null;
  }
};

// Generate PDF report with beautiful formatting and QR codes
const generatePDFReport = async (res, data, title, reportType) => {
  try {
    console.log('Starting PDF generation with data:', data.length, 'records');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Add beautiful header with gradient effect
    doc.setFillColor(41, 128, 185); // Blue background
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Title with white text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(title, 14, 25);

    // Subtitle
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Classroom Attendance Management System', 14, 33);

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Add generation info box with rounded corners effect
    doc.setFillColor(240, 248, 255);
    doc.rect(14, 50, pageWidth - 28, 20, 'F');
    doc.setDrawColor(41, 128, 185);
    doc.rect(14, 50, pageWidth - 28, 20, 'S');

    doc.setFontSize(10);
    doc.setTextColor(41, 128, 185);
    doc.setFont(undefined, 'bold');
    doc.text('Report Information', 18, 58);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 18, 64);
    doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 18, 68);

    // Add summary statistics with beautiful styling
    const presentCount = data.filter(r => r.status === 'present').length;
    const absentCount = data.filter(r => r.status === 'absent').length;
    const lateCount = data.filter(r => r.status === 'late').length;
    const excusedCount = data.filter(r => r.status === 'excused').length;

    doc.setFillColor(245, 245, 245);
    doc.rect(14, 80, pageWidth - 28, 25, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, 80, pageWidth - 28, 25, 'S');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Summary Statistics', 18, 90);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Records: ${data.length}`, 18, 98);
    doc.text(`Present: ${presentCount}`, 60, 98);
    doc.text(`Absent: ${absentCount}`, 100, 98);
    doc.text(`Late: ${lateCount}`, 140, 98);
    doc.text(`Excused: ${excusedCount}`, 170, 98);

    // Add student records with beautiful cards and QR codes
    let yPosition = 115;
    const recordsPerPage = 3; // Optimized for better spacing with QR codes and detailed info
    let recordCount = 0;
    let currentPage = 1;

    for (let i = 0; i < data.length; i++) {
      const record = data[i];

      // Check if we need a new page
      if (recordCount >= recordsPerPage) {
        doc.addPage();
        currentPage++;
        yPosition = 20;
        recordCount = 0;

        // Add page header for subsequent pages
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, pageWidth, 30, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(`${title} (Page ${currentPage})`, 14, 20);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Classroom Attendance Management System', 14, 28);

        // Reset text color
        doc.setTextColor(0, 0, 0);

        // Add summary statistics to each page
        doc.setFillColor(245, 245, 245);
        doc.rect(14, 40, pageWidth - 28, 20, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(14, 40, pageWidth - 28, 20, 'S');

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text('Summary Statistics', 18, 48);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Records: ${data.length}`, 18, 55);
        doc.text(`Present: ${presentCount}`, 60, 55);
        doc.text(`Absent: ${absentCount}`, 100, 55);
        doc.text(`Late: ${lateCount}`, 140, 55);
        doc.text(`Excused: ${excusedCount}`, 170, 55);

        yPosition = 70;
      }

      // Generate QR code for this student
      console.log('Generating QR code for student:', record.name || `${record.first_name} ${record.last_name}`);
      const qrCodeDataURL = await generateQRCode(record);

      // Student record card with beautiful styling
      doc.setFillColor(255, 255, 255);
      doc.rect(14, yPosition, pageWidth - 28, 45, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(14, yPosition, pageWidth - 28, 45, 'S');

      // Add subtle shadow effect
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPosition + 1, pageWidth - 28, 45, 'F');
      doc.setFillColor(255, 255, 255);
      doc.rect(14, yPosition, pageWidth - 28, 45, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(14, yPosition, pageWidth - 28, 45, 'S');

      // Add QR code if generated successfully
      if (qrCodeDataURL) {
        try {
          console.log('Adding QR code to PDF');
          doc.addImage(qrCodeDataURL, 'PNG', 18, yPosition + 5, 30, 30);
        } catch (error) {
          console.error('Error adding QR code image:', error);
        }
      } else {
        console.log('QR code generation failed for student:', record.name);
      }

      // Student information with better layout
      const startX = qrCodeDataURL ? 55 : 18;

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(41, 128, 185);
      doc.text(record.name || `${record.first_name} ${record.last_name}`, startX, yPosition + 8);

      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Index: ${record.index || record.student_index || 'N/A'}`, startX, yPosition + 16);
      doc.text(`Year: ${record.academic_year ? `Year ${record.academic_year}` : 'N/A'}`, startX, yPosition + 24);

      // Status with color coding
      const statusX = startX + 90;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');

      // Set color based on status
      switch (record.status) {
        case 'present':
          doc.setTextColor(0, 150, 0); // Green
          break;
        case 'absent':
          doc.setTextColor(200, 0, 0); // Red
          break;
        case 'late':
          doc.setTextColor(255, 140, 0); // Orange
          break;
        case 'excused':
          doc.setTextColor(100, 100, 100); // Gray
          break;
        default:
          doc.setTextColor(0, 0, 0); // Black
      }

      doc.text(record.status.charAt(0).toUpperCase() + record.status.slice(1), statusX, yPosition + 8);

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Additional info
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`Date: ${record.date}`, statusX, yPosition + 16);
      doc.text(`Class: ${record.class_name || 'N/A'}`, statusX, yPosition + 24);

      // Notes if available
      if (record.notes && record.notes.trim()) {
        doc.setFontSize(8);
        doc.text(`Notes: ${record.notes}`, startX, yPosition + 35);
      }

      yPosition += 50;
      recordCount++;
    }

    // Add beautiful footer to all pages
    const totalPages = doc.internal.getNumberOfPages();

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      doc.setPage(pageNum);
      const footerY = pageHeight - 25;
      doc.setFillColor(41, 128, 185);
      doc.rect(0, footerY, pageWidth, 25, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Generated by Classroom Attendance Management System', 14, footerY + 8);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 40, footerY + 8);
      doc.text(`Total Students: ${data.length}`, 14, footerY + 16);
    }

    console.log('PDF generation completed, sending response');

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`);

    // Send PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    console.log('PDF buffer size:', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to generate PDF: ' + error.message });
  }
};

// Generate CSV report
const generateCSVReport = async (res, data, filename, reportType) => {
  const csvData = data.map(record => ({
    'Student Name': record.name || `${record.first_name} ${record.last_name}`,
    'Index Number': record.index || record.student_index || '-',
    'Academic Year': record.academic_year ? `Year ${record.academic_year}` : '-',
    'Class': record.class_name || '-',
    'Subject': record.subject || '-',
    'Date': record.date,
    'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1),
    'Notes': record.notes || '-',
    'Recorded By': record.recorded_by_first_name ? `${record.recorded_by_first_name} ${record.recorded_by_last_name}` : '-',
    'Created At': new Date(record.created_at).toLocaleString()
  }));

  // Create CSV content
  const headers = Object.keys(csvData[0]);
  const csvContent = [
    headers.join(','),
    ...csvData.map(row =>
      headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes in CSV
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  // Set response headers
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Send CSV
  res.send(csvContent);
};

module.exports = {
  exportDailyAttendance,
  exportMonthlyAttendance
};
