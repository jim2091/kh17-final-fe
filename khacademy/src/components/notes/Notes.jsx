import { Button, Form } from "react-bootstrap";

import "./Notes.css";
import { useOutletContext, useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { apiClient } from "../../utils/reaxios";
import dayjs from "dayjs";

export default function Notes() {

    const {projectNo} =useParams();
    const {project, loadProject} = useOutletContext();

    const [noteList, setNoteList] = useState([]);
    const [last, setLast] = useState(false);
    const [size, setSize] = useState(10);
    const [loading, setLoading] = useState(false);

    const [searchInput, setSearchInput] = useState({
        type: "all",
        keyword: ""
    });

    const [search, setSearch] = useState({
        type: "all",
        keyword: ""
    });

    //초기 목록 로딩
    useEffect(()=>{
        loadNoteList(true);
    }, []);

    const loadNoteList = useCallback(async(
        //gpt가 알려준 더보기와 새 검색 한꺼번에 처리하는 형태
        reset = false,
        searchCondition = search
    ) => {
        try{
            if(loading === true) return;
            setLoading(true);

            const lastNoteNo = 
                reset === true || noteList.length === 0
                    ? null : noteList[noteList.length - 1].noteNo;

            const {data} = await apiClient.post(
                `/note/project/${projectNo}/list`,
                {
                    lastNo : lastNoteNo,
                    size : size,
                    type: searchCondition.type,
                    keyword: searchCondition.keyword
                }
            );

            //새 검색이면 기존 목록 '교체'
            if(reset === true){
                setNoteList(data.noteList);
            }
            //더보기면 기존 목록 뒤에 '추가'
            else {
                setNoteList(prev=>([...prev, ...data.noteList]));
            }
            setLast(data.last);
        }
        catch(e){
            console.error(e);
            toast.error("목록을 불러오지 못했습니다");
        }
        finally{
            setLoading(false);
        }
    }, [size, search, noteList]);

    //검색버튼 누르면 searchInput의 사용자가 입력한 조건을 search로 넘기고
    //검색 정보와 함께 로드
    const searchNote = useCallback(()=>{
        const condition = {
            type: searchInput.type,
            keyword: searchInput.keyword.trim()
        };

        setSearch(condition);
        setLast(false);

        loadNoteList(true, condition);
    }, [searchInput, loadNoteList]);

    const formatNoteDate = useCallback((value)=>{
        if(!value) return "";

        return dayjs(value).format("YYYY.MM.DD HH:mm");
    }, []);

    return (
        <div className="notes-page">

            {/* 상단 */}
            <div className="notes-header">

                <div>
                    <div className="notes-title">
                        노트
                    </div>

                    <div className="notes-description">
                        프로젝트에서 공유하는 업무 기록과 메모를 확인합니다.
                    </div>
                </div>

                <Button className="notes-add-button">
                    + 노트 작성
                </Button>

            </div>


            {/* 검색 */}
            <div className="notes-search">

                <Form.Select
                    className="notes-search-type"
                    value={searchInput.type}
                    //이거 따로 만들어봐야 여기밖에 못쓰니 바로 씀
                    onChange={(e)=>{
                        setSearchInput(prev=>({
                            ...prev,
                            type: e.target.value
                        }));
                    }}
                >
                    <option value="all">제목 + 내용</option>
                    <option value="title">제목</option>
                    <option value="content">내용</option>
                </Form.Select>

                <Form.Control
                    type="text"
                    className="notes-search-input"
                    value={searchInput.keyword}
                    onChange={(e)=>{
                        setSearchInput(prev=>({
                            ...prev,
                            keyword: e.target.value
                        }));
                    }}
                    placeholder="검색어를 입력하세요"
                />

                <Button
                    variant="outline-secondary"
                    className="notes-search-button"
                    onClick={searchNote}
                >
                    검색
                </Button>

            </div>


            {/* 노트 목록 */}
            <div className="notes-card">

                <div className="notes-list-header">

                    <div className="notes-list-title">
                        노트 목록
                    </div>

                </div>


                <div className="notes-list">

                    {noteList.map(note=>(
                        <div className="notes-item" key={note.noteNo}>
                            <div className="notes-item-top">
                                <div className="notes-item-title">
                                    {note.noteTitle}
                                </div>
                                
                                <div className="notes-item-date">
                                    {note.noteUtime && "수정 "}
                                    {formatNoteDate(
                                        note.noteUtime ? note.noteUtime : note.noteCtime
                                    )}
                                </div>
                            </div>

                            <div className="notes-item-preview">
                                {note.noteContent}이걸 어캐 조금만 보여줄까
                            </div>
                        </div>
                    ))}
                </div>

                {/* 더 보기 */}
                {last === false && (
                    <div className="notes-more">

                        <Button
                            variant="outline-secondary"
                            //아래 처럼 쓰면 실제로 React는 loadNoteList(event);라고 전달함
                            //onClick={loadNoteList}
                            //때문에 파라미터 넣는 콜백 쓸때는 원치않는게 그자리에 들어가는 문제가
                            //생기지 않기 위해 아래처럼 쓰는게 안전함
                            onClick={()=>loadNoteList()}
                            disabled={loading}    
                        >
                            더 보기
                        </Button>

                    </div>
                )}

            </div>

        </div>
    );
}