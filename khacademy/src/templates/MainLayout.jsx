import { Outlet } from "react-router-dom";
import Header from "@templates/Header";
import Sidebar from "./Sidebar";

import "./MainLayout.css";
import { useCallback, useState } from "react";
import { Bounce, ToastContainer } from "react-toastify";

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