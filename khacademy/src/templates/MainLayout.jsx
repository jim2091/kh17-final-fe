import { Outlet } from "react-router-dom";
import Header from "@templates/Header";
import Sidebar from "./Sidebar";

import "./MainLayout.css";
import { useCallback, useState } from "react";

export default function MainLayout() {

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const openSidebar = useCallback(() => {
        setSidebarOpen(true);
    }, []);

    const closeSidebar = useCallback(() => {
        setSidebarOpen(false);
    }, []);
    
    return (
        <div className="main-layout">

            <Header
                openSidebar={openSidebar}
            />

            <div className="main-body">

                <Sidebar
                    sidebarOpen={sidebarOpen}
                    closeSidebar={closeSidebar}
                />

                <div className="main-content">
                    <Outlet/>
                </div>
            </div>
        </div>
    )
}