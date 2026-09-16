import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiSearch, FiUsers } from "react-icons/fi";
import { apiClient } from "@utils/reaxios";
import { useWebSocket } from "../../../websocket/WebSocketProvider";
import NoImage from "@assets/noimages.png";
import "./Department.css";
import Modal from "react-bootstrap/Modal";


export default function DepartmentDetail() {

    const { deptNo } = useParams();

    const navigate = useNavigate();


    //부서 정보
    const [department, setDepartment] =
        useState(null);

    //부서 구성원
    const [memberList, setMemberList] =
        useState([]);

    //로딩
    const [loading, setLoading] =
        useState(true);


    //Presence 공통 상태
    const {
        presenceMap = {},
        presenceReady = false
    } = useWebSocket() || {};

    //구성원 검색어
    const [keyword, setKeyword] = useState("");

    //선택한 구성원
    const [selectedMember, setSelectedMember] = useState(null);


    //부서 상세 조회
    const loadDepartment = useCallback(async () => {

        try {

            const { data } =
                await apiClient.get(
                    `/organization/departments/${deptNo}`
                );

            setDepartment(data);

        }
        catch (e) {

            console.error(
                "부서 상세 조회 실패 : ",
                e
            );

            setDepartment(null);

        }

    }, [deptNo]);


    //부서 구성원 조회
    const loadMemberList = useCallback(async () => {

        try {

            const { data } =
                await apiClient.get(
                    `/organization/departments/${deptNo}/members`
                );

            setMemberList(
                data || []
            );

        }
        catch (e) {

            console.error(
                "부서 구성원 조회 실패 : ",
                e
            );

            setMemberList([]);

        }
        finally {

            setLoading(false);

        }

    }, [deptNo]);


    //부서 정보는 바로 조회
    useEffect(() => {

        loadDepartment();

    }, [loadDepartment]);


    //Presence 연결이 준비된 뒤 구성원 조회
    useEffect(() => {

        if (!presenceReady) return;

        loadMemberList();

    }, [
        presenceReady,
        loadMemberList
    ]);


    //실시간 Presence 우선 적용
    const getPresence = useCallback((member) => {

        return (
            presenceMap[member.empNo]
            || member.empPresence
            || "OFFLINE"
        );

    }, [presenceMap]);


    //Presence 한글
    const getPresenceName = useCallback((presence) => {

        switch (presence) {

            case "ONLINE":
                return "온라인";

            case "AWAY":
                return "자리비움";

            default:
                return "오프라인";

        }

    }, []);

    //구성원 검색
    const filteredMemberList = useMemo(() => {
        const value = keyword.trim().toLowerCase();

        if (value.length === 0) return memberList;

        return memberList.filter(member => {
            const name = member.empName?.toLowerCase() || "";

            const email = member.empEmail?.toLowerCase() || "";

            const position = member.positionName?.toLowerCase() || "";

            return (
                name.includes(value)
                || email.includes(value)
                || position.includes(value)
            );
        });
    }, [memberList, keyword]);


    return (
        <div className="department-page">

            {/* 뒤로가기 */}
            <button
                type="button"
                className="department-back-button"
                onClick={() =>
                    navigate(
                        "/organization/departments"
                    )
                }
            >
                <FiArrowLeft />

                <span>
                    부서 목록
                </span>
            </button>


            {/* 부서 정보 */}
            {department && (

                <div className="department-detail-header">

                    <div>

                        <div className="department-detail-title-row">

                            <div className="department-detail-symbol">
                                {department.deptName
                                    ?.charAt(0)
                                    || "부"}
                            </div>


                            <div>

                                <h2 className="department-detail-title">
                                    {department.deptName}
                                </h2>


                                <div className="department-detail-description">

                                    {department.deptInfo
                                        || "등록된 부서 설명이 없습니다."
                                    }

                                </div>

                            </div>

                        </div>

                    </div>


                    <div className="department-detail-count">

                        <FiUsers />

                        <span>
                            {department.memberCount}명
                        </span>

                    </div>

                </div>

            )}


            {/* 구성원 */}
            <div className="department-member-section">

                <div className="department-member-header">

                    <div>

                        <div className="department-member-title">
                            구성원
                        </div>

                        <div className="department-member-description">
                            현재 부서에 소속된 구성원입니다.
                        </div>

                    </div>


                    <div className="department-member-total">

                        {keyword.trim().length > 0
                            ? `${filteredMemberList.length} / ${memberList.length}명`
                            : `${memberList.length}명`
                        }

                    </div>

                </div>

                <div className="department-member-toolbar">

                    <div className="department-member-search">

                        <FiSearch />

                        <input
                            type="text"
                            value={keyword}
                            placeholder="이름, 이메일 또는 직급으로 검색"
                            onChange={e =>
                                setKeyword(
                                    e.target.value
                                )
                            }
                        />

                    </div>

                </div>

                <div className="department-member-list-wrapper">

                    <table className="department-member-table">

                        <thead>
                            <tr>
                                <th className="department-col-member">
                                    구성원
                                </th>

                                <th className="department-col-position">
                                    직급
                                </th>

                                <th className="department-col-email">
                                    이메일
                                </th>

                                <th className="department-col-contact">
                                    연락처
                                </th>

                                <th className="department-col-status">
                                    상태
                                </th>
                            </tr>
                        </thead>


                        <tbody>

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan="5"
                                        className="department-member-empty"
                                    >
                                        구성원 정보를 불러오는 중입니다.
                                    </td>

                                </tr>

                            ) : filteredMemberList.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="5"
                                        className="department-member-empty"
                                    >
                                        {keyword.trim().length > 0
                                            ? "검색 조건에 맞는 구성원이 없습니다."
                                            : "소속 구성원이 없습니다."
                                        }
                                    </td>

                                </tr>

                            ) : (

                                filteredMemberList.map(member => {

                                    const presence =
                                        getPresence(member);


                                    return (

                                        <tr
                                            key={member.empNo}
                                            className="department-member-row"
                                            onClick={() =>
                                                setSelectedMember(member)
                                            }
                                        >

                                            {/* 구성원 */}
                                            <td className="department-col-member">

                                                <div className="department-member-user">

                                                    <div className="department-member-profile">

                                                        <img
                                                            src={
                                                                member.attachNo
                                                                    ? `${import.meta.env.VITE_SERVER_URL}/api/attach/${member.attachNo}`
                                                                    : NoImage
                                                            }
                                                            alt=""
                                                        />

                                                        <span
                                                            className={
                                                                `department-presence-dot ${presence.toLowerCase()
                                                                }`
                                                            }
                                                        />

                                                    </div>


                                                    <div className="department-member-name-area">

                                                        <div className="department-member-name">
                                                            {member.empName}
                                                        </div>

                                                        {member.empLevel === "admin" && (
                                                            <span className="department-admin-badge">
                                                                관리자
                                                            </span>
                                                        )}

                                                    </div>

                                                </div>

                                            </td>


                                            {/* 직급 */}
                                            <td className="department-col-position">
                                                {member.positionName || "-"}
                                            </td>


                                            {/* 이메일 */}
                                            <td className="department-col-email">
                                                {member.empEmail || "-"}
                                            </td>


                                            {/* 연락처 */}
                                            <td className="department-col-contact">
                                                {member.empContact || "-"}
                                            </td>


                                            {/* 상태 */}
                                            <td className="department-col-status">

                                                <div className="department-member-status">

                                                    <span
                                                        className={
                                                            `department-status-dot ${presence.toLowerCase()
                                                            }`
                                                        }
                                                    />

                                                    <span>
                                                        {getPresenceName(presence)}
                                                    </span>

                                                </div>

                                            </td>


                                            {/* 직급 */}
                                            <td>
                                                {member.positionName || "-"}
                                            </td>


                                            {/* 이메일 */}
                                            <td className="department-member-email">
                                                {member.empEmail || "-"}
                                            </td>


                                            {/* 연락처 */}
                                            <td>
                                                {member.empContact || "-"}
                                            </td>


                                            {/* Presence */}
                                            <td>

                                                <div className="department-member-status">

                                                    <span
                                                        className={
                                                            `department-status-dot ${presence.toLowerCase()
                                                            }`
                                                        }
                                                    />

                                                    <span>
                                                        {getPresenceName(
                                                            presence
                                                        )}
                                                    </span>

                                                </div>

                                            </td>

                                        </tr>

                                    );

                                })

                            )}

                        </tbody>

                    </table>

                </div>

            </div>

            {/* 구성원 프로필 */}
            <Modal
                show={selectedMember !== null}
                onHide={() =>
                    setSelectedMember(null)
                }
                centered
                size="sm"
                className="department-profile-modal"
            >
                {selectedMember && (() => {

                    const presence =
                        getPresence(selectedMember);

                    return (
                        <>
                            <Modal.Body>

                                <div className="department-profile-popup">

                                    {/* 프로필 상단 */}
                                    <div className="department-profile-popup-header">

                                        <div className="department-profile-popup-image">

                                            <img
                                                src={
                                                    selectedMember.attachNo
                                                        ? `${import.meta.env.VITE_SERVER_URL}/api/attach/${selectedMember.attachNo}`
                                                        : NoImage
                                                }
                                                alt=""
                                            />

                                            <span
                                                className={
                                                    `department-profile-popup-presence ${presence.toLowerCase()
                                                    }`
                                                }
                                            />

                                        </div>


                                        <div className="department-profile-popup-main">

                                            <div className="department-profile-popup-name-row">

                                                <div className="department-profile-popup-name">
                                                    {selectedMember.empName}
                                                </div>


                                                {selectedMember.empLevel === "admin" && (
                                                    <span className="department-admin-badge">
                                                        관리자
                                                    </span>
                                                )}

                                            </div>


                                            <div className="department-profile-popup-position">
                                                {department?.deptName}
                                                {" · "}
                                                {selectedMember.positionName || "-"}
                                            </div>


                                            <div className="department-profile-popup-status">

                                                <span
                                                    className={
                                                        `department-status-dot ${presence.toLowerCase()
                                                        }`
                                                    }
                                                />

                                                {getPresenceName(presence)}

                                            </div>

                                        </div>

                                    </div>


                                    {/* 상세 정보 */}
                                    <div className="department-profile-popup-info">

                                        <div className="department-profile-info-item">

                                            <div className="department-profile-info-label">
                                                이메일
                                            </div>

                                            <div className="department-profile-info-value">
                                                {selectedMember.empEmail || "-"}
                                            </div>

                                        </div>


                                        <div className="department-profile-info-item">

                                            <div className="department-profile-info-label">
                                                연락처
                                            </div>

                                            <div className="department-profile-info-value">
                                                {selectedMember.empContact || "-"}
                                            </div>

                                        </div>


                                        <div className="department-profile-info-item">

                                            <div className="department-profile-info-label">
                                                부서
                                            </div>

                                            <div className="department-profile-info-value">
                                                {department?.deptName || "-"}
                                            </div>

                                        </div>


                                        <div className="department-profile-info-item">

                                            <div className="department-profile-info-label">
                                                직급
                                            </div>

                                            <div className="department-profile-info-value">
                                                {selectedMember.positionName || "-"}
                                            </div>

                                        </div>

                                    </div>


                                    {/*
                                        DM 구현 후 이 위치에 추가

                                        <button
                                            type="button"
                                            className="department-profile-message-button"
                                        >
                                            메시지 보내기
                                        </button>
                                    */}

                                </div>

                            </Modal.Body>
                        </>
                    );

                })()}
            </Modal>

        </div>
    );
}