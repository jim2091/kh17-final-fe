import { NavLink, useParams } from "react-router-dom";

import "./Project.css";

export default function ProjectTabs() {

    const { projectNo } = useParams();

    return (
        <div className="project-tabs">

            <NavLink
                to={`/projects/${projectNo}/task`}
                className={({ isActive }) =>
                    isActive ? "project-tab active" : "project-tab"
                }
            >
                업무
            </NavLink>

            <NavLink
                to={`/projects/${projectNo}/chat`}
                className={({ isActive }) =>
                    isActive ? "project-tab active" : "project-tab"
                }
            >
                채팅
            </NavLink>

            <NavLink
                to={`/projects/${projectNo}/calendar`}
                className={({ isActive }) =>
                    isActive ? "project-tab active" : "project-tab"
                }
            >
                캘린더
            </NavLink>

            <NavLink
                to={`/projects/${projectNo}/notes`}
                className={({ isActive }) =>
                    isActive ? "project-tab active" : "project-tab"
                }
            >
                노트
            </NavLink>

            <NavLink
                to={`/projects/${projectNo}/files`}
                className={({ isActive }) =>
                    isActive ? "project-tab active" : "project-tab"
                }
            >
                파일
            </NavLink>

            <NavLink
                to={`/projects/${projectNo}/records`}
                className={({ isActive }) =>
                    isActive ? "project-tab active" : "project-tab"
                }
            >
                기록
            </NavLink>

        </div>
    );
}