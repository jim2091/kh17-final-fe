// import { useCallback, useEffect, useState } from "react";
// import { apiClient } from "../../utils/reaxios";
// import { toast } from "react-toastify";

// export default function ProjectExpectedResultModal({
//     show, onHide,projectNo,project
// }){
//     //기대결과 목록
//     const[resultList,setResultList] = useState([]);
//     //등록할 기대결과
//     const [content,setContent] = useState("");
//     //수정중인 기대결과 번호
//     const [editNo, setEditNo] = useState(null);
//     //수정 내용
//     const [editContent,setEditContent] = useState("");
//     //로딩
//     const [loading,setLoading] = useState(false);

//     //현재 로그인 사용자가 owner인지
//     const isOwner = project.projectMemberRole === "owner";
    
//     //기대결과 목록 조회
//     const loadResultList = useCallback(async()=>{
//         try{
//             setLoading(true);
            
//             const {data} = await apiClient.get(`/project/${projectNo}/result`);
//         }
//         catch(e){
//             toast.error("기대결과 목록을 불러오지 못했습니다.");
//         }
//         finally{
//             setLoading(false);
//         }
//     },[projectNo]);

//     //Modal이 열릴 떄 조회
//     useEffect(()=>{
//         if(show === true){
//             loadResultList();
//         }
//     },[show,loadResultList]);

//     //기대결과 등록
//     const addResult = useCallback(async()=>{
//         if(content.trim().length === 0){
//             toast.warning("기대결과를 입력해주세요.");
//             return;
//         }

//         try{
//             await apiClient.post(`/project/${projectNo}/result`,
//                 {projectResultContent:content.trim()}
//             );

//             toast.success("기대결과가 등록되었습니다.");

//             //입력창 초기화
//             setContent("");
//             //목록 다시 조회
//             loadResultList();
//         }
//         catch(e){
//             toast.error("기대결과 등록에 실패했습니다.");
//         }

//     },[projectNo,content,loadResultList]);

//     //수정 시작
//     const startEdit = useCallback((result)=>{
//         setEditNo(result.projectResultNo);

//         setEditContent(result.projectResultContent);
//     },[]);

//     //수정 취소
//     const cancelEdit = useCallback(()=>{
//         setEditNo(null);
//         setEditContent("");
//     },[]);
    
//     //기대 결과 수정
//     const updateResult = useCallback(async(projectResultNo)=>{
//         if(editContent.trim().length===0){
//             toast.warning("기대결과를 입력해주세요.");
//             return;
//         }

//         try{
//             await apiClient.put(`/project/${projectNo}/result/${projectResultNo}`,
//                 {projectResultContent : editContent.trim()}
//             );
            
//             toast.success("기대결과가 수정되었습니다.");
//         }
//     })
// }
