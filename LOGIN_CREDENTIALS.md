# DigiPlate Login Credentials

## 🎉 MongoDB Atlas Connection - WORKING!

Your DigiPlate application is now fully connected to MongoDB Atlas and ready to use.

## Test Accounts

All accounts use simple passwords for testing. You can log in with any of these:

### Super Admin
- **Email:** admin@digiplate.com
- **Password:** admin123
- **Access:** Full system administration

### Department Admin (CS)
- **Email:** cs_admin@digiplate.com
- **Password:** admin123
- **Access:** Computer Science department management

### Canteen Staff
- **Email:** canteen@digiplate.com
- **Password:** canteen123
- **Access:** Canteen operations and order management

### Students
- **Email:** student@digiplate.com
- **Password:** student123
- **Department:** B.Sc. Computer Science

**Additional Test Students:**
- student1@digiplate.com through student10@digiplate.com
- **Password:** student123 (same for all)
- **Department:** B.Sc. Computer Science

## Quick Start

1. Make sure your dev server is running:
   ```bash
   npm run dev
   ```

2. Open your browser to: http://localhost:3000

3. Log in with any of the credentials above

4. Start testing the application!

## What Was Fixed

✅ **MongoDB Connection String**
- Updated cluster hostname from `cluster0.2dj5wzx` to `cluster0.bup3rof`
- Updated password to match database user credentials
- Connection now working properly

✅ **Database Seeding**
- Created 14 test users with known passwords
- All roles represented (admin, dept_admin, canteen_staff, student)

✅ **Login Functionality**
- Authentication working
- Session management active
- Role-based access control enabled

## Connection Details

**Database:** digiplate  
**Cluster:** cluster0.bup3rof.mongodb.net  
**Total Users:** 14  
**Collections:** users, systemsettings, coupons

---

**Ready to use!** 🚀
