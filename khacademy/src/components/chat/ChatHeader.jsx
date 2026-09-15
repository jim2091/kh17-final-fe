import { FiArrowDown, FiMenu, FiSearch, FiX } from "react-icons/fi";

export default function ChatHeader(
    {
        selectedChannel, setSidebarOpen,
        searchOpen, setSearchOpen,
        contextMode, onReturnLatest
    }
) {

    return (<>
        <div className="chat-header">
            <div className="chat-header-inner">

                <button
                    type="button"
                    className="sidebar-toggle"
                    onClick={() =>
                        setSidebarOpen(prev => !prev)
                    }
                >
                    <FiMenu />
                </button>

                <div className="chat-current-channel ms-3">
                    <span className="chat-header-title">
                        {selectedChannel
                            ? selectedChannel.chatChannelName
                            : "채널을 선택하세요"
                        }
                    </span>
                </div>


                <div className="chat-header-actions">

                    {contextMode && (
                        <button
                            type="button"
                            className="chat-header-action-button latest"
                            onClick={onReturnLatest}
                        >
                            <FiArrowDown />
                            <span>최신 메시지</span>
                        </button>
                    )}

                    <button
                        type="button"
                        className={`chat-header-action-button ${searchOpen ? "active" : ""
                            }`}
                        onClick={() =>
                            setSearchOpen(prev => !prev)
                        }
                        disabled={!selectedChannel}
                    >
                        <FiSearch />
                    </button>

                </div>

            </div>
        </div>
    </>)
}