import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/forge';
import { request } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { 
  MessageSquare, Send, Check, Settings as SettingsIcon, AlertCircle, RefreshCw, X, Plus
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_QUICK_REPLIES = [
  "Your order is ready for pickup",
  "We're running 10 minutes behind",
  "Could you confirm your delivery address?",
  "Thank you for your business!",
];

export default function Messages() {
  const { bizProfile } = useAuth();
  const businessId = bizProfile?.id;
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();

  const deepLinkOrderId = searchParams.get('orderId');
  const deepLinkReservationId = searchParams.get('reservationId');

  const [selectedUser, setSelectedUser] = useState(null);
  const [inputText, setInputText] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [quickReplies, setQuickReplies] = useState(() => {
    const saved = localStorage.getItem('az-quick-replies');
    return saved ? JSON.parse(saved) : DEFAULT_QUICK_REPLIES;
  });
  const [newTemplateText, setNewTemplateText] = useState('');

  const chatEndRef = useRef(null);

  // Fetch Conversation List
  const { 
    data: inboxData, 
    isLoading: isLoadingInbox, 
    isError: isErrorInbox, 
    refetch: refetchInbox 
  } = useQuery({
    queryKey: ['business-inbox', businessId],
    queryFn: () => request(`/api/direct-messages/business-inbox?businessId=${businessId}`),
    enabled: !!businessId,
  });

  const conversations = inboxData?.conversations || [];

  // Fetch Message Thread
  const { 
    data: threadData, 
    isLoading: isLoadingThread, 
    isError: isErrorThread, 
    refetch: refetchThread 
  } = useQuery({
    queryKey: ['chat-thread', selectedUser?.id, businessId],
    queryFn: () => request(`/api/direct-messages/thread?userId=${selectedUser?.id}&businessId=${businessId}`),
    enabled: !!businessId && !!selectedUser?.id,
  });

  const messages = threadData?.messages || [];

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (body) => request('/api/direct-messages/send', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    onSuccess: () => {
      setInputText('');
      qc.invalidateQueries(['chat-thread', selectedUser?.id, businessId]);
      qc.invalidateQueries(['business-inbox', businessId]);
    },
  });

  // Handle deep-link support: pre-select user if present
  useEffect(() => {
    if (conversations.length > 0 && !selectedUser) {
      if (deepLinkOrderId) {
        const found = conversations.find(c => c.orderId === deepLinkOrderId);
        if (found) setSelectedUser(found.user || found);
      } else if (deepLinkReservationId) {
        const found = conversations.find(c => c.reservationId === deepLinkReservationId);
        if (found) setSelectedUser(found.user || found);
      }
    }
  }, [conversations, deepLinkOrderId, deepLinkReservationId, selectedUser]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Socket.IO: real-time inbox + thread updates (replaces polling) ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = () => {
      qc.invalidateQueries(['business-inbox', businessId]);
      if (selectedUser?.id) {
        qc.invalidateQueries(['chat-thread', selectedUser.id, businessId]);
      }
    };

    socket.on('biz_new_message', handleNewMessage);
    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('biz_new_message', handleNewMessage);
      socket.off('new_message', handleNewMessage);
    };
  }, [qc, businessId, selectedUser?.id]);

  // Save quick replies
  useEffect(() => {
    localStorage.setItem('az-quick-replies', JSON.stringify(quickReplies));
  }, [quickReplies]);

  const handleSend = () => {
    if (!inputText.trim() || !selectedUser) return;
    sendMessageMutation.mutate({
      businessId,
      userId: selectedUser.id,
      text: inputText,
      ...(deepLinkOrderId ? { orderId: deepLinkOrderId } : {}),
      ...(deepLinkReservationId ? { reservationId: deepLinkReservationId } : {}),
    });
  };

  const addTemplate = () => {
    if (!newTemplateText.trim()) return;
    setQuickReplies(prev => [...prev, newTemplateText.trim()]);
    setNewTemplateText('');
  };

  const removeTemplate = (index) => {
    setQuickReplies(prev => prev.filter((_, i) => i !== index));
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Error recovery states
  if (isErrorInbox) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-[var(--f-bad)]" />
        <h2 className="text-lg font-semibold text-ink">Could not load messages</h2>
        <button 
          onClick={() => refetchInbox()} 
          className="flex items-center gap-2 px-4 py-2 bg-tint text-[var(--f-text)] rounded-md font-semibold:brightness-110 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 p-1">
      {/* ── Left Column: Conversation List ── */}
      <Card className="w-72 flex flex-col h-full border border-line p-4 bg-surface/40">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-lg font-bold text-ink">Messages</h2>
          <button className="p-1.5 rounded-md bg-surface-sunken text-tint:brightness-95 transition-all" title="New Message">
            <Plus className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="flex-1 pr-1">
          {isLoadingInbox ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-md border border-line/50 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-surface-sunken" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-surface-sunken rounded w-2/3" />
                  <div className="h-3 bg-surface-sunken rounded w-1/2" />
                </div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <MessageSquare className="w-12 h-12 text-ink-3 mb-3 opacity-60" />
              <p className="text-sm font-semibold text-ink">No messages yet</p>
              <p className="text-xs text-ink-2 mt-1">Your customer conversations will appear here.</p>
            </div>
          ) : (
            <VirtualizedList
              items={conversations}
              estimateSize={72}
              overscan={5}
              renderItem={(conv) => {
                const u = conv.user || conv;
                const isSelected = selectedUser?.id === u.id;
                return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full flex items-center gap-3 p-3 rounded-md border transition-all text-left group relative ${
                    isSelected 
                      ? 'bg-surface-sunken border-tint text-ink' 
                      : 'border-line/50:bg-surface-sunken text-ink-2:text-ink'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-surface-sunken text-tint border border-tint/15 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {(u.name || u.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate">{u.name || u.username || 'Customer'}</span>
                      <span className="text-[10px] text-ink-3">{formatTime(conv.updated_date || conv.updatedAt)}</span>
                    </div>
                    <p className="text-xs text-ink-2 truncate mt-0.5">{conv.lastMessage || 'No message content'}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="absolute right-3 bottom-3 w-5 h-5 rounded-full bg-tint text-[var(--f-text)] font-bold text-[10px] flex items-center justify-center shadow-sm">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              );
              }}
            />
          )}
        </div>
      </Card>

      {/* ── Right Panel: Chat Thread ── */}
      <Card className="flex-1 flex flex-col h-full border border-line p-4 bg-surface/40 overflow-hidden relative">
        {selectedUser ? (
          <>
            {/* Thread Header */}
            <div className="flex items-center justify-between border-b border-line pb-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-sunken text-tint border border-tint/15 flex items-center justify-center font-bold text-sm">
                  {(selectedUser.name || selectedUser.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-ink">{selectedUser.name || selectedUser.username || 'Customer'}</h3>
                  <p className="text-[11px] text-ink-3">Direct messaging enabled</p>
                </div>
              </div>

              {/* Settings cog for Quick Replies */}
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className="p-1.5 rounded-md text-ink-2:bg-surface-sunken:text-ink transition-colors"
                title="Quick reply templates"
              >
                <SettingsIcon className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 custom-scrollbar relative">
              {isLoadingThread ? (
                <div className="space-y-4">
                  <div className="flex justify-start"><div className="w-1/2 h-10 bg-surface-sunken rounded-md animate-pulse" /></div>
                  <div className="flex justify-end"><div className="w-1/3 h-10 bg-surface-sunken rounded-md animate-pulse" /></div>
                  <div className="flex justify-start"><div className="w-2/5 h-10 bg-surface-sunken rounded-md animate-pulse" /></div>
                </div>
              ) : isErrorThread ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <AlertCircle className="w-8 h-8 text-[var(--f-bad)] mb-2" />
                  <p className="text-sm text-ink">Could not load messages.</p>
                  <button onClick={() => refetchThread()} className="text-xs text-tint underline mt-1">Try again</button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-ink-3 mb-2 opacity-50" />
                  <p className="text-xs text-ink-2">No messages yet. Send a message to start the conversation.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSentByMe = msg.senderId === businessId || msg.senderType === 'business';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] p-3 rounded-lg text-sm relative group ${
                        isSentByMe 
                          ? 'bg-tint text-[var(--f-text)] rounded-br-none shadow-sm' 
                          : 'bg-surface border border-line text-ink rounded-bl-none'
                      }`}>
                        <p className="leading-relaxed">{msg.text}</p>
                        <div className={`text-[9px] mt-1 text-right ${isSentByMe ? 'text-[var(--f-text)]/70' : 'text-ink-3'}`}>
                          {formatTime(msg.created_date || msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick replies settings overlay */}
            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-x-4 bottom-16 top-16 bg-surface border border-line rounded-lg shadow-xl p-4 flex flex-col z-10 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
                    <h4 className="font-bold text-sm text-ink">Manage Templates</h4>
                    <button onClick={() => setShowSettings(false)} className="text-ink-2:text-ink">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 pr-1">
                    {quickReplies.map((reply, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-surface-sunken border border-line/40 text-sm">
                        <span className="truncate flex-1 text-ink-2">{reply}</span>
                        <button onClick={() => removeTemplate(idx)} className="text-[var(--f-bad)]:text-red-600 text-xs font-semibold ml-2">Delete</button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2 pt-2 border-t border-line">
                    <input 
                      value={newTemplateText}
                      onChange={e => setNewTemplateText(e.target.value)}
                      placeholder="Add custom template..."
                      className="flex-1 text-xs bg-surface-sunken border border-line rounded px-2 py-1.5 outline-none text-ink focus:border-tint"
                    />
                    <button onClick={addTemplate} className="px-3 py-1.5 bg-tint text-[var(--f-text)] text-xs font-semibold rounded:brightness-110 transition-all">Add</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message Input Bar */}
            <div className="pt-3 border-t border-line space-y-2 flex-shrink-0 relative">
              {/* Quick Reply Popover button */}
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="text-xs text-tint font-semibold:underline flex items-center gap-1 bg-surface-sunken px-2 py-1 rounded"
                >
                  ⚡ Quick Reply
                </button>
                <AnimatePresence>
                  {showTemplates && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full mb-2 left-0 w-64 bg-surface border border-line rounded-lg shadow-lg p-2 max-h-48 overflow-y-auto z-10 backdrop-blur-sm"
                    >
                      {quickReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setInputText(reply);
                            setShowTemplates(false);
                          }}
                          className="w-full text-left text-xs p-2:bg-surface-sunken rounded text-ink-2:text-ink transition-colors truncate"
                        >
                          {reply}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-2">
                <input 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 bg-surface-sunken border border-line rounded-md px-3 py-2 text-sm text-ink outline-none focus:border-tint placeholder:text-ink-3"
                />
                <button 
                  onClick={handleSend}
                  disabled={sendMessageMutation.isLoading || !inputText.trim()}
                  className="px-4 py-2 bg-tint text-[var(--f-text)] rounded-md font-semibold:brightness-110 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <MessageSquare className="w-16 h-16 text-ink-3 mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-ink">Your conversation thread</h3>
            <p className="text-sm text-ink-2 mt-1 max-w-sm">Select a conversation from the left pane or support deep link parameters to begin chatting with customers.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
