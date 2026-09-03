import { FiMenu } from "react-icons/fi";

export default function ChatHeader(
    { selectedChannel, sidebarOpen, setSidebarOpen }
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
                        ? `# ${selectedChannel.chatChannelName}`
                        : "채널을 선택하세요"}
                </div>

                <div className="chat-header-description">
                    프로젝트 채널 대화
                </div>
            </div>
        </header>
    </>)
}