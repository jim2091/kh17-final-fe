import { Outlet, useParams } from "react-router-dom";
import ProjectHeader from "./ProjectHeader";
import ProjectTabs from "./ProjectTabs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { apiClient } from "../utils/reaxios";
import { Spinner } from "react-bootstrap";
import ProjectPresenceSidebar from "../components/project/ProjectPresenceSidebar";
import { User, Users } from "lucide-react";

export default function ProjectLayout() {

    const {projectNo} = useParams();

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    const [presenceOpen, setPresenceOpen] = useState(false);

    //프로젝트 상세 조회
    const loadProject = useCallback(async ()=>{
        try{
            setLoading(true);
            const {data} = await apiClient.get(`/project/${projectNo}`);
            setProject(data);
        }
        catch(e){
            console.error(e);
            toast.error("프로젝트 정보를 불러오지 못했습니다.");
        }
        finally{
            setLoading(false);
        }
    }, [projectNo]);

    useEffect(()=>{
        loadProject();
    }, []);

    if(loading === true) {
        return (
            <div className="project-content-loading">
                <Spinner animation="border" size="sm"/>
            </div>
        );
    }

    if(project === null) {
        return null;
    }

    return (<>
        <div>
            {/* 프로젝트 공통 정보 영역 */}
            <ProjectHeader
                project={project}
                loadProject={loadProject}
            />

            {/* 프로젝트 내부 탭 + Presence 버튼 */}
            <div className="project-tabs-wrapper">
                {/* 프로젝트 내부탭 영역 */}
                <ProjectTabs/>

                {/* presence 사이드바 버튼 */}
                <button
                    type="button"
                    className={`project-presence-toggle ${presenceOpen ? "active" : ""}`}
                    onClick={() => setPresenceOpen(prev => !prev)}
                >
                    <Users size={18}/>
                    <span>멤버</span>
                </button>
            </div>

            {/* 프로젝트 실제 컨텐츠 영역 */}
            <div className="project-body">
                {/* 탭별 실제 화면 */}
                <div className="project-content">
                    <Outlet
                        context={{
                            project,
                            loadProject
                        }}
                    />
                </div>

                {/* 프로젝트 멤버 Presence */}
                {presenceOpen && (
                    <ProjectPresenceSidebar />
                )}
            </div>
        </div>
    </>)
}