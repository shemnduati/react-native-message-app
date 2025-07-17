<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfileController;

// Test route to check if API is working
Route::get('/test', function () {
    return response()->json(['message' => 'API is working!', 'timestamp' => now()]);
});

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