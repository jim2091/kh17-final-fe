
export default function ChatSidebar(
    { channels, onSelectedChannel }
) {

    return(<>
        <aside className="chat-sidebar">
            <h3>채널</h3>

            {channels?.map(channel => (
                <div 
                    key={channel.chatChannelNo}
                    onClick={() => onSelectedChannel(channel)}
                >
                    {channel.chatChannelName}
                </div>
            ))}
        </aside>
    </>)
}