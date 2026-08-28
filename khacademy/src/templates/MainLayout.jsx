import { Outlet } from "react-router-dom";
import Header from "@templates/Header";
import Sidebar from "./Sidebar";

import "./MainLayout.css";
import { useCallback, useEffect, useState } from "react";
import { Bounce, ToastContainer } from "react-toastify";

export default function MainLayout() {

    //아래거의 딱 반대 의미긴 한데 의미상 다름
    //그리고 아직 구현 전이라 확실친 않은데 따로 있어야 할 거 같음
    const [smallScreen, setSmallScreen] = useState(
        () => window.innerWidth <= 900
    )

    const [sidebarOpen, setSidebarOpen] = useState(
        () => window.innerWidth > 900
    );

    //햄버거 버튼용 토글기능(화면 크기와 무관하게 사용 가능)
    const toggleSidebar = useCallback(()=>{
        setSidebarOpen(prev => !prev);
    }, []);

    //작은 화면에서만 메뉴 열고 이동하면 자동으로 닫힐때 쓰기
    const closeSidebar = useCallback(()=>{
        if (smallScreen === false) return;
        setSidebarOpen(false);
    }, [smallScreen]);

    useEffect(()=>{
        const mediaQuery = window.matchMedia("(max-width: 900px)");
        
        const changeSidebar = (e) => {
            
            const isSmallScreen = e.matches;
            setSmallScreen(isSmallScreen);
            
            //작은 화면 진입 -> 자동 닫기
            //큰 화면 진입 -> 자동 열기
            setSidebarOpen(!isSmallScreen);
        };
        mediaQuery.addEventListener("change", changeSidebar);

        //클린업 함수 써주는거 유의
        return () =>{
            mediaQuery.removeEventListener("change", changeSidebar);
        };
    }, []);

    return (
        <div className="main-layout">

            <Header
                toggleSidebar={toggleSidebar}
            />

            <div className="main-body">

                <Sidebar
                    sidebarOpen={sidebarOpen}
                    closeSidebar={closeSidebar}
                />

                <div className="main-content">
                    <Outlet />
                </div>
            </div>

            {/* react-toastify container */}
            <ToastContainer
                position="bottom-right"
                autoClose={3000}
                hideProgressBar={true}
                newestOnTop={false}
                closeOnClick={true}
                rtl={false}
                pauseOnFocusLoss={false}
                // draggable
                pauseOnHover
                theme="colored"
                transition={Bounce}
            />
        </div>
    )
}