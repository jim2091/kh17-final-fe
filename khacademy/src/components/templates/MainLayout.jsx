import { Outlet } from "react-router-dom";

export default function MainLayout() {
    return (<>
        {/* 상단 공통 영역 */}
        <div>
            HEADER
        </div>

        {/* 헤더 아래 영역 */}
        <div style={{ display: "flex" }}>

            {/* 좌측 사이드바 */}
            <div style={{ width: "220px" }}>
                SIDEBAR
            </div>

            {/* 실제 페이지가 들어갈 영역 */}
            <div style={{ flex: 1 }}>
                <Outlet />
            </div>
        </div>
    </>)
}