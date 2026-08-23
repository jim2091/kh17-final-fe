import { NavLink } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
    return (
        <div className="sidebar">

            <div className="sidebar-create">
                <button type="button">
                    + 새 프로젝트
                </button>
            </div>

            <div className="sidebar-menu">

                <NavLink
                    to="/projects"
                    end
                    className={({isActive}) => 
                        isActive ? "sidebar-link active" : "sidebar-link"
                    }
                >
                    내 프로젝트
                </NavLink>
                
                <NavLink
                    to="/projects/public"
                    className={({isActive}) => 
                        isActive ? "sidebar-link active" : "sidebar-link"
                    }
                >
                    공개 프로젝트
                </NavLink>
                
                <NavLink
                    to="/projects/archive"
                    className={({isActive}) => 
                        isActive ? "sidebar-link active" : "sidebar-link"
                    }
                >
                    아카이브
                </NavLink>

            </div>
        </div>
    )
}