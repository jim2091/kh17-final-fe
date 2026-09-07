import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";
import { Button, Form, ListGroup, Modal, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";

export default function ProjectExpectedResultModal({
    show, onHide,projectNo,project
}){
    //기대결과 목록
    const[resultList,setResultList] = useState([]);
    //등록할 기대결과
    const [content,setContent] = useState("");
    //수정중인 기대결과 번호
    const [editNo, setEditNo] = useState(null);
    //수정 내용
    const [editContent,setEditContent] = useState("");
    //로딩
    const [loading,setLoading] = useState(false);

    //현재 로그인 사용자가 owner인지
    const isOwner = project?.projectMemberRole === "owner";
    
    //기대결과 목록 조회
    const loadResultList = useCallback(async()=>{
        try{
            setLoading(true);
            
            const {data} = await apiClient.get(`/project/${projectNo}/result`);

            setResultList(data);
        }
        catch(e){
            toast.error("기대결과 목록을 불러오지 못했습니다.");
        }
        finally{
            setLoading(false);
        }
    },[projectNo]);

    //Modal이 열릴 떄 조회
    useEffect(()=>{
        if(show === true){
            loadResultList();
        }
    },[show,loadResultList]);

    //기대결과 등록
    const addResult = useCallback(async()=>{
        if(content.trim().length === 0){
            toast.warning("기대결과를 입력해주세요.");
            return;
        }

        try{
            await apiClient.post(`/project/${projectNo}/result`,
                {projectResultContent:content.trim()}
            );

            toast.success("기대결과가 등록되었습니다.");

            //입력창 초기화
            setContent("");
            //목록 다시 조회
            loadResultList();
        }
        catch(e){
            toast.error("기대결과 등록에 실패했습니다.");
        }

    },[projectNo,content,loadResultList]);

    //수정 시작
    const startEdit = useCallback((result)=>{
        setEditNo(result.projectResultNo);

        setEditContent(result.projectResultContent);
    },[]);

    //수정 취소
    const cancelEdit = useCallback(()=>{
        setEditNo(null);
        setEditContent("");
    },[]);
    
    //기대 결과 수정
    const updateResult = useCallback(async(projectResultNo)=>{
        if(editContent.trim().length===0){
            toast.warning("기대결과를 입력해주세요.");
            return;
        }

        try{
            await apiClient.put(`/project/${projectNo}/result/${projectResultNo}`,
                {projectResultContent : editContent.trim()}
            );
            
            toast.success("기대결과가 수정되었습니다.");
            
            //수정상태 초기화
            setEditNo(null);
            setEditContent("");

            //목록 다시 조회
            await loadResultList();
        }
        catch(e){
            toast.error("기대 결과 수정에 실패했습니다.");
        }
   
    },[projectNo,editContent,loadResultList]);

    //기대결과 삭제
    const deleteResult = useCallback(async(result)=>{
        const confirm = await Swal.fire({
                    icon:"warning",
                    title:"기대결과를 삭제하시겠습니까?",
                    text: result.projectResultContent,
                    showCancelButton : true,
                    confirmButtonText : "삭제",
                    cancelButtonText : "취소"
                });
        
                if(confirm.isConfirmed === false) return;

                try{
                    await apiClient.delete(`/project/${projectNo}/result/${result.projectResultNo}`);
                 
                    toast.success("기대결과가 삭제되었습니다.");
                
                    await loadResultList();
                }

                catch(e){
                    toast.error("기대결과 삭제에 실패했습니다.");
                }
    },[projectNo,loadResultList]);

    return(<>
        <Modal show={show} onHide={onHide}
            centered size="lg">
            
            <Modal.Header closeButton>
                <Modal.Title>
                    프로젝트 기대결과
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {/* OWNER만 등록 가능 */}
                    {isOwner && (

                        <div className="d-flex gap-2 mb-4">

                            <Form.Control
                                type="text"
                                placeholder="기대결과를 입력하세요"
                                value={content}
                                onChange={(e) =>
                                    setContent(
                                        e.target.value
                                    )
                                }
                            />

                            <Button
                                variant="primary"
                                onClick={addResult}
                            >
                                추가
                            </Button>

                        </div>

                    )}

                        {/* 로딩 */}
                    {loading === true ? (

                        <div className="text-center py-5">

                            <Spinner
                                animation="border"
                            />

                            <div className="mt-2">
                                기대결과 불러오는 중입니다...
                            </div>

                        </div>

                    ) : resultList.length === 0 ? (

                        /* 기대결과 없음 */
                        <div className="text-center text-muted py-5">

                            등록된 기대결과가 없습니다.

                        </div>

                    ) : (

                        /* 기대결과 목록 */
                        <ListGroup>

                            {resultList.map(
                                (result) => (

                                    <ListGroup.Item
                                        key={
                                            result.projectResultNo
                                        }
                                    >

                                        <div
                                            className="
                                                d-flex
                                                justify-content-between
                                                align-items-center
                                                gap-3
                                            "
                                        >

                                            {/* 수정중 */}
                                            {
                                                editNo
                                                ===
                                                result.projectResultNo
                                                    ? (

                                                        <Form.Control
                                                            type="text"
                                                            value={
                                                                editContent
                                                            }
                                                            onChange={
                                                                (e) =>
                                                                    setEditContent(
                                                                        e.target.value
                                                                    )
                                                            }
                                                        />

                                                    )
                                                    : (

                                                        <div>

                                                            {
                                                                result.projectResultOrder
                                                            }.

                                                            {" "}

                                                            {
                                                                result.projectResultContent
                                                            }

                                                        </div>

                                                    )
                                            }


                                            {/* OWNER만 수정/삭제 가능 */}
                                            {isOwner && (

                                                <div
                                                    className="
                                                        d-flex
                                                        gap-2
                                                        flex-shrink-0
                                                    "
                                                >

                                                    {
                                                        editNo
                                                        ===
                                                        result.projectResultNo
                                                            ? (
                                                                <>

                                                                    <Button
                                                                        size="sm"
                                                                        variant="success"
                                                                        onClick={() =>
                                                                            updateResult(
                                                                                result.projectResultNo
                                                                            )
                                                                        }
                                                                    >
                                                                        저장
                                                                    </Button>

                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        onClick={
                                                                            cancelEdit
                                                                        }
                                                                    >
                                                                        취소
                                                                    </Button>

                                                                </>
                                                            )
                                                            : (
                                                                <>

                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline-primary"
                                                                        onClick={() =>
                                                                            startEdit(
                                                                                result
                                                                            )
                                                                        }
                                                                    >
                                                                        수정
                                                                    </Button>

                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline-danger"
                                                                        onClick={() =>
                                                                            deleteResult(
                                                                                result
                                                                            )
                                                                        }
                                                                    >
                                                                        삭제
                                                                    </Button>

                                                                </>
                                                            )
                                                    }

                                                </div>

                                            )}

                                        </div>

                                    </ListGroup.Item>

                                )
                            )}

                        </ListGroup>

                    )}

                </Modal.Body>


                <Modal.Footer>

                    <Button
                        variant="secondary"
                        onClick={onHide}
                    >
                        닫기
                    </Button>

                </Modal.Footer>

            </Modal>

        </>
    );
}
