<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SocketMessage implements ShouldBroadcast
{
   use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;
    public $groupId;
    public $receiverId;
    public $sender;
    public $attachments;

    /**
     * Create a new event instance.
     */
    public function __construct($message)
    {
        $this->message = $message;
        $this->groupId = $message->group_id;
        $this->receiverId = $message->receiver_id;
        $this->sender = $message->sender;
        $this->attachments = $message->attachments ?? [];
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        // Broadcast to private channel for user or group
        if ($this->groupId) {
            return [new PresenceChannel('group.'.$this->groupId)];
        }
        
        return [new PrivateChannel('user.'.$this->receiverId)];
    }
    
    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'socket.message';
    }
    
    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'message' => $this->message,
            'sender' => $this->sender,
            'attachments' => $this->attachments,
            'group_id' => $this->groupId,
            'receiver_id' => $this->receiverId,
            'timestamp' => now()->toDateTimeString(),
        ];
    }
}
