# PDF Service

This module provides a comprehensive set of utilities for generating, printing, and exporting PDF reports for the school management system.

## Structure

The PDF service is organized into the following directories:

- `core/`: Core PDF generation and printing functionality
- `utils/`: Utility functions for formatting, styling, and status helpers
- `receipts/`: Receipt generation, printing, and export
- `student-reports/`: Student financial report generation, printing, and export
- `installments/`: Student installment report generation, printing, and export
- `fees-collection/`: Fees collection report generation (to be implemented)
- `subscription/`: Subscription invoice generation (to be implemented)

## Main Components

### Core Functionality

- `pdf-generation.ts`: Provides the `generatePDF` function for converting HTML to PDF using Electron
- `print-utils.ts`: Provides utilities for printing HTML content directly to the printer

### Utilities

- `formatting.ts`: Date, currency, and text formatting utilities
- `status-helpers.ts`: Functions for determining status text, colors, and classes
- `print-styles.ts`: CSS styles and utilities for print-optimized output
- `electron-integration.ts`: Utilities for interacting with Electron for PDF generation

### Report Types

#### Receipts

- `receipt-html.ts`: Generates HTML for payment receipts
- `receipt-print.ts`: Prints receipts directly to the printer
- `receipt-export.ts`: Exports receipts as PDF files

#### Student Reports

- `student-report-html.ts`: Generates HTML for student financial reports
- `student-report-print.ts`: Prints student reports directly to the printer
- `student-report-export.ts`: Exports student reports as PDF files

#### Installment Reports

- `installment-report-html.ts`: Generates HTML for student installment reports
- `installment-report-print.ts`: Prints installment reports directly to the printer
- `installment-report-export.ts`: Exports installment reports as PDF files

## Usage

All functionality is exported through the main `index.ts` file. For backward compatibility, the `pdfPrinter.ts` file in the parent directory re-exports all functionality from the modular structure.

### Example: Generating a Receipt PDF

```typescript
import { 
  downloadReceiptAsPDF, 
  ReceiptData 
} from '../services/pdf';

// Prepare receipt data
const receiptData: ReceiptData = {
  receiptNumber: 'REC-123456',
  studentName: 'Ahmed Mohamed',
  // ... other receipt data
};

// Download receipt as PDF
const result = await downloadReceiptAsPDF(receiptData);
if (result.success) {
  console.log('PDF saved to:', result.filePath);
} else {
  console.error('Error:', result.error);
}
```

### Example: Printing a Student Report

```typescript
import { 
  printStudentReport, 
  StudentReportData 
} from '../services/pdf';

// Prepare student report data
const reportData: StudentReportData = {
  studentName: 'Fatima Ali',
  studentId: 'ST-789012',
  // ... other student report data
};

// Print student report
const result = await printStudentReport(reportData);
if (!result.success) {
  console.error('Error printing report:', result.error);
}
```

## Styling

All reports include:

- Professional styling with blue gradient headers and footers
- Print-optimized CSS with proper color adjustments
- Responsive design for different screen sizes
- Support for Arabic (RTL) text
- Optional watermarks, stamps, and signatures 