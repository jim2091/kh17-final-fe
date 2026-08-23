import "./Task.css";

export default function Task() {
    return (
        <div className="task-board">

            <div className="task-column">
                <div className="task-column-title">
                    할 일
                </div>

                <div className="task-card">
                    업무 카드 예시
                </div>
            </div>

            <div className="task-column">
                <div className="task-column-title">
                    진행 중
                </div>

                <div className="task-card">
                    업무 카드 예시
                </div>
            </div>

            <div className="task-column">
                <div className="task-column-title">
                    완료
                </div>

                <div className="task-card">
                    업무 카드 예시
                </div>
            </div>

        </div>
    );
}