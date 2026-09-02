import { NavLink, Outlet } from "react-router-dom";
import "./Project.css";


export default function AdminTabs(){
    return(<>
    <div className="project-tabs">

                <NavLink to="/users" className={({isActive})=> isActive ? "project-tab active" : "project-tab"}
                >사용자관리</NavLink>
                <NavLink to="/departments"className={({isActive})=> isActive ? "project-tab active" : "project-tab"}>부서관리</NavLink>
                <NavLink to="/positions"className={({isActive})=> isActive ? "project-tab active" : "project-tab"}>직급관리</NavLink>
    </div>

    <div className="project-content">
        <Outlet/>
    </div>

    </>);
}