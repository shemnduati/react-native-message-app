import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Modal,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Picker } from 'emoji-mart-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { messagesAPI } from '@/services/api';
import VoiceRecorder from '@/components/VoiceRecorder';
import VoicePlayer from '@/components/VoicePlayer';
import VoiceMessageBubble from '@/components/VoiceMessageBubble';
import VoiceMessagePreview from '@/components/VoiceMessagePreview';
import ReplyPreview from '@/components/ReplyPreview';
import ReplyBubble from '@/components/ReplyBubble';
import UserAvatar from '@/components/UserAvatar';

interface Message {
  id: number;
  message: string;
  sender_id: number;
  group_id: number;
  created_at: string;
  attachments?: Array<{
    id: number;
    name: string;
    mime: string;
    url: string;
  }>;
  voice_message?: {
    url: string;
    duration: number;
  };
  sender?: {
    id: number;
    name: string;
  };
  reply_to?: {
    id: number;
    message: string;
    sender: {
      id: number;
      name: string;
    };
  };
}

interface Attachment {
  uri: string;
  name: string;
  type: string;
  isImage?: boolean;
}

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams();
  const { currentTheme } = useTheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  // Remove the navigation effect - let the AppLayout handle authentication state changes
  const isDark = currentTheme === 'dark';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState<{ uri: string; duration: number } | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showMessageOptions, setShowMessageOptions] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await messagesAPI.getByGroup(Number(id));
      console.log('Group messages response:', response.data);
      let messagesData = [];
      if (response.data.messages && Array.isArray(response.data.messages.data)) {
        messagesData = response.data.messages.data;
      } else if (Array.isArray(response.data.messages)) {
        messagesData = response.data.messages;
      }
      // Sort messages by created_at in ascending order (oldest first)
      const sortedMessages = messagesData.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sortedMessages);
      setGroupInfo(response.data.selectedConversation);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom (newest messages) when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Reset keyboard height when component unmounts or when leaving screen
  useEffect(() => {
    return () => {
      setKeyboardHeight(0);
    };
  }, []);

  // Send message
  const handleSend = async () => {
    // Don't send if there's no content at all
    if (!input.trim() && !attachment && !voiceRecording) return;
    
    setSending(true);
    try {
      let formData = new FormData();
      
      // Add text message if present
      if (input.trim()) {
        formData.append('message', input.trim());
      }
      
      formData.append('group_id', id as string);
      
      // Add reply_to_id if replying to a message
      if (replyingTo) {
        formData.append('reply_to_id', replyingTo.id.toString());
      }
      
      // Handle file/image attachment
      if (attachment) {
        formData.append('attachments[]', {
          uri: attachment.uri,
          name: attachment.name,
          type: attachment.type,
        });
      }
      
      // Handle voice recording
      if (voiceRecording) {
        formData.append('attachments[]', {
          uri: voiceRecording.uri,
          name: 'voice_message.m4a',
          type: 'audio/m4a',
        });
        // Send duration as a simple text message with a special prefix
        const voiceMessage = `[VOICE_MESSAGE:${voiceRecording.duration}]`;
        formData.append('message', voiceMessage);
      }
      
      const res = await messagesAPI.sendMessage(formData);
      console.log('Sent message response:', res.data);
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(msg => msg.id === res.data.id);
        if (messageExists) {
          console.log('Message already exists, not adding duplicate');
          return prev;
        }
        return [...prev, res.data];
      });
      setInput('');
      setAttachment(null);
      setVoiceRecording(null);
      setReplyingTo(null); // Clear reply state
      setShowEmoji(false);
      // Scroll to bottom when new message is added
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    } catch (e) {
      console.error('Error sending message:', e);
      console.error('Error details:', {
        message: e.message,
        status: e.response?.status,
        statusText: e.response?.statusText,
        data: e.response?.data,
        requestData: {
          input: input,
          hasAttachment: !!attachment,
          hasVoiceRecording: !!voiceRecording,
          voiceDuration: voiceRecording?.duration,
          replyingTo: replyingTo?.id
        }
      });
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Pick image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setAttachment({
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.type || 'image/jpeg',
        isImage: true,
      });
    }
  };

  // Pick any file
  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: '*/*',
    });
    if (result.type === 'success') {
      setAttachment({
        uri: result.uri,
        name: result.name,
        type: result.mimeType || 'application/octet-stream',
        isImage: result.mimeType?.startsWith('image/'),
      });
    }
  };

  // Handle voice recording
  const handleVoiceRecording = () => {
    setShowVoiceRecorder(true);
  };

  // Handle voice recording completion
  const handleVoiceRecordingComplete = (uri: string, duration: number) => {
    setVoiceRecording({ uri, duration });
    setShowVoiceRecorder(false);
  };

  // Handle voice recording cancel
  const handleVoiceRecordingCancel = () => {
    setShowVoiceRecorder(false);
  };

  // Handle reply to message
  const handleReply = (message: any) => {
    setReplyingTo(message);
    setShowMessageOptions(null);
  };

  // Handle cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId: number) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await messagesAPI.deleteMessage(messageId);
              setMessages(prev => prev.filter(msg => msg.id !== messageId));
              setShowMessageOptions(null);
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          }
        }
      ]
    );
  };

  // Handle long press on message
  const handleMessageLongPress = (message: any) => {
    // Show options for any message (reply for others, delete for own)
    setShowMessageOptions(message.id);
  };

  // Handle group header press
  const handleGroupHeaderPress = () => {
    setShowGroupMembers(!showGroupMembers);
  };

  // Get group avatar initials
  const getGroupAvatarInitials = (groupName: string) => {
    return groupName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Render message bubble
  const renderItem = ({ item }: { item: Message }) => {
    const isMine = item.sender_id === user?.id;
    const timestamp = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Check if this is a voice message (has audio attachment and voice data in message)
    let voiceMessageData = null;
    let isVoiceMessage = false;
    let messageText = null;
    
    if (item.attachments && item.attachments.length > 0) {
      const audioAttachment = item.attachments.find(att => att.mime?.startsWith('audio/'));
      if (audioAttachment && item.message) {
        // Check for voice message format: [VOICE_MESSAGE:duration]
        const voiceMatch = item.message.match(/^\[VOICE_MESSAGE:(\d+)\]$/);
        console.log('Voice message check (group):', {
          message: item.message,
          hasAudioAttachment: !!audioAttachment,
          voiceMatch: voiceMatch,
          isVoiceMessage: !!voiceMatch
        });
        if (voiceMatch) {
          voiceMessageData = {
            url: audioAttachment.url,
            duration: parseInt(voiceMatch[1])
          };
          isVoiceMessage = true;
        } else {
          // Regular message with audio attachment
          messageText = item.message;
        }
      }
    }

    // If it's a voice message, render the dedicated voice bubble
    if (isVoiceMessage && voiceMessageData) {
      return (
        <TouchableOpacity
          onLongPress={() => handleMessageLongPress(item)}
          activeOpacity={0.8}
        >
          <VoiceMessageBubble
            uri={voiceMessageData.url}
            duration={voiceMessageData.duration}
            isMine={isMine}
            timestamp={timestamp}
            senderName={!isMine && item.sender ? item.sender.name : undefined}
          />
        </TouchableOpacity>
      );
    }

    // Regular message bubble
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-end',
        marginVertical: 4,
        justifyContent: isMine ? 'flex-end' : 'flex-start'
      }}>
        {/* Avatar for received messages */}
        {!isMine && (
          <UserAvatar
            avatarUrl={item.sender?.avatar_url}
            name={item.sender?.name || 'User'}
            size={32}
            style={{ marginRight: 8, marginBottom: 4 }}
          />
        )}
        
        <TouchableOpacity
          onLongPress={() => handleMessageLongPress(item)}
          activeOpacity={0.8}
        >
          <View
            style={{
              backgroundColor: isMine ? '#25D366' : (isDark ? '#374151' : '#E5E7EB'),
              borderRadius: 18,
              borderTopLeftRadius: isMine ? 18 : 4,
              borderTopRightRadius: isMine ? 4 : 18,
              padding: 12,
              maxWidth: '85%',
              minWidth: 60,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
          {/* Reply bubble */}
          {item.reply_to && (
            <ReplyBubble
              replyTo={item.reply_to}
              isMyMessage={isMine}
            />
          )}

          {/* Show sender name for group messages */}
          {!isMine && item.sender && (
            <Text
              style={{
                fontSize: 12,
                color: isMine ? '#E0E7FF' : '#6B7280',
                marginBottom: 4,
                fontWeight: '600',
              }}
            >
              {item.sender.name}
            </Text>
          )}

          {item.attachments && item.attachments.length > 0 && (
            item.attachments[0].mime?.startsWith('image/') ? (
              <Image source={{ uri: item.attachments[0].url }} style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 6 }} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <MaterialCommunityIcons name="file" size={28} color="#8B5CF6" />
                <Text style={{ marginLeft: 6, color: isMine ? '#fff' : (isDark ? '#fff' : '#111827') }}>{item.attachments[0].name || 'File'}</Text>
              </View>
            )
          )}
          
          {item.message && !isVoiceMessage && (
            <Text 
              style={{ 
                color: isMine ? '#fff' : (isDark ? '#fff' : '#111827'),
                fontSize: 16,
                lineHeight: 20,
                flexShrink: 1,
              }}
            >
              {item.message}
            </Text>
          )}
          <Text style={{ fontSize: 10, color: isMine ? '#E0E7FF' : '#6B7280', marginTop: 2, alignSelf: 'flex-end' }}>{timestamp}</Text>
        </View>
        </TouchableOpacity>
        
        {/* Message options modal */}
        {showMessageOptions === item.id && (
          <View style={{
            position: 'absolute',
            top: -20,
            right: isMine ? 0 : 'auto',
            left: isMine ? 'auto' : 0,
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: 8,
            padding: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
            zIndex: 1000,
          }}>
            {/* Show Reply option for other users' messages */}
            {!isMine && (
              <TouchableOpacity
                onPress={() => handleReply(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                }}
              >
                <MaterialIcons name="reply" size={16} color={isDark ? '#fff' : '#000'} />
                <Text style={{ marginLeft: 8, color: isDark ? '#fff' : '#000', fontSize: 14 }}>Reply</Text>
              </TouchableOpacity>
            )}
            
            {/* Show Delete option for your own messages */}
            {isMine && (
              <TouchableOpacity
                onPress={() => handleDeleteMessage(item.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                }}
              >
                <MaterialIcons name="delete" size={16} color="#EF4444" />
                <Text style={{ marginLeft: 8, color: '#EF4444', fontSize: 14 }}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // Handle emoji select
  const handleEmojiSelect = (emoji: any) => {
    setInput(input + emoji.native);
    setShowEmoji(false);
  };

  useEffect(() => {
    fetchMessages();
  }, [id]);

  return (
    <SafeAreaView
      edges={['top']}
      className={isDark ? 'bg-gray-900' : 'bg-white'}
      style={{ flex: 1 }}
    >
      {/* Header */}
      <View style={{ zIndex: 10 }} className={`border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Main Header */}
        <View className="flex-row items-center p-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <MaterialCommunityIcons name="arrow-left" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          
          {/* Group Avatar and Info */}
          <TouchableOpacity 
            onPress={handleGroupHeaderPress} 
            className="flex-1 flex-row items-center"
          >
            {/* Group Avatar */}
            <View className="w-12 h-12 rounded-full bg-purple-500 items-center justify-center mr-3">
              <Text className="text-white font-semibold text-lg">
                {getGroupAvatarInitials(groupInfo?.name || `Group ${id}`)}
              </Text>
            </View>
            
            {/* Group Info */}
            <View className="flex-1">
              <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {groupInfo?.name || `Group ${id}`}
              </Text>
              <Text className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {groupInfo?.users?.length || 0} members • {messages.length} messages
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Group Info Button */}
          <TouchableOpacity onPress={() => {
            if (groupInfo) {
              const groupData = encodeURIComponent(JSON.stringify(groupInfo));
              router.push(`/group-info?id=${id}&groupData=${groupData}`);
            } else {
              router.push(`/group-info?id=${id}`);
            }
          }}>
            <MaterialCommunityIcons name="information-outline" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
        </View>

        {/* Group Members Section */}
        {showGroupMembers && groupInfo?.users && (
          <View className={`px-4 pb-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <Text className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Group Members ({groupInfo.users.length})
            </Text>
            <View className="flex-row flex-wrap">
              {groupInfo.users.map((member: any, index: number) => (
                <View 
                  key={member.id} 
                  className={`flex-row items-center mr-4 mb-2 ${
                    index < 3 ? '' : 'opacity-60'
                  }`}
                >
                  {/* Member Avatar */}
                  <UserAvatar
                    avatarUrl={member.avatar_url}
                    name={member.name}
                    size={32}
                    style={{ marginRight: 8 }}
                  />
                  
                  {/* Member Name */}
                  <Text className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {member.name}
                  </Text>
                  
                  {/* Owner Badge */}
                  {member.id === groupInfo.owner_id && (
                    <View className="ml-1">
                      <MaterialCommunityIcons name="star" size={12} color="#F59E0B" />
                    </View>
                  )}
                </View>
              ))}
              
              {/* Show more indicator if there are many members */}
              {groupInfo.users.length > 6 && (
                <View className="flex-row items-center mr-4 mb-2">
                  <View className="w-8 h-8 rounded-full bg-gray-400 items-center justify-center mr-2">
                    <Text className="text-white font-medium text-xs">
                      +{groupInfo.users.length - 6}
                    </Text>
                  </View>
                  <Text className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    more
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={{ 
        flex: 1,
        paddingBottom: keyboardHeight > 0 ? keyboardHeight - 20 : 0 // Proper keyboard handling
      }}>
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              setShowMessageOptions(null);
              Keyboard.dismiss();
            }}
            style={{ flex: 1 }}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={(item, index) => {
                if (item && item.id !== undefined && item.id !== null) {
                  return `message-${item.id}`;
                }
                return `message-fallback-${index}-${Math.random().toString(36).slice(2)}`;
              }}
              contentContainerStyle={{ padding: 16, paddingBottom: keyboardHeight > 0 ? 20 : 0 }}
              onContentSizeChange={() => {
                if (flatListRef.current && messages.length > 0) {
                  flatListRef.current.scrollToEnd({ animated: true });
                }
              }}
              onLayout={() => {
                if (flatListRef.current && messages.length > 0) {
                  flatListRef.current.scrollToEnd({ animated: true });
                }
              }}
            />
          </TouchableOpacity>
        )}
        
        {/* Reply Preview */}
        {replyingTo && (
          <ReplyPreview
            replyTo={replyingTo}
            onCancel={handleCancelReply}
          />
        )}
        
        {/* Emoji Picker */}
        {showEmoji && (
          <View style={{ height: 320 }}>
            <Picker theme={isDark ? 'dark' : 'light'} onSelect={handleEmojiSelect} />
          </View>
        )}
        
        {/* Attachment Preview */}
        {attachment && (
          <View className="flex-row items-center px-2 pb-1">
            {attachment.isImage ? (
              <Image source={{ uri: attachment.uri }} style={{ width: 60, height: 60, borderRadius: 8, marginRight: 8 }} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                <MaterialCommunityIcons name="file" size={28} color="#8B5CF6" />
                <Text style={{ marginLeft: 6, color: isDark ? '#fff' : '#111827' }}>{attachment.name}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => setAttachment(null)}>
              <MaterialCommunityIcons name="close-circle" size={28} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Input Bar */}
        <View
          className="flex-row items-center px-2 py-2"
          style={{
            backgroundColor: isDark ? '#232d36' : '#f7f7f7',
            borderRadius: 30,
            marginHorizontal: 8,
            marginBottom: keyboardHeight > 0 ? 0 : 8, // Small gap when keyboard is hidden
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          {/* Attachment */}
          <TouchableOpacity onPress={pickFile} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
            <MaterialCommunityIcons name="paperclip" size={24} color={isDark ? '#8B5CF6' : '#6B7280'} />
          </TouchableOpacity>
          {/* Emoji */}
          <TouchableOpacity onPress={() => setShowEmoji(v => !v)} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
            <MaterialCommunityIcons name="emoticon-outline" size={24} color="#F59E42" />
          </TouchableOpacity>
          {/* Text Input */}
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            style={{
              flex: 1,
              minHeight: 40,
              maxHeight: 100,
              backgroundColor: isDark ? '#1F2937' : '#fff',
              color: isDark ? '#fff' : '#111827',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              fontSize: 16,
            }}
            editable={!sending}
            multiline
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
            textAlignVertical="center"
          />
                  {/* Dynamic Send/Mic Button */}
        {(!input.trim() && !attachment && !voiceRecording) ? (
          <TouchableOpacity onPress={handleVoiceRecording} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#374151' : '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
            <MaterialCommunityIcons name="microphone" size={24} color={isDark ? '#8B5CF6' : '#6B7280'} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSend} disabled={sending} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: sending ? '#A5B4FC' : '#8B5CF6', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
            <MaterialCommunityIcons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        )}
              </View>
      </View>

    {/* Voice Recording Preview */}
    {voiceRecording && (
      <View className="flex-row items-center px-4 py-1 border-t border-gray-200 dark:border-gray-700" style={{ marginBottom: 0 }}>
        <MaterialCommunityIcons name="microphone" size={20} color="#8B5CF6" />
        <View className="flex-1 ml-3">
          <VoicePlayer 
            uri={voiceRecording.uri} 
            duration={voiceRecording.duration}
            size="small"
          />
        </View>
        <TouchableOpacity onPress={() => setVoiceRecording(null)}>
          <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    )}

    {/* Voice Recorder Modal */}
    <Modal
      visible={showVoiceRecorder}
      transparent
      animationType="slide"
      onRequestClose={handleVoiceRecordingCancel}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}>
        <View style={{
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderRadius: 16,
          padding: 20,
          width: '100%',
          maxWidth: 400,
        }}>
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            onCancel={handleVoiceRecordingCancel}
            maxDuration={60}
          />
        </View>
      </View>
    </Modal>
  </SafeAreaView>
);
} 