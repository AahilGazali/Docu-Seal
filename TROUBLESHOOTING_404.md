# Troubleshooting 404 Error for /api/auth/profile

## The Problem
You're getting a 404 error when trying to save settings. This means the backend route isn't being found.

## Quick Fixes

### 1. Check if Backend Server is Running
```bash
cd Backend
npm start
# or
npm run dev
```

You should see: `Server running on port 5000` (or whatever port you configured)

### 2. Check API URL Configuration

Create a `.env` file in the `Frontend` folder:
```
VITE_API_URL=http://localhost:5000
```

**Important:** After creating/updating `.env`, restart your frontend dev server!

### 3. Verify the Route Exists

The route is defined in:
- `Backend/src/routes/auth.routes.js` - Line 11: `router.put('/profile', authMiddleware, authController.updateProfile);`
- `Backend/src/app.js` - Line 17: `app.use('/api/auth', authRoutes);`

So the full path should be: `PUT /api/auth/profile`

### 4. Test the Backend Directly

Open your browser and go to:
```
http://localhost:5000/health
```

You should see: `{"status":"ok","message":"Backend server is running"}`

### 5. Check Browser Console

Open browser DevTools (F12) and check:
1. **Console tab** - Look for error messages
2. **Network tab** - Check the actual request URL being sent
   - Look for the PUT request to `/api/auth/profile`
   - Check if it's going to the right URL
   - Check the response status code

### 6. Common Issues

**Issue:** `VITE_API_URL` not set
- **Solution:** Create `.env` file in Frontend folder with `VITE_API_URL=http://localhost:5000`

**Issue:** Backend server not running
- **Solution:** Start the backend server with `npm start` in the Backend folder

**Issue:** Port mismatch
- **Solution:** Make sure the port in `VITE_API_URL` matches the port your backend is running on (default: 5000)

**Issue:** CORS errors
- **Solution:** Backend already has CORS configured, but make sure both servers are running

## Debug Steps

1. Check backend console for request logs - you should see `[Request] PUT /api/auth/profile`
2. Check frontend console for the API base URL log
3. Check Network tab in browser DevTools to see the actual request URL
4. Verify the backend is accessible by visiting `http://localhost:5000/health`

## Still Not Working?

Check the browser Network tab:
- What URL is the request going to?
- What's the response status?
- What's the response body?

Share these details for further debugging.
