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
            <h5>{selectedChannel?.chatChannelName}</h5>
        </header>
    </>)
}