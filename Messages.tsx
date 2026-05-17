import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, orderBy, getDocs, onSnapshot, setDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Chat, Message, Listing } from '../types';
import { useAuth } from '../context/AuthContext';
import { Send, Image as ImageIcon, MessageCircle, ChevronLeft, MoreVertical, Ban, Search, Archive, Trash2, CheckCircle2, Bell, BellOff } from 'lucide-react';
import { formatPKR, cn } from '../lib/utils';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export function Messages() {
  const { user, isBlocked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chats, setChats] = useState<(Chat & { listingTitle?: string; listingImage?: string; otherPartyName?: string })[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOffer, setIsOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'archived'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.state?.activeChatId) {
      setActiveChatId(location.state.activeChatId);
      setShowMobileChat(true);
      if (location.state?.forceNewSession) {
         setNewMessage('');
         setIsOffer(false);
         setOfferAmount('');
      }
      // Clear state after handling
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    // Fetch user's chats
    const fetchChats = async () => {
      try {
        const qBuyer = query(collection(db, 'chats'), where('buyerId', '==', user.uid));
        const qSeller = query(collection(db, 'chats'), where('sellerId', '==', user.uid));
        
        const [buyerSnap, sellerSnap] = await Promise.all([getDocs(qBuyer), getDocs(qSeller)]);
        const allChats = [...buyerSnap.docs, ...sellerSnap.docs].map(d => ({...d.data(), id: d.id} as Chat));
        
        // Sort by updatedAt
        allChats.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

        // Get additional info (Listing title)
        const enrichedChats = await Promise.all(allChats.map(async (c) => {
          try {
            const listSnap = await getDocs(query(collection(db, 'listings'), where('__name__', '==', c.listingId)));
            const listing = listSnap.docs[0]?.data() as Listing | undefined;
            return {
              ...c,
              listingTitle: listing?.title || 'Unknown Listing',
              listingImage: listing?.images?.[0] || '',
              otherPartyName: c.buyerId === user.uid ? listing?.sellerName || 'Seller' : 'Buyer'
            };
          } catch {
            return c;
          }
        }));
        
        setChats(enrichedChats);
        if (enrichedChats.length > 0 && !activeChatId) {
          setActiveChatId(enrichedChats[0].id);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'chats');
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, [user]);

  useEffect(() => {
    if (!user || !activeChatId) return;
    
    // Mark as read when opening chat
    const markAsRead = async () => {
      const activeChat = chats.find(c => c.id === activeChatId);
      if (!activeChat) return;
      
      const isBuyer = activeChat.buyerId === user.uid;
      const unreadCount = isBuyer ? activeChat.unreadCountBuyer : activeChat.unreadCountSeller;
      
      if (unreadCount && unreadCount > 0) {
        try {
          await updateDoc(doc(db, 'chats', activeChatId), {
            [isBuyer ? 'unreadCountBuyer' : 'unreadCountSeller']: 0
          });
        } catch (e) {
          console.error('Failed to mark as read:', e);
        }
      }
    };
    markAsRead();

    const messagesRef = collection(db, 'chats', activeChatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({...d.data(), id: d.id} as Message));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${activeChatId}/messages`);
    });
    
    return unsubscribe;
  }, [activeChatId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) {
      alert("Your account is restricted. You cannot send messages.");
      return;
    }
    if (!newMessage.trim() && (!isOffer || !offerAmount)) return;
    if (!user || !activeChatId) return;

    try {
      const msgRef = doc(collection(db, 'chats', activeChatId, 'messages'));
      const msgData: any = {
        senderId: user.uid,
        text: newMessage.trim(),
        isOffer,
        createdAt: serverTimestamp()
      };
      
      if (isOffer && offerAmount) {
        msgData.offerAmount = Number(offerAmount);
        msgData.text = `Offered ${formatPKR(Number(offerAmount))}`;
      }
      
      await setDoc(msgRef, msgData);
      
      const activeChat = chats.find(c => c.id === activeChatId);
      if (!activeChat) return;
      const isBuyer = activeChat.buyerId === user.uid;

      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: msgData.text,
        updatedAt: serverTimestamp(),
        [isBuyer ? 'unreadCountSeller' : 'unreadCountBuyer']: (isBuyer ? (activeChat.unreadCountSeller || 0) : (activeChat.unreadCountBuyer || 0)) + 1
      });
      
      setNewMessage('');
      setIsOffer(false);
      setOfferAmount('');
    } catch (e) {
      console.error(e);
      alert('Failed to send message.');
    }
  };

  const handleToggleBlock = async () => {
    if (!activeChatId || !user) return;
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;

    const currentlyBlocked = chat.isBlocked && chat.blockedBy === user.uid;
    const confirmMsg = currentlyBlocked 
      ? 'Are you sure you want to unblock this user?' 
      : 'Are you sure you want to block this user? You will no longer receive messages from them in this chat.';
    
    if (!confirm(confirmMsg)) return;
    if (!confirm('FINAL VALIDATION: Confirm user restriction status change?')) return;
    
    try {
      await updateDoc(doc(db, 'chats', activeChatId), {
        isBlocked: !currentlyBlocked,
        blockedBy: !currentlyBlocked ? user.uid : null
      });
      setShowChatOptions(false);
      alert(currentlyBlocked ? 'User unblocked.' : 'User blocked.');
      // Refresh local state to avoid delay
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, isBlocked: !currentlyBlocked, blockedBy: !currentlyBlocked ? user.uid : null } : c));
    } catch (e) {
      console.error(e);
      alert('Failed to update block status.');
    }
  };

  const handleToggleArchive = async (chatId: string) => {
    if (!user) return;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const isBuyer = chat.buyerId === user.uid;
    const isArchived = isBuyer ? chat.isArchivedBuyer : chat.isArchivedSeller;

    if (!confirm(`Are you sure you want to ${isArchived ? 'unarchive' : 'archive'} this chat?`)) return;
    if (!confirm(`FINAL CONFIRMATION: ${isArchived ? 'Restore' : 'Move'} conversation ${isArchived ? 'to inbox' : 'to archive'}?`)) return;

    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [isBuyer ? 'isArchivedBuyer' : 'isArchivedSeller']: !isArchived
      });
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, [isBuyer ? 'isArchivedBuyer' : 'isArchivedSeller']: !isArchived } : c));
    } catch (e) {
      console.error(e);
      alert('Failed to update archive status.');
    }
  };

  const handleToggleMute = async (chatId: string) => {
    if (!user) return;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const isBuyer = chat.buyerId === user.uid;
    const isMuted = isBuyer ? chat.isMutedBuyer : chat.isMutedSeller;

    if (!confirm(`Are you sure you want to ${isMuted ? 'unmute' : 'mute'} notifications for this chat?`)) return;
    if (!confirm(`FINAL CONFIRMATION: ${isMuted ? 'Resume' : 'Silence'} alerts for this conversation?`)) return;

    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [isBuyer ? 'isMutedBuyer' : 'isMutedSeller']: !isMuted
      });
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, [isMuted ? 'isMutedBuyer' : 'isMutedSeller']: !isMuted } : c));
    } catch (e) {
      console.error(e);
      alert('Failed to update mute status.');
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this chat history? This action cannot be undone.')) return;
    if (!confirm('FINAL WARNING: This conversation will be permanently removed from your view. DELETE?')) return;
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const isBuyer = chat.buyerId === user.uid;

    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [isBuyer ? 'isDeletedBuyer' : 'isDeletedSeller']: true
      });
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChatId === chatId) setActiveChatId(null);
    } catch (e) {
      console.error(e);
      alert('Failed to delete chat.');
    }
  };

  const handleMarkAsReadManual = async (chatId: string) => {
    if (!user) return;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    if (!confirm('Are you sure you want to mark this chat as read?')) return;
    if (!confirm('FINAL CONFIRMATION: Clear unread notification counter?')) return;

    const isBuyer = chat.buyerId === user.uid;

    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [isBuyer ? 'unreadCountBuyer' : 'unreadCountSeller']: 0
      });
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, [isBuyer ? 'unreadCountBuyer' : 'unreadCountSeller']: 0 } : c));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredChats = chats.filter(chat => {
    const isBuyer = chat.buyerId === user.uid;
    const isDeleted = isBuyer ? chat.isDeletedBuyer : chat.isDeletedSeller;
    if (isDeleted) return false;

    const isArchived = isBuyer ? chat.isArchivedBuyer : chat.isArchivedSeller;
    if (activeTab === 'archived' && !isArchived) return false;
    if (activeTab === 'all' && isArchived) return false;

    const searchLower = searchQuery.toLowerCase();
    return (
      chat.listingTitle?.toLowerCase().includes(searchLower) ||
      chat.otherPartyName?.toLowerCase().includes(searchLower) ||
      chat.lastMessage?.toLowerCase().includes(searchLower)
    );
  });

  if (!user) return <div className="p-20 text-center">Please log in to view messages.</div>;
  if (loading) return <div className="p-20 text-center">Loading chats...</div>;

  return (
    <div className="max-w-7xl mx-auto px-0 md:px-4 h-[calc(100vh-170px)] md:h-[calc(100vh-180px)] flex flex-col overflow-hidden">
      <div className="bg-white md:rounded-xl shadow-2xl border border-stone-200 flex-grow flex overflow-hidden relative">
        
        {/* Conversations Sidebar */}
        <div className={`w-full md:w-1/3 flex flex-col h-full border-r border-stone-200 bg-white ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-stone-100 bg-stone-50/50">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-stone-900 uppercase italic tracking-tighter leading-none">Messages</h2>
                <div className="flex bg-stone-100 p-1 rounded-xl">
                   <button onClick={() => setActiveTab('all')} className={cn("px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all", activeTab === 'all' ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600")}>Inbox</button>
                   <button onClick={() => setActiveTab('archived')} className={cn("px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all", activeTab === 'archived' ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600")}>Archived</button>
                </div>
             </div>
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-amber-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search conversations..." 
                  className="w-full bg-white border-stone-100 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold text-stone-900 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
             </div>
          </div>
          
          <div className="flex-grow overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-sm">
                {searchQuery ? 'No conversations matching your search.' : 'No messages here.'}
              </div>
            ) : (
              filteredChats.map(chat => {
                const isBuyer = chat.buyerId === user.uid;
                const unreadCount = isBuyer ? chat.unreadCountBuyer : chat.unreadCountSeller;
                const isMuted = isBuyer ? chat.isMutedBuyer : chat.isMutedSeller;
                
                return (
                  <div 
                    key={chat.id} 
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setShowMobileChat(true);
                      if (unreadCount && unreadCount > 0) handleMarkAsReadManual(chat.id);
                    }}
                    className={`group p-4 border-b border-stone-100 cursor-pointer hover:bg-stone-50 transition-colors flex gap-3 relative ${activeChatId === chat.id ? 'bg-amber-50 border-amber-100' : ''}`}
                  >
                    <div className="w-12 h-12 rounded bg-stone-200 flex-shrink-0 overflow-hidden relative">
                      {chat.listingImage ? <img src={chat.listingImage} className="w-full h-full object-cover" alt="" /> : null}
                      {unreadCount && unreadCount > 0 && (
                        <div className={`absolute -top-1 -right-1 w-5 h-5 ${isMuted ? 'bg-stone-400' : 'bg-amber-500'} text-stone-900 text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white`}>
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="flex-grow overflow-hidden pr-6">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="font-bold text-stone-900 truncate text-sm flex items-center gap-1.5">
                          {isMuted && <BellOff className="w-3 h-3 text-stone-300" />}
                          {chat.listingTitle}
                        </div>
                        <div className="text-[10px] text-stone-400 font-bold">
                          {chat.updatedAt?.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-stone-500 mb-1">{chat.otherPartyName}</div>
                      <div className={`text-xs truncate ${unreadCount && unreadCount > 0 ? 'text-stone-900 font-bold' : 'text-stone-500'}`}>
                        {chat.lastMessage || 'Start a conversation'}
                      </div>
                    </div>

                    {/* Quick Actions Hidden by default, show on hover */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleArchive(chat.id); }}
                        className="p-1.5 hover:bg-white rounded-lg text-stone-400 hover:text-amber-600 shadow-sm border border-stone-100 bg-white/50"
                        title={activeTab === 'archived' ? 'Unarchive' : 'Archive'}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                        className="p-1.5 hover:bg-white rounded-lg text-stone-400 hover:text-red-600 shadow-sm border border-stone-100 bg-white/50"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`w-full md:w-2/3 flex flex-col h-full bg-stone-50 ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {activeChatId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-stone-200 bg-white flex items-center gap-3 relative">
                <button 
                  onClick={() => setShowMobileChat(false)}
                  className="md:hidden p-2 -ml-2 text-stone-500 hover:text-stone-900"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex-grow min-w-0">
                  <div className="font-bold text-lg text-stone-900 truncate">
                    {chats.find(c => c.id === activeChatId)?.listingTitle}
                  </div>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest truncate">{chats.find(c => c.id === activeChatId)?.otherPartyName}</span>
                    <span className="w-1 h-1 bg-stone-300 rounded-full shrink-0" />
                    <Link to={`/listings/${chats.find(c => c.id === activeChatId)?.listingId}`} className="text-[10px] font-bold text-amber-600 hover:underline uppercase tracking-widest whitespace-nowrap">
                      View Listing
                    </Link>
                  </div>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setShowChatOptions(!showChatOptions)}
                    className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showChatOptions && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-100 z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                      <button 
                        onClick={() => handleToggleArchive(activeChatId)}
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-2 border-b border-stone-50"
                      >
                        <Archive className="w-4 h-4" /> 
                        {chats.find(c => c.id === activeChatId)?.buyerId === user.uid 
                          ? (chats.find(c => c.id === activeChatId)?.isArchivedBuyer ? 'Unarchive Chat' : 'Archive Chat')
                          : (chats.find(c => c.id === activeChatId)?.isArchivedSeller ? 'Unarchive Chat' : 'Archive Chat')
                        }
                      </button>
                      <button 
                        onClick={() => handleToggleMute(activeChatId)}
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-2 border-b border-stone-50"
                      >
                        {chats.find(c => c.id === activeChatId)?.buyerId === user.uid 
                          ? (chats.find(c => c.id === activeChatId)?.isMutedBuyer ? <><Bell className="w-4 h-4" /> Unmute Notifications</> : <><BellOff className="w-4 h-4" /> Mute Notifications</>)
                          : (chats.find(c => c.id === activeChatId)?.isMutedSeller ? <><Bell className="w-4 h-4" /> Unmute Notifications</> : <><BellOff className="w-4 h-4" /> Mute Notifications</>)
                        }
                      </button>
                      <button 
                        onClick={() => handleMarkAsReadManual(activeChatId)}
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-2 border-b border-stone-50"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark as Read
                      </button>
                      <button 
                        onClick={handleToggleBlock}
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-stone-50 transition-colors flex items-center gap-2 border-b border-stone-50"
                      >
                        <Ban className="w-4 h-4" /> 
                        {chats.find(c => c.id === activeChatId)?.isBlocked && chats.find(c => c.id === activeChatId)?.blockedBy === user.uid
                          ? 'Unblock User' 
                          : 'Block User'
                        }
                      </button>
                      <button 
                        onClick={() => handleDeleteChat(activeChatId)}
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-700 bg-red-50/30 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Messages display */}
              <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-stone-50 scrollbar-hide">
                {chats.find(c => c.id === activeChatId)?.isBlocked ? (
                   <div className="flex flex-col items-center justify-center h-full text-stone-400 text-center px-6">
                      <Ban className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-black text-xs uppercase tracking-widest">This conversation is blocked</p>
                   </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-stone-500 mt-10">No messages yet. Say hi or send an offer!</div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.senderId === user.uid;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${isMine ? 'bg-amber-500 text-stone-900 rounded-br-none' : 'bg-white border border-stone-100 text-stone-800 rounded-bl-none'}`}>
                          {msg.isOffer ? (
                            <div className="font-bold flex items-center gap-2 mb-1 bg-stone-900/5 p-2 rounded-lg">
                              💰 Offer: {formatPKR(msg.offerAmount || 0)}
                            </div>
                          ) : (
                            <div className="text-sm font-medium leading-relaxed">{msg.text}</div>
                          )}
                          <div className={`text-[10px] mt-1.5 font-bold ${isMine ? 'text-stone-700/60 text-right' : 'text-stone-400'}`}>
                            {msg.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input Area */}
              <div className="p-4 pb-8 md:p-6 bg-white border-t border-stone-200">
                {isOffer && !chats.find(c => c.id === activeChatId)?.isBlocked && (
                  <div className="mb-4 flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
                    <span className="text-[10px] font-black tracking-widest uppercase text-stone-400 bg-stone-100 px-3 py-1 rounded-full">Make Offer</span>
                    <input 
                      type="number" 
                      placeholder="Amount (Rs)"
                      className="border border-stone-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 flex-grow"
                      value={offerAmount}
                      onChange={e => setOfferAmount(e.target.value)}
                    />
                    <button onClick={() => setIsOffer(false)} className="text-xs font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors">Cancel</button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
                  {!chats.find(c => c.id === activeChatId)?.isBlocked && (
                    <button 
                      type="button"
                      onClick={() => setIsOffer(!isOffer)}
                      className={`w-12 h-12 rounded-2xl flex-shrink-0 transition-all flex items-center justify-center text-xl shadow-sm ${isOffer ? 'bg-amber-100 ring-2 ring-amber-500' : 'bg-stone-100 text-stone-600 hover:bg-amber-100 hover:text-amber-600'}`}
                      title="Make an Offer"
                    >
                      💰
                    </button>
                  )}
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={isBlocked ? "Account Restricted: Messaging Disabled" : chats.find(c => c.id === activeChatId)?.isBlocked ? "Cannot send messages" : "Type a message..."}
                      className="w-full bg-stone-100 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-shadow disabled:opacity-50"
                      disabled={isOffer || !!chats.find(c => c.id === activeChatId)?.isBlocked || isBlocked}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={(!newMessage.trim() && !offerAmount) || !!chats.find(c => c.id === activeChatId)?.isBlocked || isBlocked}
                    className="w-12 h-12 lg:w-14 lg:h-14 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-2xl flex-shrink-0 transition-all shadow-lg active:scale-90 flex items-center justify-center disabled:opacity-30 disabled:grayscale transition-all"
                  >
                    <Send className="w-5 h-5 lg:w-6 lg:h-6" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center p-8 text-stone-500 flex-col">
              <MessageCircle className="w-16 h-16 text-stone-300 mb-4" />
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
