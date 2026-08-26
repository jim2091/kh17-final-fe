import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";

export default function PublicProjectList() {
    
    //프로젝트 번호
    const {projectNo} = useParams();

    //페이지 이동
    const navigate =useNavigate();

    //프로젝트 정보
    const [project,setProject] = useState({
        projectName : "",
        projectPurpose : "",
        projectVisibility : "public",
        projectStart : "",
        projectDeadline : ""
    });

    //검사 결과
    const [result,setResult] = useState({
        projectName : "null",
        projectPurpose : "null",
        projectStart : "null",
        projectDeadline : "null"
    });

    //로딩상태
    const [loading , setLoading] = useState(true);

    //프로젝트 상세조회
    // const loadProject = useCallback(async ()=>{
    //     try{
    //         setLoading(true);

    //         const {data} = await apiClient.get(`/project/${projectNo}`);

    //         //owner가 아닌경우
    //         if(data.projectMemberRole !== "owner"){
    //             toast.warning("프로젝트 수정 권한이 없습니다.");
    //             navigate(`/projects/${projectNo}/task`);
    //             return;
    //         }

    //         setProject({
                
    //         })
    //     }
    // },[projectNo])
    return (<>
        
    </>)
}