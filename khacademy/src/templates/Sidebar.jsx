import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({
    sidebarOpen,
    closeSidebar
}) {
    const navigate = useNavigate();

    //closeSidebar도 같이 써주게 그냥 따로 빼서 온클릭 걸어주기로
    const moveToProjectAdd = () => {
        navigate("/projects/add");
        closeSidebar
    };

    return (<>
        <div className={
            sidebarOpen ?
                "sidebar open" : "sidebar closed"
        }>
            <div className="sidebar-inner">

                <div className="sidebar-create">
                    <button onClick={moveToProjectAdd}>
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
        </div>

        {sidebarOpen && (
            <div className="sidebar-backdrop" onClick={closeSidebar} />
        )}
    </>)
}