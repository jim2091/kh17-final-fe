import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({
    sidebarOpen,
    closeSidebar
}) {
    const navigate = useNavigate();
    return (<>
        <div className={
            sidebarOpen ?
                "sidebar open" : "sidebar"
        }>

            <div className="sidebar-create">
                <button onClick={() => navigate("/projects/add")}>
                    + 새 프로젝트
                </button>
            </div>

            <div className="sidebar-menu">

                <NavLink
                    to="/projects/my"
                    end
                    className={({ isActive }) =>
                        isActive ? "sidebar-link active" : "sidebar-link"
                    }
                    onClick={closeSidebar}
                >
                    내 프로젝트
                </NavLink>

                <NavLink
                    to="/projects/public"
                    className={({ isActive }) =>
                        isActive ? "sidebar-link active" : "sidebar-link"
                    }
                    onClick={closeSidebar}
                >
                    공개 프로젝트
                </NavLink>

                <NavLink
                    to="/projects/archive"
                    className={({ isActive }) =>
                        isActive ? "sidebar-link active" : "sidebar-link"
                    }
                    onClick={closeSidebar}
                >
                    아카이브
                </NavLink>

            </div>
        </div>

        {sidebarOpen && (
            <div className="sidebar-backdrop" onClick={closeSidebar} />
        )}
    </>)
}