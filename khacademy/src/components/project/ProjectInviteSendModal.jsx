import { useCallback, useState } from "react";
import { apiClient } from "../../utils/reaxios";
import { toast } from "react-toastify";
import { Button, Form, Modal, Spinner } from "react-bootstrap";

export default function ProjectInviteSendModal({
    show,onHide,projectNo
}){
    //검색어
    const [keyword,setKeyword] = useState("");
    //검색 결과
    const [empList,setEmpList] = useState([]);
    //선택한 사원
    const [selectedEmpList,setSelectedEmpList] = useState([]);
    //검색중
    const [searchLoading,setSearchLoading] = useState(false);
    //초대중
    const [inviteLoading,setInviteLoading] = useState(false);

    //검색어 변경
    const changeKeyword = useCallback((e)=>{
        setKeyword(e.target.value);
    },[])

    //사원 검색
    const searchEmp = useCallback(async ()=>{
        const searchKeyword = keyword.trim();

        if(searchKeyword.length === 0){
            toast.warning("사원이름 또는 이메일을 입력해주세요.");

            return;
        }

        try{
            setSearchLoading(true);

            const response = await apiClient.get(
                "search/emp",
                {params : {keyword : searchKeyword}}
            );

            const data = response.data;

            //응답이 배열인 경우
            if(Array.isArray(data)){
                setEmpList(data);
            }

            //pageVO 또는 list 형태인 경우
            else if(Array.isArray(data?.list)){
                setEmpList(data.list);
            }

            else{
                setEmpList([]);
            }
        }

        catch(e){
            toast.error("사원 검색에 실패했습니다.");

        }
        
        finally{
            setSearchLoading(false);
        }

    },[keyword]);

    //엔터 검색
    const submitSearch = useCallback((e)=>{
        e.preventDefault();

        searchEmp();
    },[searchEmp])

    //사원 선택
    const selectEmp = useCallback((emp)=>{
        setSelectedEmpList((prev)=>{
            
            const alreadySelected = prev.some(
                (item) => item.empNo === emp.empNo
            );

            if(alreadySelected){
                return prev.filter(
                    (item)=> item.empNo !== emp.empNo
                );
            }

            return [...prev,emp];
        });
    },[]);

    //프로젝트 초대
    const sendInvite = useCallback(async()=>{
        if(selectedEmpList.length === 0){
            toast.warning("초대할 사원을 선택해주세요");
            return;
        }

        try{
            setInviteLoading(true);

            let successCount = 0;
            let failCount = 0;

            for(const emp of selectedEmpList){
                try{
                    await apiClient.post(
                        `/project/${projectNo}/invite/${emp.empNo}`
                    );

                    successCount ++;
                }
                catch(e){
                    failCount ++;
                }
            }

            if(successCount > 0){
                toast.success(`${successCount}명에게 초대를 보냈습니다.`);
            }

            if(failCount > 0){
                toast.warning(`${failCount}명은 초대하지 못했습니다.`);
            }

            setKeyword("");
            setEmpList([]);
            setSelectedEmpList([]);

            onHide();
        }
        finally{
            setInviteLoading(false);
        }
        
    },[projectNo,selectedEmpList,onHide]);

    //모달 닫기
    const closeModal = useCallback(()=>{
        if(
            searchLoading || inviteLoading
        ){
            return;
        }

        setKeyword("");
        setEmpList([]);
        setSelectedEmpList([]);


        onHide();
    },[searchLoading,inviteLoading,onHide]);

    return(
        <Modal show={show}
                onHide={closeModal}
                centered
        >
            <Modal.Header closeButton
                            className="project-modal-header">
                <Modal.Title>
                    프로젝트 멤버 초대
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="project-modal-body">
                {/* 검색 */}
                <Form
                    onSubmit={submitSearch}
                    className="project-invite-search"
                >
                    <Form.Control
                        type="text"
                        value={keyword}
                        onChange={changeKeyword}
                        placeholder="사원 이름 또는 이메일 검색"
                        disabled={searchLoading}
                    />

                    <Button type="submit"
                            className="project-primary-button"
                            disabled={
                                searchLoading || keyword.trim().length === 0
                            }
                    >
                        {
                            searchLoading ? 
                            <Spinner size="sm"/>
                            : "검색"
                        }
                    </Button>

                </Form>

                {/* 검색 결과 */}
                <div className="project-invite-result">
                    {
                        empList.length === 0
                        ?
                        (
                            <div className="project-invite-empty">
                                검색된 사원이 없습니다.
                            </div>
                        )
                        :
                        (
                            empList.map((emp)=>{

                                const selected = selectedEmpList.some(
                                    (item)=>item.empNo === emp.empNo
                                );

                                return (
                                    <div key={emp.empNo}
                                        className={
                                            `project-invite-emp
                                            ${selected ? "selected" : ""}`
                                        }
                                        onClick={()=>
                                            selectEmp(emp)
                                        }
                                    >
                                        <div className="project-invite-emp-info">
                                            <div className="project-invite-emp-name">
                                                {emp.empName}
                                                
                                                {selected &&(
                                                    <span className="project-invite-check">
                                                        ✓
                                                    </span>
                                                )}
                                            </div>

                                            <div className="project-invite-emp-email">
                                                {emp.empEmail}
                                            </div>
                                        </div>

                                    </div>
                                )
                            })
                        )
                    }
                </div>

                {/* 선택된 사원 */}
                {selectedEmpList.length > 0 &&(
                    <div className="project-invite-selected">
                        <div className="project-invite-selected-title">
                            초대 대상 
                            <strong>{selectedEmpList.length}명</strong>
                        </div>

                        <div className="project-invite-selected-list">

                            {selectedEmpList.map((emp)=>(
                                <div key={emp.empNo}
                                    className="project-invite-selected-item"
                                    onClick={()=>selectEmp(emp)}
                                >
                                    <div>
                                        <div className="project-invite-selected-name">
                                            {emp.empName}
                                        </div>
                                        <div className="project-invite-selected-email">
                                            {emp.empEmail}
                                        </div>

                                    </div>

                                    <span className="project-invite-remove">
                                        x
                                    </span>
                                </div>
                            ))}

                        </div>

                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className="project-modal-footer">
                <Button className="project-cancel-button"
                        onClick={closeModal} disabled={inviteLoading}
                >
                    취소
                </Button>

                <Button className="project-primary-button"
                        onClick={sendInvite}
                        disabled={
                            selectedEmpList.length === 0 || inviteLoading
                        }
                >
                    {
                        inviteLoading ? 
                        <>
                            <Spinner size="sm" className="me-2"/>
                            초대중
                        </>
                        : "초대"
                    }
                </Button>
            </Modal.Footer>
        </Modal>
    )
}