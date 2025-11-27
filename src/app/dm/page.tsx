"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Search, User, Check, ArrowLeft, MoreVertical, Filter, Archive, CheckCircle, Settings } from "react-feather";
import { TOP_REVIEWERS, type Reviewer } from "../data/communityHighlightsData";
import Footer from "../components/Footer/Footer";
import StaggeredContainer from "../components/Animations/StaggeredContainer";
import AnimatedElement from "../components/Animations/AnimatedElement";

interface Chat {
  id: string;
  user: Reviewer;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  online: boolean;
}

// Premium Chat Item Component
function ChatItem({ chat, index }: { chat: Chat; index: number }) {
  const [imgError, setImgError] = useState(false);

  return (
    <AnimatedElement index={index} direction="bottom">
      <Link
        href={`/dm/${chat.id}`}
        className="group relative block"
      >
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="relative overflow-hidden bg-card-bg/95 backdrop-blur-xl rounded-2xl border border-card-bg/60 ring-1 ring-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
          style={{
            boxShadow: '0 8px 32px rgba(157, 171, 155, 0.15), 0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Premium gradient overlay on hover with brand colors */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-navbar-bg/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          <div className="relative flex items-center gap-4 p-4 sm:p-5">
            {/* Profile Picture with Premium Styling */}
            <div className="relative flex-shrink-0">
              <div className="relative">
                {!imgError && chat.user.profilePicture && chat.user.profilePicture.trim() !== "" ? (
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-white/60 ring-offset-2 ring-offset-card-bg/50 shadow-lg">
                    <Image
                      src={chat.user.profilePicture}
                      alt={chat.user.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-gradient-to-br from-white/20 to-white/10 text-white rounded-full ring-2 ring-white/60 ring-offset-2 ring-offset-card-bg/50 shadow-lg">
                    <User className="text-white/90 w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2} />
                  </div>
                )}
              </div>

              {/* Online Status with Premium Glow */}
              {chat.online && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full border-2 border-card-bg shadow-lg ring-2 ring-green-500/30"
                  style={{
                    boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.2), 0 0 8px rgba(34, 197, 94, 0.4)',
                  }}
                />
              )}

              {/* Verified Badge */}
              {chat.user.badge === "verified" && (
                <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center ring-2 ring-card-bg shadow-lg">
                  <Check className="text-white w-3 h-3" strokeWidth={3} />
                </div>
              )}
            </div>

            {/* Chat Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5 gap-3">
                <h3 className="text-base sm:text-lg font-semibold text-white truncate group-hover:text-white/90 transition-colors duration-200" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  {chat.user.name}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs sm:text-sm text-white/70 font-medium whitespace-nowrap" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                    {chat.timestamp}
                  </span>
                  {chat.unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="min-w-[24px] h-6 px-2 bg-gradient-to-br from-navbar-bg to-navbar-bg/90 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/20"
                      style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                    >
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </motion.span>
                  )}
                </div>
              </div>
              <p className="text-sm sm:text-base text-white/80 truncate leading-relaxed" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                {chat.lastMessage}
              </p>
            </div>
          </div>
        </motion.div>
      </Link>
    </AnimatedElement>
  );
}

// Generate dummy chat data from reviewers
const generateDummyChats = (): Chat[] => {
  const lastMessages = [
    "Hey! Thanks for reaching out. I'd love to chat!",
    "Hi! I really enjoyed reading your reviews.",
    "Thank you so much! That means a lot.",
    "Great to hear from you! How can I help?",
    "I saw your review about that restaurant. I totally agree!",
    "Thanks for the recommendation! I'll check it out.",
    "That's a great point. I had a similar experience.",
    "Looking forward to chatting more about this!",
  ];

  const timestamps = [
    "Just now",
    "2 min ago",
    "15 min ago",
    "1 hr ago",
    "2 hrs ago",
    "Yesterday",
    "2 days ago",
    "Last week",
  ];

  return TOP_REVIEWERS.slice(0, 8).map((reviewer, index) => ({
    id: reviewer.id,
    user: reviewer,
    lastMessage: lastMessages[index % lastMessages.length],
    timestamp: timestamps[index % timestamps.length],
    unreadCount: index < 3 ? (index % 3) + 1 : 0,
    online: index < 4,
  }));
};

export default function DMChatListPage() {
  const router = useRouter();
  const [chats] = useState<Chat[]>(generateDummyChats());
  const [searchQuery, setSearchQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const filteredChats = chats.filter((chat) =>
    chat.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  // Calculate menu position
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    } else {
      setMenuPosition(null);
    }
  }, [showMenu]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dm-list"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-dvh bg-gradient-to-br from-off-white via-white to-off-white font-urbanist relative overflow-hidden"
        style={{
          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
      >
        {/* Premium Background Orbs with Brand Colors */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-card-bg/8 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-navbar-bg/8 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Header with navbar-bg */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-navbar-bg/95 backdrop-blur-xl border-b border-white/30 shadow-sm">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="group flex items-center touch-manipulation"
                aria-label="Go back"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 border border-white/20 hover:border-white/30 shadow-sm hover:shadow-md mr-3"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-white/80 transition-colors duration-300" strokeWidth={2.5} />
                </motion.div>
                <h3 className="font-urbanist text-base font-bold text-white group-hover:text-white/80 transition-colors duration-200 " style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  Messages
                </h3>
              </button>
              
              <div className="relative">
                <motion.button
                  ref={buttonRef}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 border border-white/20 hover:border-white/30 shadow-sm hover:shadow-md"
                  aria-label="More options"
                  aria-expanded={showMenu}
                >
                  <MoreVertical className="w-5 h-5 text-white/80" strokeWidth={2} />
                </motion.button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showMenu && menuPosition && (
                    <motion.div
                      ref={menuRef}
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="fixed z-[60] bg-white rounded-xl shadow-xl border border-white/60 ring-1 ring-white/30 min-w-[200px] overflow-hidden"
                      style={{
                        top: `${menuPosition.top}px`,
                        right: `${menuPosition.right}px`,
                      }}
                    >
                      <div className="py-2">
                        <button
                          onClick={() => {
                            // Mark all as read functionality
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-off-white/50 transition-colors text-left"
                        >
                          <CheckCircle className="w-5 h-5 text-charcoal/70" strokeWidth={2} />
                          <span className="text-sm font-medium text-charcoal" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                            Mark all as read
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            // Archive all functionality
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-off-white/50 transition-colors text-left"
                        >
                          <Archive className="w-5 h-5 text-charcoal/70" strokeWidth={2} />
                          <span className="text-sm font-medium text-charcoal" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                            Archive all
                          </span>
                        </button>
                        <div className="border-t border-charcoal/10 my-1" />
                        <button
                          onClick={() => {
                            router.push('/settings');
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-off-white/50 transition-colors text-left"
                        >
                          <Settings className="w-5 h-5 text-charcoal/70" strokeWidth={2} />
                          <span className="text-sm font-medium text-charcoal" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                            Settings
                          </span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 mx-auto w-full max-w-[2000px] px-4 sm:px-6 pt-24 sm:pt-28 pb-8">
          {/* Search Bar - Matching Events & Specials Style */}
          <div className="mb-6 sm:mb-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="py-4 relative"
            >
              <form onSubmit={(e) => e.preventDefault()} className="w-full">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-0 border-b-2 border-charcoal/20 text-base placeholder:text-base placeholder:text-charcoal/40 font-normal text-charcoal focus:outline-none focus:border-charcoal/60 hover:border-charcoal/30 transition-all duration-200 py-3 px-0 pr-2 touch-manipulation"
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      fontSize: '16px',
                    }}
                    aria-label="Search conversations"
                  />
                  {searchQuery && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center text-charcoal/60 hover:text-charcoal transition-colors z-10"
                      aria-label="Clear search"
                      type="button"
                    >
                      <span className="text-charcoal/60 text-lg">×</span>
                    </motion.button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>

          {/* Chat List */}
          {filteredChats.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-card-bg/15 rounded-full blur-2xl" />
                <MessageCircle className="relative w-16 h-16 sm:w-20 sm:h-20 text-charcoal/20" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                No conversations found
              </h3>
              <p className="text-sm sm:text-base text-charcoal/60 max-w-md" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                Try adjusting your search or start a new conversation
              </p>
            </motion.div>
          ) : (
            <StaggeredContainer>
              <div className="space-y-3 sm:space-y-4">
                {filteredChats.map((chat, index) => (
                  <ChatItem key={chat.id} chat={chat} index={index} />
                ))}
              </div>
            </StaggeredContainer>
          )}

          {/* Empty State for No Chats */}
          {chats.length === 0 && filteredChats.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 sm:py-24 text-center px-4"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-card-bg/20 to-navbar-bg/20 rounded-full blur-3xl" />
                <MessageCircle className="relative w-20 h-20 sm:w-24 sm:h-24 text-charcoal/20" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-charcoal mb-3" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                No messages yet
              </h2>
              <p className="text-base sm:text-lg text-charcoal/60 max-w-md mb-6" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                Start a conversation with reviewers and community members to get started!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-br from-card-bg to-card-bg/90 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
              >
                Start New Conversation
              </motion.button>
            </motion.div>
          )}
        </main>

        <Footer />
      </motion.div>
    </AnimatePresence>
  );
}
