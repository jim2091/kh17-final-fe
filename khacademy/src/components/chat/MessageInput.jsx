
export default function MessageInput(
    { input, setInput, onSend }
) {

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            onSend();
        }
    };

    return(<>
        <div className="message-input">
            <div className="message-input-inner">
                <input 
                    type="text"
                    className="message-input-field"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="메세지를 입력하세요."
                />

                <button
                    type="button"
                    className="message-send-button"
                    onClick={onSend}
                >
                        전송
                </button>
            </div>
        </div>
    </>)
}