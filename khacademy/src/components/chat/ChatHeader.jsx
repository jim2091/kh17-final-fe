
export default function ChatHeader({ selectedChannel }) {

    return(<>
        <header className="chat-header">
            {selectedChannel ? (
                <h5>
                    {selectedChannel.chatChannelName}
                </h5>
            ) : (
                <h5>채널을 선택해주세요.</h5>
            )}
        </header>
    </>)
}