import { Outlet, useParams } from "react-router-dom";
import ProjectHeader from "./ProjectHeader";
import ProjectTabs from "./ProjectTabs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { apiClient } from "../utils/reaxios";
import { Spinner } from "react-bootstrap";
import ProjectPresenceSidebar from "../components/project/ProjectPresenceSidebar";
import { User, Users } from "lucide-react";
import { useAtomValue } from "jotai";
import { loginUserState } from "../utils/storage";

export default function ProjectLayout() {

    const {projectNo} = useParams();

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    const [presenceOpen, setPresenceOpen] = useState(false);

    //로그인 사용자
    const loginUser = useAtomValue(loginUserState);

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
    }, [projectNo]);

    //최근 방문 프로젝트 저장(홈화면에 쓰임)
    useEffect(() => {
        if(!projectNo) return;
        if(!loginUser?.empNo) return;

        //사용자별로 최근 프로젝트 목록 분리
        const storageKey = `recentProjects_${loginUser.empNo}`;

        //기존 최근 프로젝트 목록 조회
        const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");

        const currentProjectNo = Number(projectNo);

        //현재 프로젝트가 이미 있으면 기존 위치에서 제거
        const filtered = saved.filter(
            item => item.projectNo !== currentProjectNo
        );

        //현재 프로젝트를 가장 앞으로 추가
        const next = [
            {
                projectNo: currentProjectNo,
                visitedAt: Date.now()
            },
            ...filtered
        ].slice(0, 10);

        //저장
        localStorage.setItem(storageKey, JSON.stringify(next));

    }, [projectNo, loginUser?.empNo]);

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