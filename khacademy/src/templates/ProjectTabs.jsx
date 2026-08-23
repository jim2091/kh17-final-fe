import { NavLink, useParams } from "react-router-dom";

export default function ProjectTabs() {

    const {projectNo} = useParams();

    return (<>
        <NavLink to={`/projects/${projectNo}/task`}>
            업무
        </NavLink>
        
        <NavLink to={`/projects/${projectNo}/chat`}>
            채팅
        </NavLink>

        <NavLink to={`/projects/${projectNo}/calendar`}>
            캘린더
        </NavLink>

        <NavLink to={`/projects/${projectNo}/notes`}>
            노트
        </NavLink>

        <NavLink to={`/projects/${projectNo}/files`}>
            파일
        </NavLink>

        <NavLink to={`/projects/${projectNo}/records`}>
            기록
        </NavLink>

    </>)
}