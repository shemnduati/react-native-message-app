<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\DB;

class Conversation extends Model
{
     use HasFactory;

    protected $fillable = [
        'user_id1',
        'user_id2',
        'last_message_id'
    ];

    public function lastMessage()
    {
        return $this->belongsTo(Message::class, 'last_message_id');
    }

    public function user1()
    {
        return $this->belongsTo(User::class, 'user_id1');
    }

    public function user2()
    {
        return $this->belongsTo(User::class, 'user_id2');
    }

    public static function getConversationsForSidebar(User $user)
    {
        // Get users who have conversations (messages) with the current user
        $usersWithConversations = User::where('id', '!=', $user->id)
            ->where(function($query) use ($user) {
                $query->whereExists(function($subQuery) use ($user) {
                    $subQuery->select(DB::raw(1))
                        ->from('messages')
                        ->where(function($q) use ($user) {
                            $q->where('sender_id', DB::raw('users.id'))
                              ->where('receiver_id', $user->id);
                        })->orWhere(function($q) use ($user) {
                            $q->where('sender_id', $user->id)
                              ->where('receiver_id', DB::raw('users.id'));
                        });
                });
            })
            ->get();
        
        $groups = Group::getGroupsForUser($user);
        return $usersWithConversations->map(function (User $otherUser) use ($user) {
            return $otherUser->toConversationArray($user);
        })->concat($groups->map(function (Group $group) {
            return $group->toConversationArray();
        }));
    }
 
    public static function updateConversationWithMessage($userId1, $userId2, $message)
    {
        $conversation = Conversation::where(function ($query) use ($userId1, $userId2){
            $query->where('user_id1', $userId1)
                ->where('user_id2',$userId2);
        })->orWhere(function ($query) use ($userId1, $userId2){
            $query->where('user_id1', $userId2)
                ->where('user_id2', $userId1);
        })->first();

        if($conversation) {
            $conversation->update([
                'last_message_id' => $message->id
            ]);
        }else{
            Conversation::create([
                'user_id1' => $userId1,
                'user_id2' => $userId2,
                'last_message_id' => $message->id,
            ]);
        }
    }
}
