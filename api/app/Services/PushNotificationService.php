<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    private $fcmUrl = 'https://fcm.googleapis.com/fcm/send';
    private $serverKey;

    public function __construct()
    {
        $this->serverKey = config('services.fcm.server_key');
    }

    /**
     * Send push notification to a specific user
     */
    public function sendToUser($userId, $title, $body, $data = [])
    {
        // Get user's FCM token from database
        $user = \App\Models\User::find($userId);
        if (!$user || !$user->fcm_token) {
            Log::warning("No FCM token found for user: {$userId}");
            return false;
        }

        return $this->sendToToken($user->fcm_token, $title, $body, $data);
    }

    /**
     * Send push notification to multiple users
     */
    public function sendToUsers($userIds, $title, $body, $data = [])
    {
        $tokens = \App\Models\User::whereIn('id', $userIds)
            ->whereNotNull('fcm_token')
            ->pluck('fcm_token')
            ->toArray();

        if (empty($tokens)) {
            Log::warning("No FCM tokens found for users: " . implode(', ', $userIds));
            return false;
        }

        return $this->sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * Send push notification to a specific FCM token
     */
    public function sendToToken($token, $title, $body, $data = [])
    {
        $payload = [
            'to' => $token,
            'notification' => [
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'badge' => 1,
            ],
            'data' => $data,
            'priority' => 'high',
        ];

        return $this->sendRequest($payload);
    }

    /**
     * Send push notification to multiple FCM tokens
     */
    public function sendToTokens($tokens, $title, $body, $data = [])
    {
        $payload = [
            'registration_ids' => $tokens,
            'notification' => [
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'badge' => 1,
            ],
            'data' => $data,
            'priority' => 'high',
        ];

        return $this->sendRequest($payload);
    }

    /**
     * Send HTTP request to FCM
     */
    private function sendRequest($payload)
    {
        if (!$this->serverKey) {
            Log::error('FCM server key not configured');
            return false;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'key=' . $this->serverKey,
                'Content-Type' => 'application/json',
            ])->post($this->fcmUrl, $payload);

            if ($response->successful()) {
                Log::info('Push notification sent successfully', [
                    'payload' => $payload,
                    'response' => $response->json()
                ]);
                return true;
            } else {
                Log::error('Failed to send push notification', [
                    'payload' => $payload,
                    'response' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception sending push notification: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Send new message notification
     */
    public function sendNewMessageNotification($message, $conversation)
    {
        $title = $conversation['is_group'] ? $conversation['name'] : $conversation['name'];
        $body = $message->message ?: 'New message';
        
        $data = [
            'type' => 'new_message',
            'conversation_id' => $conversation['id'],
            'message_id' => $message->id,
            'is_group' => $conversation['is_group'] ? '1' : '0',
            'sender_name' => $message->sender->name,
        ];

        if ($conversation['is_group']) {
            // Send to all group members except sender
            $group = \App\Models\Group::find($conversation['id']);
            $userIds = $group->users->where('id', '!=', $message->sender_id)->pluck('id')->toArray();
            return $this->sendToUsersWithBadge($userIds, $title, $body, $data);
        } else {
            // Send to the receiver
            $receiverId = $message->sender_id == $conversation['id'] ? $message->receiver_id : $message->sender_id;
            return $this->sendToUserWithBadge($receiverId, $title, $body, $data);
        }
    }

    /**
     * Send push notification to user with badge count
     */
    public function sendToUserWithBadge($userId, $title, $body, $data = [])
    {
        $user = \App\Models\User::find($userId);
        if (!$user || !$user->fcm_token) {
            \Log::warning("No FCM token found for user: {$userId}");
            return false;
        }

        // Get current unread count for this user
        $unreadCount = $this->getUserUnreadCount($userId);

        return $this->sendToTokenWithBadge($user->fcm_token, $title, $body, $data, $unreadCount + 1);
    }

    /**
     * Send push notification to multiple users with badge count
     */
    public function sendToUsersWithBadge($userIds, $title, $body, $data = [])
    {
        $tokens = \App\Models\User::whereIn('id', $userIds)
            ->whereNotNull('fcm_token')
            ->get(['id', 'fcm_token']);

        if ($tokens->isEmpty()) {
            \Log::warning("No FCM tokens found for users: " . implode(', ', $userIds));
            return false;
        }

        // Send individual notifications with proper badge counts
        foreach ($tokens as $user) {
            $unreadCount = $this->getUserUnreadCount($user->id);
            $this->sendToTokenWithBadge($user->fcm_token, $title, $body, $data, $unreadCount + 1);
        }

        return true;
    }

    /**
     * Send push notification to token with badge count
     */
    public function sendToTokenWithBadge($token, $title, $body, $data = [], $badgeCount = 1)
    {
        $payload = [
            'to' => $token,
            'notification' => [
                'title' => $title,
                'body' => $body,
                'sound' => 'default',
                'badge' => $badgeCount,
            ],
            'data' => array_merge($data, [
                'badge' => (string)$badgeCount,
            ]),
            'priority' => 'high',
        ];

        return $this->sendRequest($payload);
    }

    /**
     * Get user's unread message count
     */
    private function getUserUnreadCount($userId)
    {
        // This is a simplified version - you might want to implement a more sophisticated counting system
        $count = \App\Models\Message::where(function($query) use ($userId) {
            $query->where('receiver_id', $userId)
                  ->where('read_at', null);
        })->count();

        return $count;
    }
} 