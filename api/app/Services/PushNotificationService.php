<?php

namespace App\Services;

use App\Models\User;
use App\Models\Group;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    private $projectId;
    private $serviceAccountPath;

    public function __construct()
    {
        $this->projectId = env('FIREBASE_PROJECT_ID');
        $this->serviceAccountPath = base_path(env('FIREBASE_SERVICE_ACCOUNT_PATH', 'firebase-service-account.json'));
    }

    public function sendNotification($fcmToken, $title, $body, $data = [])
    {
        try {
            // Get access token
            $accessToken = $this->getAccessToken();

            $message = [
                'message' => [
                    'token' => $fcmToken,
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                    ],
                    'data' => $data,
                    'android' => [
                        'priority' => 'high',
                    ],
                    'apns' => [
                        'headers' => [
                            'apns-priority' => '10',
                        ],
                    ],
                ],
            ];

            $url = "https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send";

            $headers = [
                'Authorization: Bearer ' . $accessToken,
                'Content-Type: application/json',
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message));

            $result = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return [
                'success' => $httpCode === 200,
                'response' => $result,
                'http_code' => $httpCode,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    private function getAccessToken()
    {
        if (!file_exists($this->serviceAccountPath)) {
            throw new \Exception('Firebase service account file not found: ' . $this->serviceAccountPath);
        }

        $serviceAccount = json_decode(file_get_contents($this->serviceAccountPath), true);
        
        $credentials = [
            'type' => 'service_account',
            'project_id' => $serviceAccount['project_id'],
            'private_key_id' => $serviceAccount['private_key_id'],
            'private_key' => $serviceAccount['private_key'],
            'client_email' => $serviceAccount['client_email'],
            'client_id' => $serviceAccount['client_id'],
            'auth_uri' => 'https://accounts.google.com/o/oauth2/auth',
            'token_uri' => 'https://oauth2.googleapis.com/token',
            'auth_provider_x509_cert_url' => 'https://www.googleapis.com/oauth2/v1/certs',
            'client_x509_cert_url' => $serviceAccount['client_x509_cert_url'],
        ];

        $jwt = $this->createJWT($credentials);
        
        $tokenUrl = 'https://oauth2.googleapis.com/token';
        $postData = [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $tokenUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        curl_close($ch);

        $tokenData = json_decode($response, true);
        
        if (!isset($tokenData['access_token'])) {
            throw new \Exception('Failed to get access token: ' . $response);
        }
        
        return $tokenData['access_token'];
    }

    private function createJWT($credentials)
    {
        $header = [
            'alg' => 'RS256',
            'typ' => 'JWT',
        ];

        $now = time();
        $payload = [
            'iss' => $credentials['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => $credentials['token_uri'],
            'exp' => $now + 3600,
            'iat' => $now,
        ];

        $headerEncoded = $this->base64UrlEncode(json_encode($header));
        $payloadEncoded = $this->base64UrlEncode(json_encode($payload));

        $signature = '';
        openssl_sign(
            $headerEncoded . '.' . $payloadEncoded,
            $signature,
            $credentials['private_key'],
            OPENSSL_ALGO_SHA256
        );

        $signatureEncoded = $this->base64UrlEncode($signature);

        return $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
    }

    private function base64UrlEncode($data)
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    // Legacy method for backward compatibility (if you still have the old server key)
    public function sendNotificationLegacy($fcmToken, $title, $body, $data = [])
    {
        $serverKey = env('FCM_SERVER_KEY');
        
        if (!$serverKey) {
            return [
                'success' => false,
                'error' => 'FCM Server Key not configured,',
            ];
        }

        $fields = [
            'to' => $fcmToken,
            'notification' => [
                'title' => $title,
                'body' => $body,
            ],
            'data' => $data
        ];

        $headers = [
            'Authorization: key=' . $serverKey,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://fcm.googleapis.com/fcm/send');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($fields));
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return [
            'success' => $httpCode === 200,
            'response' => $result,
            'http_code' => $httpCode,
        ];
    }

    // Method for sending notifications to Expo push tokens
    public function sendExpoNotification($expoPushToken, $title, $body, $data = [])
    {
        try {
            $message = [
                'to' => $expoPushToken,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'sound' => 'default',
                'badge' => 1,
            ];

            $url = 'https://exp.host/--/api/v2/push/send';

            $headers = [
                'Content-Type: application/json',
                'Accept: application/json',
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message));

            $result = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return [
                'success' => $httpCode === 200,
                'response' => $result,
                'http_code' => $httpCode,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    // Method for sending new message notifications
    public function sendNewMessageNotification($message, $conversation)
    {
        try {
            $sender = $message->sender;
            $receiver = null;
            $group = null;

            // Determine the receiver and conversation type
            if ($message->receiver_id) {
                $receiver = User::find($message->receiver_id);
            } elseif ($message->group_id) {
                $group = Group::find($message->group_id);
            }

            // Prepare notification data
            $title = $sender->name;
            $body = $message->message ?: 'Sent an attachment';
            
            // Add message type indicator
            if ($message->attachments && count($message->attachments) > 0) {
                $attachmentTypes = collect($message->attachments)->pluck('mime')->unique();
                if ($attachmentTypes->contains('audio/m4a') || $attachmentTypes->contains('audio/mp3')) {
                    $body = 'Sent a voice message';
                } elseif ($attachmentTypes->contains('image/')) {
                    $body = 'Sent a photo';
                } else {
                    $body = 'Sent an attachment';
                }
            }

            $data = [
                'type' => 'new_message',
                'message_id' => $message->id,
                'sender_id' => $sender->id,
                'sender_name' => $sender->name,
                'conversation_id' => $conversation['id'] ?? null,
                'conversation_type' => $message->group_id ? 'group' : 'user',
                'group_id' => $message->group_id,
                'receiver_id' => $message->receiver_id,
            ];

            // Send notification to receiver (for direct messages)
            if ($receiver && $receiver->fcm_token && $receiver->id !== $sender->id) {
                Log::info('Sending notification to receiver', [
                    'receiver_id' => $receiver->id,
                    'receiver_name' => $receiver->name,
                    'token_type' => strpos($receiver->fcm_token, 'ExponentPushToken') === 0 ? 'expo' : 'fcm',
                    'token_preview' => substr($receiver->fcm_token, 0, 20) . '...',
                    'title' => $title,
                    'body' => $body
                ]);
                
                // Check if it's an Expo push token (starts with ExponentPushToken)
                if (strpos($receiver->fcm_token, 'ExponentPushToken') === 0) {
                    $result = $this->sendExpoNotification($receiver->fcm_token, $title, $body, $data);
                    Log::info('Expo notification result', $result);
                } else {
                    $result = $this->sendNotification($receiver->fcm_token, $title, $body, $data);
                    Log::info('FCM notification result', $result);
                }
            }

            // Send notification to group members (for group messages)
            if ($group) {
                $groupMembers = $group->members()->where('user_id', '!=', $sender->id)->get();
                Log::info('Sending group notifications', [
                    'group_id' => $group->id,
                    'group_name' => $group->name,
                    'members_count' => $groupMembers->count(),
                    'sender_id' => $sender->id
                ]);
                
                foreach ($groupMembers as $member) {
                    if ($member->user->fcm_token) {
                        Log::info('Sending notification to group member', [
                            'member_id' => $member->user->id,
                            'member_name' => $member->user->name,
                            'token_type' => strpos($member->user->fcm_token, 'ExponentPushToken') === 0 ? 'expo' : 'fcm',
                            'token_preview' => substr($member->user->fcm_token, 0, 20) . '...'
                        ]);
                        
                        // Check if it's an Expo push token (starts with ExponentPushToken)
                        if (strpos($member->user->fcm_token, 'ExponentPushToken') === 0) {
                            $result = $this->sendExpoNotification($member->user->fcm_token, $title, $body, $data);
                            Log::info('Expo group notification result', $result);
                        } else {
                            $result = $this->sendNotification($member->user->fcm_token, $title, $body, $data);
                            Log::info('FCM group notification result', $result);
                        }
                    } else {
                        Log::info('Group member has no FCM token', [
                            'member_id' => $member->user->id,
                            'member_name' => $member->user->name
                        ]);
                    }
                }
            }

            return [
                'success' => true,
                'message' => 'Notification sent successfully'
            ];

        } catch (\Exception $e) {
            Log::error('Failed to send new message notification: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
} 