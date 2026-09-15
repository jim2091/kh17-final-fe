import { FiArrowDown, FiMenu, FiSearch, FiX } from "react-icons/fi";

export default function ChatHeader(
    { 
        selectedChannel, setSidebarOpen, 
        searchOpen, setSearchOpen,
        contextMode, onReturnLatest
    }
) {

    return(<>
        <header className="chat-header">
            <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen(prev => !prev)}
            >
                <FiMenu />
            </button>
            
            <div className="chat-header-text">
                <div className="chat-header-title">
                    {selectedChannel
                        ? `${selectedChannel.chatChannelName}`
                        : "채널을 선택하세요"}
                </div>

                <div className="chat-header-description">
                    프로젝트 채널 대화
                </div>
            </div>

            <div className="chat-header-actions">
                {contextMode && (
                    <button
                        type="button"
                        className="chat-header-action-button latest"
                        onClick={onReturnLatest}
                    >
                        <FiArrowDown />
                        <span>최신 메세지</span>
                    </button>
                )}

                <button
                    type="button"
                    className={`chat-header-action-button ${searchOpen ? "active" : ""}`}
                    onClick={() => setSearchOpen(prev => !prev)}
                    disabled={!selectedChannel}
                >
                    {searchOpen ? <FiX /> : <FiSearch />}
                </button>
            </div>
        </header>
    </>)
}