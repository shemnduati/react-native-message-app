<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
      public static $wrap = false;
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'message' => $this->message,
            'sender_id' => $this->sender_id,
            'receiver_id' => $this->receiver_id,
            'sender' => new UserResource($this->sender),
            'group_id' => $this->group_id,
            'attachments' => MessageAttachmentResource::collection($this->attachments),
            'reply_to_id' => $this->reply_to_id,
            'reply_to' => $this->when($this->replyTo, function () {
                return [
                    'id' => $this->replyTo->id,
                    'message' => $this->replyTo->message,
                    'sender' => new UserResource($this->replyTo->sender),
                    'attachments' => MessageAttachmentResource::collection($this->replyTo->attachments),
                ];
            }),
            'created_at' =>$this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
