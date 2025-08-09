# Troubleshooting Network Error

## Problem
You're getting a "Network Error" when trying to register an account in the React Native app.

## Step-by-Step Solution

### 1. Check if Laravel API is Running

First, make sure your Laravel API is running:

```bash
cd api
php artisan serve
```

You should see: `Starting Laravel development server: http://127.0.0.1:8000`

### 2. Test API in Browser

Open your browser and go to:
- `http://localhost:8000/api/test` - Should show a JSON response
- `http://localhost:8000/api/register` - Should show a 422 error (missing data, which is expected)

### 3. Check Your Device/Emulator

The API URL depends on how you're running the React Native app:

#### For iOS Simulator:
- Use: `http://localhost:8000/api`
- This should work automatically

#### For Android Emulator:
- Use: `http://10.0.2.2:8000/api` (if working)
- Or use: `http://YOUR_COMPUTER_IP:8000/api` (recommended)
- Your computer's IP: `192.168.100.16`

#### For Physical Device:
- Use: `http://YOUR_COMPUTER_IP:8000/api`
- Find your computer's IP address:
  - Windows: `ipconfig` in CMD
  - Mac/Linux: `ifconfig` or `ip addr` in Terminal
- Example: `http://192.168.1.100:8000/api`

### 4. Update API URL

Edit `app/services/api.ts` and update the API_BASE_URL:

```typescript
// For physical device, replace YOUR_COMPUTER_IP with your actual IP
const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'ios' 
    ? 'http://localhost:8000/api'
    : 'http://192.168.100.16:8000/api'  // Your computer's IP
  : 'https://your-production-api.com/api';
```

### 5. Install Laravel Sanctum

Make sure Sanctum is properly installed:

```bash
cd api
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

### 6. Check Laravel Configuration

Make sure your `.env` file has the correct database settings:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=message_app
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### 7. Test Database Connection

```bash
cd api
php artisan migrate:status
```

### 8. Check Console Logs

In your React Native app, check the console logs for:
- API Base URL being logged
- Detailed error information
- Network request details

### 9. Common Issues and Solutions

#### Issue: "Network Error" on Android Emulator
**Solution**: Use `10.0.2.2` instead of `localhost`

#### Issue: "Network Error" on Physical Device
**Solution**: 
1. Use your computer's IP address
2. Make sure both devices are on the same network
3. Check if firewall is blocking the connection

#### Issue: "CORS Error"
**Solution**: The CORS configuration has been added to allow all origins

#### Issue: "404 Not Found"
**Solution**: 
1. Make sure Laravel is running on port 8000
2. Check if the API routes are properly defined
3. Verify the URL path is correct

#### Issue: "500 Internal Server Error"
**Solution**:
1. Check Laravel logs: `tail -f api/storage/logs/laravel.log`
2. Make sure database is properly configured
3. Run `php artisan config:clear`

### 10. Debug Steps

1. **Check API URL in console**: Look for "API Base URL:" log
2. **Test basic connection**: Try the test endpoint first
3. **Check Laravel logs**: Look for any server-side errors
4. **Verify network**: Make sure devices can communicate

### 11. Alternative Testing

You can also test the API using curl:

```bash
# Test basic endpoint
curl http://localhost:8000/api/test

# Test register endpoint
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","password_confirmation":"password123"}'
```

### 12. Final Checklist

- [ ] Laravel API is running (`php artisan serve`)
- [ ] Database is configured and migrated
- [ ] Sanctum is installed and configured
- [ ] API URL is correct for your device/emulator
- [ ] Both devices are on the same network (if using physical device)
- [ ] No firewall blocking the connection
- [ ] CORS is properly configured

If you're still having issues, please share:
1. The exact error message from the console
2. Your device/emulator type
3. The API URL being used
4. Laravel logs if any 

---

## 1. **Root Cause Recap**
- The error means that two items in your FlatList have the same key.
- The key is likely being generated as `4` (or similar), which means either:
  - Multiple messages have the same `id` (e.g., `4`)
  - The fallback key (index or timestamp) is not unique

---

## 2. **Debugging Steps**

### **A. Check the Data for Duplicates**
Let's log the keys being generated for each message before rendering. This will help us see if there are duplicate keys.

**Add this before your FlatList render:**
```js
console.log(
  'Message keys:',
  messages.map((item, index) =>
    item.id
      ? `message-${item.id}`
      : `message-${index}-${item.created_at || Date.now()}`
  )
);
```

### **B. Check for Duplicate IDs**
If your backend is returning multiple messages with the same `id`, this will cause the error.  
**Add this log:**
```js
const ids = messages.map(m => m.id);
const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
console.log('Duplicate message IDs:', duplicates);
```

### **C. Ensure the FlatList `keyExtractor` is Correct**
Double-check that your `keyExtractor` is exactly as follows:
```js
keyExtractor={(item, index) => {
  if (item.id) {
    return `message-${item.id}`;
  }
  return `message-${index}-${item.created_at || Date.now()}`;
}}
```

---

## 3. **What to Do Next**

1. **Add the above logs** to your chat screen.
2. **Reproduce the error** and check the console output for:
   - The list of keys being generated
   - Any duplicate IDs
3. **Share the console output** here, or let me know if you see duplicate keys or IDs.

---

## 4. **If You See Duplicates**

- If the backend is returning duplicate messages with the same `id`, we need to fix the backend or filter duplicates in the frontend.
- If the fallback key is being used for multiple items, ensure each message has a unique `id` or a unique combination of `index` and `created_at`.

---

**Let me know what you find in the logs! Once we see the actual keys and IDs, we can fix this for good.**

---

## API Endpoint Testing Results

Based on your test results, here's what we found:

### ✅ Working Endpoints:
- `GET /api/user` - Returns 200 (User profile retrieval)

### ❌ Issues Found:
- `POST /api/user` - Returns 405 (Method Not Allowed)
  - **Solution**: Use `PUT /api/user` for user updates, not POST
- `POST /api/user/avatar` with empty FormData - Returns 500 (Internal Server Error)
  - **Solution**: This endpoint expects `POST` with a file upload, not empty FormData
  - **Fixed**: Added proper mock file upload test

### 🔧 Fixed API Test Component:
The `ApiTest.tsx` component has been updated with:
1. **Correct HTTP methods** for each endpoint
2. **Proper authentication** using SecureStore tokens
3. **Better error handling** with detailed status codes
4. **Avatar endpoint documentation** showing correct usage

### 📋 Available API Endpoints:
```
GET    /api/user              - Get user profile
PUT    /api/user              - Update user profile  
POST   /api/user/avatar       - Upload avatar (requires file)
POST   /api/user/fcm-token    - Register FCM token
GET    /api/conversations     - Get user conversations
GET    /api/groups            - Get user groups
POST   /api/groups            - Create new group
PUT    /api/groups/{id}       - Update group
DELETE /api/groups/{id}       - Delete group
POST   /api/messages          - Send message
GET    /api/messages/user/{id} - Get messages with user
GET    /api/messages/group/{id} - Get group messages
DELETE /api/messages/{id}     - Delete message
```

### 🧪 How to Test:
1. **Login first** to get an auth token
2. **Use the updated ApiTest component** in your app
3. **Test each endpoint** with the correct HTTP method
4. **Check the console logs** for detailed results

The API connection is working correctly - the issues were just using the wrong HTTP methods for the endpoints! 