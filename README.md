# RouteOptima (Dispatch Bros) - Field Service Management System

A comprehensive backend API for managing field service operations, technician scheduling, and customer job assignments.

## 🚀 Features

### 🔐 Authentication & Authorization
- **JWT-based Authentication** with access and refresh tokens
- **Role-based Access Control** (Admin roles)
- **Secure Password Reset** with email verification
- **Session Management** with token blacklisting

### 👥 User Management
- **Admin Dashboard** with full system access
- **Technician Profiles** with working hours and availability
- **User Registration & Login** with validation
- **Photo Upload** support
- **Active/Inactive Status** management

### 📋 Job Management
- **Job Creation & Assignment** to technicians
- **Real-time Job Status** tracking (Assigned/Completed)
- **Auto-completion** of expired jobs
- **Advanced Job Filtering** by date, status, location, technician
- **Conflict Detection** for double-booking prevention
- **Geocoding Integration** for address validation

### ⏰ Time Slot Management
- **Flexible Time Slots** with custom labels
- **Working Hours Validation** against technician availability
- **Time Zone Handling** with UTC storage
- **Overlap Prevention** for scheduling conflicts
- **Dynamic Time Slot Creation** with auto-ordering

### 📍 Location Services
- **Address Parsing** with street, city, state extraction
- **Google Maps Integration** for geocoding
- **Latitude/Longitude Storage** for route optimization
- **Service Area Management** by zip code and state

### 📧 Notification System
- **Email Notifications** for job confirmations
- **SMS Notifications** via Twilio integration
- **Customizable Preferences** for notification types
- **Template-based Messaging** with job details
- **Multi-channel Communication** (Email + SMS)

### 📊 Analytics & Reporting
- **Job Statistics** with completion rates
- **Technician Performance** metrics
- **Weekly/Monthly Reports** with date filtering
- **Efficiency Tracking** and KPI monitoring
- **Real-time Dashboard** data

### 🔧 Technical Features
- **RESTful API** with comprehensive endpoints
- **Database Migrations** with Prisma ORM
- **Input Validation** with class-validator
- **Error Handling** with structured responses
- **Logging System** with Winston integration
- **CORS Configuration** for frontend integration

## 🛠 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt
- **Email**: Nodemailer with Gmail SMTP
- **SMS**: Twilio API
- **Maps**: Google Geocoding API
- **Validation**: class-validator & class-transformer


## 🔒 Security Features

- **Password Hashing** with bcrypt
- **JWT Token Validation** on protected routes
- **Role-based Authorization** for admin functions
- **Input Sanitization** and validation
- **CORS Protection** with whitelist
- **Rate Limiting** on authentication endpoints
- **Secure Cookie Settings** with httpOnly flags

## 📱 Notification System

### Email Notifications
- Job confirmation emails to customers
- Professional HTML templates
- Automatic sending based on preferences
- Error handling and retry logic

### SMS Notifications
- Real-time job assignments to technicians
- Formatted messages with job details
- Twilio integration with delivery tracking
- Preference-based sending

## 🌍 Timezone Handling

- **UTC Storage** for all timestamps
- **Local Time Display** in notifications
- **Timezone-aware** scheduling logic
- **DST Compatibility** for US regions

## 📊 Database Schema

### Key Models
- **User**: Authentication and profile data
- **Technician**: Field worker profiles and schedules
- **Job**: Service appointments and assignments
- **DefaultTimeSlot**: Available scheduling windows
- **Session**: Token management and security
- **NotificationPreferences**: Communication settings

---


**Dispatch Bros** - Streamlining field service operations with modern technology.