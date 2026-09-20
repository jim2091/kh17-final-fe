import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";
import { useSetAtom } from "jotai";
import { dmWindowOpenState } from "@utils/storage";

export default function Sidebar({
    sidebarOpen,
    closeSidebar
}) {
    const navigate = useNavigate();

    //closeSidebar도 같이 써주게 그냥 따로 빼서 온클릭 걸어주기로
    const moveToProjectAdd = () => {
        navigate("/projects/add");
        closeSidebar();
    };

    const setDmWindowOpen =
        useSetAtom(dmWindowOpenState);

    //DM 창 열기
    const openDmWindow = () => {

        setDmWindowOpen(true);

        //작은 화면이면 사이드바는 닫기
        closeSidebar();
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

                    {/* 프로젝트 */}
                    <div className="sidebar-group">

                        <div className="sidebar-group-title">
                            프로젝트
                        </div>

                        <div className="sidebar-group-menu">

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

                    {/* 조직 */}
                    <div className="sidebar-group">

                        <div className="sidebar-group-title">
                            조직
                        </div>

                        <div className="sidebar-group-menu">
                            <NavLink
                                to="/members"
                                className={({ isActive }) =>
                                    isActive
                                        ? "sidebar-link active"
                                        : "sidebar-link"
                                }
                                onClick={closeSidebar}
                            >
                                구성원
                            </NavLink>

                            <NavLink
                                to="/organization/departments"
                                className={({ isActive }) =>
                                    isActive
                                        ? "sidebar-link active"
                                        : "sidebar-link"
                                }
                                onClick={closeSidebar}
                            >
                                부서
                            </NavLink>
                        </div>
                    </div>

                    {/* 커뮤니케이션 */}
                    <div className="sidebar-group">

                        <div className="sidebar-group-title">
                            커뮤니케이션
                        </div>

                        <div className="sidebar-group-menu">

                            <button
                                type="button"
                                className="sidebar-link sidebar-dm-button"
                                onClick={openDmWindow}
                            >
                                DM
                            </button>

                        </div>

                    </div>

                </div>

            </div>
        </div>

        {sidebarOpen && (
            <div className="sidebar-backdrop" onClick={closeSidebar} />
        )}
    </>)
}