<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Group extends Model
{
     use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'owner_id',
        'last_message_id'
    ];

    public function users()
    {
        return $this->belongsToMany(User::class, 'group_users');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class);
    }

    public function lastMessage() {
        return $this->belongsTo(Message::class, 'last_message_id');
    }

    /**
     * Format message for conversation preview
     */
    private static function formatMessagePreview($message, $attachments = null)
    {
        // Check if this is a voice message
        if ($message && preg_match('/^\[VOICE_MESSAGE:(\d+)\]$/', $message, $matches)) {
            $duration = (int)$matches[1];
            return "🎤 " . self::formatDuration($duration);
        }
        
        return $message;
    }

    /**
     * Format duration in seconds to readable format
     */
    private static function formatDuration($seconds)
    {
        if ($seconds < 60) {
            return $seconds . 's';
        }
        $minutes = floor($seconds / 60);
        $remainingSeconds = $seconds % 60;
        return $minutes . ':' . str_pad($remainingSeconds, 2, '0', STR_PAD_LEFT);
    }

    public static function getGroupsForUser(User $user)
    {
        $query  = self::select([
            'groups.id', 
            'groups.name', 
            'groups.description', 
            'groups.owner_id', 
            'groups.created_at', 
            'groups.updated_at',
            'messages.message as last_message', 
            'messages.created_at as last_message_date'
        ])
            ->join('group_users', 'group_users.group_id', '=', 'groups.id')
            ->leftJoin('messages', 'messages.id', '=', 'groups.last_message_id')
            ->where('group_users.user_id', $user->id)
            ->orderBy('messages.created_at', 'desc')
            ->orderBy('groups.name');

        $groups = $query->get();
        
        // Format the last_message for each group
        foreach ($groups as $group) {
            if ($group->last_message) {
                $group->last_message = self::formatMessagePreview($group->last_message);
            }
        }

        return $groups;
    } 


    public function toConversationArray()
    {
        return
        [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'is_group' => true,
            'is_user' => false,
            'owner_id' => $this->owner_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'last_message' => $this->last_message ? self::formatMessagePreview($this->last_message) : $this->last_message,
            'last_message_date' => $this->last_message_date,
            'users' => $this->users()->get()->map(function($user) {
                return method_exists($user, 'toConversationArray') ? $user->toConversationArray() : $user->toArray();
            }),
        ];
    }


    public static function updateGroupWithMessage($groupId, $message)
    {
        return self::updateOrCreate(
            ['id' => $groupId],
            ['last_message_id' => $message->id],
        );
    }
}
