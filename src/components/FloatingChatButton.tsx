import chatAvatar from '@/assets/chat-avatar.webp';

interface FloatingChatButtonProps {
  onClick: () => void;
}

export const FloatingChatButton = ({ onClick }: FloatingChatButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-28 right-4 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border-2 border-primary/40 shadow-[0_0_25px_-5px_hsl(145_70%_45%/0.5)] hover:shadow-[0_0_35px_-5px_hsl(145_70%_45%/0.7)] hover:scale-110 transition-all duration-300 overflow-hidden flex items-center justify-center"
      aria-label="Open chat assistant"
    >
      <img src={chatAvatar} alt="" className="w-11 h-11 object-contain" />
    </button>
  );
};
