import React from 'react';
import StudentReport from '../components/pdf/StudentReport';

const StudentReportPage: React.FC = () => {
  // This would typically come from your data/API
  const reportData = {
    schoolName: "مدرسة النموذجية",
    studentName: "أحمد محمد",
    studentId: "12345",
    grade: "الصف الثالث",
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <button 
          onClick={() => window.print()}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
        >
          طباعة التقرير
        </button>
      </div>

      {/* The report will be rendered with proper A4 sizing and footer */}
      <StudentReport {...reportData} />
    </div>
  );
};

export default StudentReportPage; 