
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
            <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메세지를 입력하세요."
            />
            <button onClick={onSend}>전송</button>
        </div>
    </>)
}