import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import { useNavigate } from "react-router-dom";

import {
    FiSearch,
    FiUsers,
    FiArrowRight
} from "react-icons/fi";

import { apiClient } from "@utils/reaxios";

import "./Department.css";


export default function DepartmentList() {

    const navigate = useNavigate();


    //부서 목록
    const [deptList, setDeptList] = useState([]);

    //검색어
    const [keyword, setKeyword] = useState("");

    //로딩
    const [loading, setLoading] = useState(true);


    //부서 목록 조회
    const loadDeptList = useCallback(async () => {

        try {
            setLoading(true);

            const {data} =
                await apiClient.get(
                    "/organization/departments"
                );

            setDeptList(data || []);
        }
        catch(e) {
            console.error(
                "부서 목록 조회 실패 : ",
                e
            );
        }
        finally {
            setLoading(false);
        }

    }, []);


    useEffect(() => {

        loadDeptList();

    }, [loadDeptList]);


    //검색 결과
    const filteredDeptList = useMemo(() => {

        const value =
            keyword
                .trim()
                .toLowerCase();


        if(value.length === 0) {
            return deptList;
        }


        return deptList.filter(dept => {

            const deptName =
                dept.deptName
                    ?.toLowerCase()
                    || "";

            const deptInfo =
                dept.deptInfo
                    ?.toLowerCase()
                    || "";


            return (
                deptName.includes(value)
                || deptInfo.includes(value)
            );

        });

    }, [
        deptList,
        keyword
    ]);


    return (
        <div className="organization-department-page">

            {/* 상단 */}
            <div className="organization-department-page-header">

                <div>
                    <h2 className="organization-department-page-title">
                        부서
                    </h2>

                    <div className="organization-department-page-description">
                        회사 내 부서와 구성원을 확인할 수 있습니다.
                    </div>
                </div>


                <div className="organization-department-page-count">
                    총 {deptList.length}개 부서
                </div>

            </div>


            {/* 검색 */}
            <div className="organization-department-toolbar">

                <div className="organization-department-search">

                    <FiSearch />

                    <input
                        type="text"
                        value={keyword}
                        placeholder="부서명 또는 설명으로 검색"
                        onChange={e =>
                            setKeyword(
                                e.target.value
                            )
                        }
                    />

                </div>

            </div>


            {/* 목록 */}
            {loading ? (

                <div className="organization-department-empty">
                    부서 정보를 불러오는 중입니다.
                </div>

            ) : filteredDeptList.length === 0 ? (

                <div className="organization-department-empty">

                    {keyword.trim().length > 0
                        ? "검색 조건에 맞는 부서가 없습니다."
                        : "등록된 부서가 없습니다."
                    }

                </div>

            ) : (

                <div className="organization-department-grid">

                    {filteredDeptList.map(dept => (

                        <div
                            key={dept.deptNo}
                            className="organization-department-card"
                        >

                            <div className="organization-department-card-top">

                                <div className="organization-department-symbol">
                                    {dept.deptName
                                        ?.charAt(0)
                                        || "부"}
                                </div>


                                <div className="organization-department-member-count">

                                    <FiUsers />

                                    <span>
                                        {dept.memberCount}명
                                    </span>

                                </div>

                            </div>


                            <div className="organization-department-card-body">

                                <div className="organization-department-name">
                                    {dept.deptName}
                                </div>


                                <div className="organization-department-info">

                                    {dept.deptInfo
                                        || "등록된 부서 설명이 없습니다."
                                    }

                                </div>

                            </div>


                            <button
                                type="button"
                                className="organization-department-detail-button"
                                onClick={() =>
                                    navigate(
                                        `/organization/departments/${dept.deptNo}`
                                    )
                                }
                            >
                                <span>
                                    구성원 보기
                                </span>

                                <FiArrowRight />
                            </button>

                        </div>

                    ))}

                </div>

            )}

        </div>
    );
}