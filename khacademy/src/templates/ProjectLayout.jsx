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

    //알림 이동시 프로젝트 번호가 필요해서 수정 -승훈
    useEffect(()=>{
        loadProject();
    }, [projectNo, loadProject]);

    //최초 진입(프로젝트 정보를 한 번도 못 받아온 상태)에서만 전체 화면 스피너 처리
    //project가 이미 한 번 세팅된 이후(=프로젝트 전환 시 loading이 다시 true가 되는 경우)에는
    //Outlet(하위 페이지, 예: Calendar)을 언마운트시키지 않도록 분리함.
    //그렇지 않으면 프로젝트 전환마다 하위 컴포넌트가 통째로 재마운트되어
    //그 안의 모달 등 로컬 state가 초기화되는 문제가 발생함
    //(예: 알림 클릭으로 열린 일정 상세 모달이 프로젝트 정보 재조회 타이밍에 맞물려 사라지는 버그)
    if (project === null) {
        if (loading === true) {
            return (
                <div className="project-content-loading">
                    <Spinner animation="border" size="sm"/>
                </div>
            );
        }
        //최초 조회 실패 등으로 project가 끝내 null인 경우
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
