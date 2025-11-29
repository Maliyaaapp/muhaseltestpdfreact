import React from 'react';
import PDFContainer from './PDFContainer';
import ReportFooter from './ReportFooter';

interface StudentReportProps {
  schoolName: string;
  studentName: string;
  studentId: string;
  grade: string;
  // Add other report data props as needed
}

const StudentReport: React.FC<StudentReportProps> = ({
  schoolName,
  studentName,
  studentId,
  grade,
}) => {
  return (
    <PDFContainer>
      {/* Report Header */}
      <div className="report-header">
        <h1>تقرير الطالب</h1>
        <div className="school-name">{schoolName}</div>
      </div>

      {/* Student Information */}
      <div className="student-info">
        <div className="info-row">
          <span className="label">اسم الطالب:</span>
          <span className="value">{studentName}</span>
        </div>
        <div className="info-row">
          <span className="label">رقم الطالب:</span>
          <span className="value">{studentId}</span>
        </div>
        <div className="info-row">
          <span className="label">الصف:</span>
          <span className="value">{grade}</span>
        </div>
      </div>

      {/* Report Content */}
      <div className="report-content">
        {/* Add your report content here */}
      </div>

      {/* Footer - will automatically handle positioning and visibility */}
      <ReportFooter
        schoolName={schoolName}
        type="report"
      />

      <style>
        {`
          .report-header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 1rem;
            border-bottom: 1px solid #eee;
          }

          .report-header h1 {
            font-size: 24px;
            color: #333;
            margin-bottom: 0.5rem;
          }

          .school-name {
            font-size: 18px;
            color: #666;
          }

          .student-info {
            margin: 2rem 0;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 4px;
          }

          .info-row {
            display: flex;
            margin-bottom: 0.5rem;
            padding: 0.5rem 0;
          }

          .info-row .label {
            font-weight: bold;
            width: 120px;
            color: #555;
          }

          .info-row .value {
            flex: 1;
            color: #333;
          }

          .report-content {
            min-height: 50vh; /* Ensure enough space for content */
            padding: 1rem 0;
          }

          @media print {
            .report-header {
              break-inside: avoid;
            }

            .student-info {
              break-inside: avoid;
            }
          }
        `}
      </style>
    </PDFContainer>
  );
};

export default StudentReport; 