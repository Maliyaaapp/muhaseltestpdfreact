# New Supabase Project Setup Guide

This guide will help you set up your new Supabase project for the Muhasel School Finance Management System.

## ✅ What's Already Done

1. **Environment Variables Updated**: 
   - Frontend `.env` file updated with new Supabase URL and anon key
   - Backend `server/.env` file updated with new Supabase URL
   - Placeholders added for service role keys

## 🔧 What You Need to Do

### Step 1: Get Your Service Role Key

1. Go to your new Supabase project dashboard: https://jirzcadqwiqpbddxasjd.supabase.co
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (NOT the anon key)
4. **⚠️ IMPORTANT**: This key has admin privileges - never expose it publicly!

### Step 2: Update Environment Files with Service Role Key

**Frontend `.env` file:**
```env
VITE_SUPABASE_URL=https://jirzcadqwiqpbddxasjd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppcnpjYWRxd2lxcGJkZHhhc2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyODg2NDQsImV4cCI6MjA3Njg2NDY0NH0.IuRLzAb9h2OuxJpIIlKWJr_hlN_Boh6jY5bWjkez60M
VITE_BACKEND_URL=http://localhost:3000
```

**⚠️ SECURITY NOTE**: The frontend should NEVER contain the service role key! Only the anon key is safe for client-side use.

**Backend `server/.env` file:**
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://jirzcadqwiqpbddxasjd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# API Key Configuration
API_KEY_PREFIX=muhasel_
API_KEY_LENGTH=32

# Logging Configuration
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_FILE_DIR=logs
LOG_MAX_SIZE=10m
LOG_MAX_FILES=7
```

### Step 3: Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `setup-new-supabase.sql` (created in your project root)
4. Paste it into the SQL Editor and click **Run**

This will create:
- All required tables (schools, accounts, students, fees, installments, messages, settings, templates, api_keys)
- Row Level Security (RLS) policies
- Database indexes for performance
- Triggers for automatic timestamp updates

### Step 4: Enable Authentication (Optional but Recommended)

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure your authentication providers as needed
3. Set up email templates if you plan to use email authentication

### Step 5: Test the Setup

1. Start your backend server:
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. Start your frontend:
   ```bash
   npm install
   npm run dev
   ```

3. Try creating a test school or account to verify everything works

## 📋 Database Schema Overview

Your new database will include these tables:

### Core Tables
- **schools**: School information and settings
- **accounts**: User accounts with role-based access
- **students**: Student records linked to schools
- **fees**: Fee records for students
- **installments**: Payment installments for fees
- **messages**: WhatsApp/SMS message history
- **settings**: School-specific configuration
- **templates**: Message templates
- **api_keys**: API keys for backend authentication

### Security Features
- **Row Level Security (RLS)**: Ensures users can only access their school's data
- **Role-based Access**: Admin, school admin, and grade manager roles
- **Service Role Access**: Backend can perform admin operations securely

## 🔒 Security Notes

1. **Service Role Key**: 
   - ⚠️ **CRITICAL**: NEVER put the service role key in frontend code or environment variables
   - Only store it in the backend `server/.env` file
   - Never commit it to version control or expose it client-side
   - Has admin privileges and can bypass all security policies

2. **Frontend Security**:
   - Only use the anon key (public key) in frontend
   - All admin operations must go through the backend API
   - Never expose sensitive keys in client-side code

3. **RLS Policies**: Automatically restrict data access based on user roles
4. **API Keys**: Use the backend API for secure operations instead of direct Supabase calls

## 🚨 Troubleshooting

### Common Issues:

1. **"Could not find column" errors**: Make sure you ran the complete schema setup
2. **Authentication errors**: Verify your service role key is correct
3. **Permission denied**: Check that RLS policies are properly configured
4. **Connection issues**: Verify your Supabase URL and keys are correct

### Getting Help:

- Check the browser console for detailed error messages
- Review the backend logs in the `server/logs` directory
- Verify all environment variables are set correctly

## 📁 Files Modified/Created

- ✅ `.env` - Updated with new Supabase URL and anon key
- ✅ `server/.env` - Updated with new Supabase URL
- ✅ `setup-new-supabase.sql` - Complete database schema setup script
- ✅ `NEW_SUPABASE_SETUP_GUIDE.md` - This setup guide

## 🎉 Next Steps

Once everything is set up:

1. **Data Migration**: If you have existing data, use the migration tools in the app
2. **User Creation**: Create admin accounts through the admin portal
3. **School Setup**: Add your schools and configure settings
4. **Testing**: Thoroughly test all features with your new setup

Your new Supabase project is now ready to use! 🚀