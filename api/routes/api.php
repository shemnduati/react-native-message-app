<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfileController;

// Test route to check if API is working
Route::get('/test', function () {
    return response()->json(['message' => 'API is working!', 'timestamp' => now()]);
});

// Test route for multipart requests
Route::post('/test-multipart', function (Request $request) {
    return response()->json([
        'message' => 'Multipart request received!',
        'has_file' => $request->hasFile('file'),
        'headers' => $request->headers->all(),
        'timestamp' => now()
    ]);
});

// Test route for avatar endpoint (public, no auth)
Route::post('/test-avatar', function (Request $request) {
    return response()->json([
        'message' => 'Avatar test endpoint reached!',
        'has_file' => $request->hasFile('avatar'),
        'all_files' => array_keys($request->allFiles()),
        'content_type' => $request->header('Content-Type'),
        'method' => $request->method(),
        'url' => $request->url(),
        'timestamp' => now()
    ]);
});

// Debug route to check authenticated user
Route::get('/debug-user', function (Request $request) {
    $user = auth()->user();
    if (!$user) {
        return response()->json(['error' => 'Not authenticated'], 401);
    }
    
    return response()->json([
        'user_id' => $user->id,
        'user_name' => $user->name,
        'user_email' => $user->email,
        'user_avatar' => $user->avatar,
        'has_avatar' => !is_null($user->avatar),
        'all_users_with_avatars' => \App\Models\User::whereNotNull('avatar')->get(['id', 'name', 'email', 'avatar'])
    ]);
})->middleware('auth:sanctum');

// Authentication routes (you'll need to implement these)
Route::post('/login', [ProfileController::class, 'login']);
Route::post('/register', [ProfileController::class, 'register']);
Route::post('/logout', [ProfileController::class, 'logout'])->middleware('auth:sanctum');

// Public test route for push notifications
Route::post('/test-push', [ProfileController::class, 'testPushNotification']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // User profile
    Route::get('/user', [ProfileController::class, 'show']);
    Route::put('/user', [ProfileController::class, 'update']);
    Route::post('/user/fcm-token', [ProfileController::class, 'registerFcmToken']);
    Route::post('/user/avatar', [ProfileController::class, 'uploadAvatar']);
    
    // Conversations
    Route::get('/conversations', [ProfileController::class, 'conversations']);
    
    // Users (for starting new conversations)
    Route::get('/users', [ProfileController::class, 'users']);
    
    // Messages
    Route::get('/messages/user/{user}', [MessageController::class, 'byUser']);
    Route::get('/messages/group/{group}', [MessageController::class, 'byGroup']);
    Route::get('/messages/{message}/older', [MessageController::class, 'loadOlder']);
    Route::post('/messages', [MessageController::class, 'store']);
    Route::delete('/messages/{message}', [MessageController::class, 'destroy']);
    
    // Groups
    Route::get('/groups', [ProfileController::class, 'groups']);
    Route::post('/groups', [ProfileController::class, 'createGroup']);
    Route::put('/groups/{group}', [ProfileController::class, 'updateGroup']);
    Route::delete('/groups/{group}', [ProfileController::class, 'deleteGroup']);
}); 