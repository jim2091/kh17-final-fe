import { Outlet, useParams } from "react-router-dom";
import ProjectHeader from "./ProjectHeader";
import ProjectTabs from "./ProjectTabs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { apiClient } from "../utils/reaxios";
import { Spinner } from "react-bootstrap";

export default function ProjectLayout() {

    const {projectNo} = useParams();

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

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

            {/* 프로젝트 내부탭 영역 */}
            <ProjectTabs/>

            {/* 탭별 실제 화면 */}
            <div className="project-content">
                <Outlet
                    context={{
                        project,
                        loadProject
                    }}
                />
            </div>
        </div>
    </>)
}