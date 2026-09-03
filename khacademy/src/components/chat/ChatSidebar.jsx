import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";

export default function ChatSidebar(
    { 
        channels,
        selectedChannel,
        setSelectedChannel,
        sidebarOpen,
        setSidebarOpen,
        unreadCounts,
        canManageChannel,
        loadChannelList
    }
) {
    const {projectNo} = useParams();
    const [channelModal, setChannelModal] = useState(false);
    const [channelModalMode, setChannelModalMode] = useState("create");
    const [channelName, setChannelName] = useState("");
    const [targetChannel, setTargetChannel] =useState(null);
    const [channelMenuNo, setChannelMenuNo] = useState(null);
    const [saving, setSaving] = useState(false);

    const openCreateModal = useCallback(()=>{
        setChannelModalMode("create")
        setTargetChannel(null);
        setChannelName("");
        setChannelModal(true);
    }, []);




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