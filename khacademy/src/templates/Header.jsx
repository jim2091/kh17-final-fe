import "./Header.css";

export default function Header({openSidebar}) {
    return (
        <div className="header">

            <button
                type="button"
                className="header-menu-button"
                onClick={openSidebar}
            >
                ☰
            </button>
            <div className="header-logo">
                LOGO
            </div>

            <div className="header-search">
                <input
                    type="text"
                    placeholder="검색어를 입력하세요"
                />
            </div>

            <div className="header-actions">

                <div className="header-notification">
                    알림
                </div>

                <div className="header-profile">
                    프로필
                </div>

            </div>
        </div>
    )
}