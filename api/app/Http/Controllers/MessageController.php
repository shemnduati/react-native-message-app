<?php

namespace App\Http\Controllers;

use App\Events\SocketMessage;
use App\Http\Requests\StoreMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Group;
use App\Models\Message;
use App\Models\MessageAttachment;
use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class MessageController extends Controller
{
    public function byUser(User $user)
    {
        $messages = Message::where(function ($query) use ($user) {
            $query->where('sender_id', auth()->id())
                  ->where('receiver_id', $user->id);
        })->orWhere(function ($query) use ($user) {
            $query->where('sender_id', $user->id)
                  ->where('receiver_id', auth()->id());
        })
        ->latest()
        ->paginate(10);

        return response()->json([
            'selectedConversation' => $user->toConversationArray(), 
            'messages' => MessageResource::collection($messages)
        ]);
    }

     public function byGroup(Group $group)
     {
        $messages = Message::where('group_id', $group->id)
            ->latest()
            ->paginate(10);


        return response([
            'selectedConversation' => $group->toConversationArray(), 
            'messages' => MessageResource::collection($messages),
        ]);
     }


     public function loadOlder(Message $message)
     {
        if($message->group_id){
            $messages = Message::where('created_at', '<', $message->created_at)
                ->where('group_id', $message->group_id)
                ->latest()
                ->paginate(10);
        }else{
            $messages = Message::where('created_at', '<', $message->created_at)
                ->where(function ($query) use ($message) {
                    $query->where('sender_id', $message->sender_id)
                        ->where('receiver_id', $message->receiver_id)
                        ->orWhere('sender_id', $message->receiver_id)
                        ->where('receiver_id', $message->sender_id);
                })
                ->latest()
                ->paginate(10);
        
        }

        return MessageResource::collection($messages);
     }

     public function store(StoreMessageRequest $request)
     {
       
        // Log the raw request data for debugging
        Log::info('Raw request data:', [
            'all' => $request->all(),
            'files' => $request->allFiles(),
            'has_attachments' => $request->hasFile('attachments'),
            'message' => $request->input('message'),
            'receiver_id' => $request->input('receiver_id'),
            'group_id' => $request->input('group_id'),
            'reply_to_id' => $request->input('reply_to_id'),
        ]);
       
        $data = $request->validated();
        $data['sender_id'] = auth()->id();
        $receiverId = $data['receiver_id'] ?? null;
        $groupId = $data['group_id'] ?? null;
        $replyToId = $data['reply_to_id'] ?? null;
        $files = $data['attachments'] ?? [];
        
        // Log the incoming data for debugging
        Log::info('Message store request data:', [
            'data' => $data,
            'files_count' => count($files),
            'has_message' => isset($data['message']),
            'message_length' => isset($data['message']) ? strlen($data['message']) : 0,
            'reply_to_id' => $replyToId
        ]);
        
        try {
            $message = Message::create($data);
        } catch (\Exception $e) {
            Log::error('Failed to create message:', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw $e;
        }

        $attachments = [];

        if($files){
            foreach ($files as $file) {
                $directory = 'attachments/' . Str::random(32);
                Storage::makeDirectory($directory);

                // Log file details for debugging
                Log::info('Processing file:', [
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                    'extension' => $file->getClientOriginalExtension(),
                ]);

                // Ensure voice files have correct extension
                $fileName = $file->getClientOriginalName();
                if ($file->getClientMimeType() === 'audio/m4a' && !str_ends_with($fileName, '.m4a')) {
                    $fileName = pathinfo($fileName, PATHINFO_FILENAME) . '.m4a';
                }

                $model = [
                    'message_id' => $message->id,
                    'name' => $fileName,
                    'mime' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                    'path' => $file->storeAs($directory, $fileName, 'public'),
                ];
                
                Log::info('Created attachment:', $model);
                
                $attachment = MessageAttachment::create($model);
                $attachments[] =$attachment;
            }
            $message->attachments =$attachments;
        }

        if($receiverId){
            Conversation::updateConversationWithMessage($receiverId, auth()->id(), $message);
        }

        if($groupId){
            Group::updateGroupWithMessage($groupId, $message);
        }

        SocketMessage::dispatch($message);

        // Send push notification
        try {
            $pushService = new PushNotificationService();
            
            if ($receiverId) {
                $conversation = User::find($receiverId)->toConversationArray(auth()->user());
                $pushService->sendNewMessageNotification($message, $conversation);
            } elseif ($groupId) {
                $conversation = Group::find($groupId)->toConversationArray();
                $pushService->sendNewMessageNotification($message, $conversation);
            }
        } catch (\Exception $e) {
            \Log::error('Failed to send push notification: ' . $e->getMessage());
        }

        return new MessageResource($message);

     }

     public function destroy(Message $message)
     {
        if ($message->sender_id != auth()->id()){
            return response()->json(['message' => 'Forbidden'],403);
        }

        $lastMessage = null;

        // Handle foreign key constraints by updating references before deletion
        if ($message->group_id){
            // Check if this message is the last message in the group
            $group = Group::where('last_message_id', $message->id)->first();
            if ($group) {
                // Find the previous message in the group
                $previousMessage = Message::where('group_id', $message->group_id)
                    ->where('id', '!=', $message->id)
                    ->latest()
                    ->first();
                
                // Update the group's last_message_id
                $group->update(['last_message_id' => $previousMessage ? $previousMessage->id : null]);
                $lastMessage = $previousMessage;
            }
        } else {
            // Check if this message is the last message in the conversation
            $conversation = Conversation::where('last_message_id', $message->id)->first();
            if ($conversation) {
                // Find the previous message in the conversation
                $previousMessage = Message::where(function ($query) use ($message) {
                    $query->where('sender_id', $message->sender_id)
                        ->where('receiver_id', $message->receiver_id)
                        ->orWhere('sender_id', $message->receiver_id)
                        ->where('receiver_id', $message->sender_id);
                })
                ->where('id', '!=', $message->id)
                ->latest()
                ->first();
                
                // Update the conversation's last_message_id
                $conversation->update(['last_message_id' => $previousMessage ? $previousMessage->id : null]);
                $lastMessage = $previousMessage;
            }
        }

        // Now delete the message (this will cascade delete replies due to foreign key constraint)
        $message->delete();
        
        return response()->json(['message' => $lastMessage ? new MessageResource($lastMessage) : null]);
     }
}
