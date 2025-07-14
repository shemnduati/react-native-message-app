<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Http\Resources\UserResource;
use App\Models\Conversation;
use App\Models\Group;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::attempt($request->only('email', 'password'))) {
            $user = Auth::user();
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'user' => new UserResource($user),
                'token' => $token,
            ]);
        }

        throw ValidationException::withMessages([
            'email' => ['The provided credentials are incorrect.'],
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token,
        ], 201);
    }

    public function logout(Request $request)
    {
        try {
            // Check if user is authenticated
            if ($request->user()) {
                // Delete the current access token
                $request->user()->currentAccessToken()->delete();
            }
            
            return response()->json(['message' => 'Logged out successfully']);
        } catch (\Exception $e) {
            // If there's any error (token invalid, expired, etc.), just return success
            // This prevents 401 errors when the token is already invalid
            return response()->json(['message' => 'Logged out successfully']);
        }
    }

    public function show(Request $request)
    {
        return new UserResource($request->user());
    }

    public function update(ProfileUpdateRequest $request)
    {
        $user = $request->user();
        $user->update($request->validated());

        return new UserResource($user);
    }

    public function registerFcmToken(Request $request)
    {
        $request->validate([
            'fcm_token' => 'required|string',
        ]);

        $user = $request->user();
        $user->update(['fcm_token' => $request->fcm_token]);

        return response()->json(['message' => 'FCM token registered successfully']);
    }

    public function conversations(Request $request)
    {
        $user = $request->user();
        $conversations = Conversation::getConversationsForSidebar($user);
        
        // Limit the response to prevent truncation issues
        $limitedConversations = $conversations->take(50);
        
        return response()->json($limitedConversations);
    }

    public function groups(Request $request)
    {
        $user = $request->user();
        $groups = Group::getGroupsForUser($user);

        return response()->json($groups);
    }

    public function createGroup(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
        ]);

        $group = Group::create([
            'name' => $request->name,
            'description' => $request->description,
            'owner_id' => $request->user()->id,
        ]);

        $group->users()->attach($request->user_ids);
        $group->users()->attach($request->user()->id);

        return response()->json($group->load('users'), 201);
    }

    public function updateGroup(Request $request, Group $group)
    {
        if ($group->owner_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $group->update($request->only(['name', 'description']));

        return response()->json($group);
    }

    public function deleteGroup(Request $request, Group $group)
    {
        if ($group->owner_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            // Start a database transaction
            DB::beginTransaction();

            // Delete all messages in the group (this will trigger the MessageObserver)
            $group->messages()->delete();

            // Delete group-user relationships
            $group->users()->detach();

            // Delete the group itself
            $group->delete();

            // Commit the transaction
            DB::commit();

            return response()->json(['message' => 'Group deleted successfully']);
        } catch (\Exception $e) {
            // Rollback the transaction on error
            DB::rollBack();
            
            Log::error('Failed to delete group: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to delete group. Please try again.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $user = $request->user();
        $file = $request->file('avatar');
        $path = $file->store('avatars', 'public');
        $user->avatar = $path;
        $user->save();

        return response()->json([
            'avatar_url' => $user->avatar ? asset('storage/' . $user->avatar) : null,
            'message' => 'Avatar updated successfully',
        ]);
    }
}
