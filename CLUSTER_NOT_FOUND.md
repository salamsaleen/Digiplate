# 🚨 CRITICAL: MongoDB Atlas Cluster Issue Detected

## Error Analysis

**Error Message:**
```
querySrv ENOTFOUND _mongodb._tcp.cluster0.2dj5wzx.mongodb.net
```

**What This Means:**
The DNS lookup for your MongoDB Atlas cluster failed with "Non-existent domain". This indicates that the cluster hostname `cluster0.2dj5wzx.mongodb.net` **does not exist** or **cannot be resolved**.

## Diagnostic Results

✅ **Internet Connection:** Working (tested with google.com)  
❌ **MongoDB Cluster DNS:** Failed (cluster0.2dj5wzx.mongodb.net not found)

## Possible Causes

### 1. **MongoDB Atlas Cluster is Paused or Deleted** (Most Likely)
MongoDB Atlas automatically pauses free-tier clusters after a period of inactivity, or the cluster may have been deleted.

**Solution:** Check your MongoDB Atlas dashboard:
- Go to: https://cloud.mongodb.com/
- Log in to your account
- Check if the cluster exists and is running
- If paused, click "Resume" to restart it
- If deleted, you'll need to create a new cluster

### 2. **Incorrect Cluster Hostname**
The hostname in your connection string might be wrong.

**Solution:** Get the correct connection string from MongoDB Atlas:
- Go to your cluster in MongoDB Atlas
- Click "Connect"
- Choose "Connect your application"
- Copy the connection string
- Update `.env.local` with the correct URI

### 3. **DNS Resolution Issues**
Your DNS server might be having issues resolving MongoDB Atlas domains.

**Solution:** Try using Google's DNS:
- Open Network Settings
- Change DNS to: 8.8.8.8 and 8.8.4.4
- Restart your network connection

## How to Fix

### Step 1: Check MongoDB Atlas Dashboard

1. Go to https://cloud.mongodb.com/
2. Log in with your credentials
3. Look for your cluster (cluster0)

**If you see the cluster:**
- Check its status (Running, Paused, or Terminated)
- If **Paused**: Click the "Resume" button
- If **Running**: Get a fresh connection string (see Step 2)

**If you DON'T see the cluster:**
- The cluster was deleted
- You need to create a new cluster (see Step 3)

### Step 2: Get Fresh Connection String (If Cluster Exists)

1. In MongoDB Atlas, click on your cluster
2. Click the **"Connect"** button
3. Choose **"Connect your application"**
4. Select **"Driver: Node.js"** and **"Version: 5.5 or later"**
5. Copy the connection string (it looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<database>
   ```
6. Replace `<username>`, `<password>`, and `<database>` with your actual values
7. **IMPORTANT:** URL-encode special characters in the password (# → %23)
8. Update `.env.local` with the new connection string

### Step 3: Create New Cluster (If Cluster Was Deleted)

1. In MongoDB Atlas, click **"Build a Database"** or **"Create"**
2. Choose **"M0 FREE"** tier
3. Select a cloud provider and region (choose one close to you)
4. Name your cluster (e.g., "cluster0")
5. Click **"Create Cluster"** (takes 3-5 minutes)
6. While waiting, create a database user:
   - Go to **"Database Access"** (left sidebar)
   - Click **"Add New Database User"**
   - Choose **"Password"** authentication
   - Username: `digiplatenmsm`
   - Password: `digiNmsm00##` (or create a new one)
   - Set privileges to **"Read and write to any database"**
   - Click **"Add User"**
7. Add your IP to Network Access:
   - Go to **"Network Access"** (left sidebar)
   - Click **"Add IP Address"**
   - Choose **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Click **"Confirm"**
8. Once cluster is ready, get the connection string (see Step 2)

### Step 4: Restore Your Data (If You Created New Cluster)

If you had to create a new cluster, you'll need to restore your users and data:

```bash
# This will seed the database with default users
node scripts/seed.js
```

Default users will be created with password: `admin123`, `canteen123`, `hod123`, `student123`

## Quick Test Commands

After fixing the cluster issue, test the connection:

```bash
# Test DNS resolution
nslookup cluster0.xxxxx.mongodb.net

# Test MongoDB connection
node test-atlas-connection.js
```

## Current Connection String

Your current `.env.local` has:
```
MONGODB_URI=mongodb+srv://digiplatenmsm:digiNmsm00%23%23@cluster0.2dj5wzx.mongodb.net/digiplate
```

**Action Required:**
1. Verify this cluster exists in MongoDB Atlas
2. If it doesn't exist, create a new one and update the connection string
3. Make sure to URL-encode special characters in the password

## Summary

🔴 **Problem:** MongoDB Atlas cluster hostname cannot be resolved  
🔍 **Most Likely Cause:** Cluster is paused, deleted, or doesn't exist  
✅ **Solution:** Check MongoDB Atlas dashboard and either resume, get fresh connection string, or create new cluster  

**Next Step:** Log in to https://cloud.mongodb.com/ and check your cluster status!
