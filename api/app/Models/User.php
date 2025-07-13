<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'fcm_token',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function toConversationArray($currentUser = null)
    {
        $lastMessage = null;
        $lastMessageDate = null;
        if ($currentUser) {
            $lastMsg = \App\Models\Message::where(function($q) use ($currentUser) {
                $q->where('sender_id', $this->id)
                  ->where('receiver_id', $currentUser->id);
            })->orWhere(function($q) use ($currentUser) {
                $q->where('sender_id', $currentUser->id)
                  ->where('receiver_id', $this->id);
            })->orderBy('created_at', 'desc')->first();
            if ($lastMsg) {
                $lastMessage = $lastMsg->message;
                $lastMessageDate = $lastMsg->created_at;
            }
        }
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'is_user' => true,
            'is_group' => false,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'last_message' => $lastMessage,
            'last_message_date' => $lastMessageDate,
        ];
    }

    public static function getUserExceptUser(User $user)
    {
        return self::where('id', '!=', $user->id)
                   ->select(['id', 'name', 'email', 'created_at', 'updated_at'])
                   ->get();
    }
}
