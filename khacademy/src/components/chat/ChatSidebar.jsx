
export default function ChatSidebar(
    { 
        channels,
        selectedChannel,
        setSelectedChannel,
        sidebarOpen,
        setSidebarOpen,
        unreadCounts
    }
) {

    return(<>
        <aside className={`chat-sidebar ${sidebarOpen ? "open" : ""}`}>
            <div className="sidebar-header">
                <h2>채널</h2>

                <button
                    className="sidebar-close"
                    onClick={() => setSidebarOpen(false)}
                >
                    ×
                </button>
            </div>

            {channels?.map(channel => (
                <div 
                    key={channel.chatChannelNo}
                    onClick={() => {
                        setSelectedChannel(channel);
                        setSidebarOpen(false);
                    }}
                >
                    <span>
                        {channel.chatChannelName}
                    </span>

                    {unreadCounts?.[channel.chatChannelNo] > 0 && (
                        <span className="unread-count">
                            {unreadCounts[channel.chatChannelNo]}
                        </span>
                    )}
                </div>
            ))}
        </aside>
    </>)
}