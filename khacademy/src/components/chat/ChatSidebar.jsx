
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
        <div className={`chat-sidebar ${sidebarOpen ? "open" : ""}`}>
            <div className="sidebar-header">
                <div className="sidebar-title">
                    채널
                </div>

                <button
                    type="button"
                    className="sidebar-close"
                    onClick={() => setSidebarOpen(false)}
                >
                    ×
                </button>
            </div>

            <div className="channel-list">
                {channels?.map(channel => {
                    const active = 
                        selectedChannel?.chatChannelNo === channel.chatChannelNo;
                    
                        return (
                            <button
                                type="button"
                                key={channel.chatChannelNo}
                                className={
                                    active ? "channel-item active" : "channel-item"
                                }
                                onClick={() => {
                                    setSelectedChannel(channel)
                                    setSidebarOpen(false)
                                }}
                                >
                                    <div className="channel-item-left">
                                        <span className="channel-prefix">#</span>
                                        <span className="channel-name">
                                            {channel.chatChannelName}
                                        </span>
                                    </div>

                                    {unreadCounts?.[channel.chatChannelNo] > 0 && (
                                        <span className="channel-unread-badge">
                                            {unreadCounts[channel.chatChannelNo]}
                                        </span>
                                    )}
                                </button>
                        );
                })}
            </div>
        </div>
    </>)
}