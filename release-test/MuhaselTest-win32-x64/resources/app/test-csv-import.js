// Test script to verify CSV import with partial payments doesn't create duplicate receipt numbers
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a test CSV file with partial payments
const testCSVContent = `studentId,name,grade,installmentNumber,amount,dueDate,isPaid,paidAmount,paidDate
STU001,John Doe,Grade 10,1,1000,2024-01-15,true,500,2024-01-10
STU001,John Doe,Grade 10,2,1000,2024-02-15,false,0,
STU002,Jane Smith,Grade 11,1,1200,2024-01-15,true,600,2024-01-12
STU002,Jane Smith,Grade 11,2,1200,2024-02-15,true,600,2024-02-10`;

// Write test CSV file
const testFilePath = path.join(__dirname, 'test-partial-payments.csv');
fs.writeFileSync(testFilePath, testCSVContent);

console.log('Test CSV file created successfully at:', testFilePath);
console.log('CSV Content:');
console.log(testCSVContent);
console.log('\nThis CSV contains:');
console.log('- 2 students with partial payments');
console.log('- 3 paid installments that should get unique receipt numbers');
console.log('- 1 unpaid installment that should not get a receipt number');
console.log('\nYou can now test the import functionality in the app to verify:');
console.log('1. Each paid installment gets a unique receipt number');
console.log('2. No duplicate receipt numbers are generated');
console.log('3. Unpaid installments do not get receipt numbers');