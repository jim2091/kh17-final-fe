import { Outlet } from "react-router-dom";
import ProjectHeader from "./ProjectHeader";
import ProjectTabs from "./ProjectTabs";

export default function ProjectLayout() {

    return (<>
        <div>
            {/* 프로젝트 공통 정보 영역 */}
            <ProjectHeader/>

            {/* 프로젝트 내부탭 영역 */}
            <ProjectTabs/>

            {/* 탭별 실제 화면 */}
            <div className="project-content">
                <Outlet/>
            </div>
        </div>
    </>)
}